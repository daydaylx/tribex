/**
 * AudioEngineV2.ts - Optimierte Audio-Engine für TribeX
 * Teil des Core-Systems gemäß Roadmap
 * Speziell optimiert für Sampler- und Synthesizer-Anforderungen
 */

import { clamp } from '../../utils/index';
import { SampleEngine } from '../sampler/SampleEngine';
import { SynthEngine } from '../synthesizer/SynthEngine';
import { EffectProcessor } from '../effects/EffectProcessor';
import { Mixer } from '../mixer/Mixer';
import { MotionEngine } from '../motion/MotionEngine';
import { ProjectState, Part } from '../../types';

// Audio-Worklet-Module für präzises Timing
const CLOCK_WORKLET_CODE = `
  class ClockProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [
        { name: 'bpm', defaultValue: 120, minValue: 60, maxValue: 240 },
        { name: 'running', defaultValue: 0, minValue: 0, maxValue: 1 },
        { name: 'lookahead', defaultValue: 0.025, minValue: 0.01, maxValue: 0.1 }
      ];
    }

    constructor() {
      super();
      this.nextStepTime = 0;
      this.stepInterval = 0.5; // Viertelnote bei 120 BPM
      this.currentStep = 0;
      this.lastUpdate = this.currentTime;
    }

    process(inputs, outputs, parameters) {
      const bpm = parameters.bpm ? parameters.bpm[0] : 120;
      const isRunning = parameters.running ? parameters.running[0] >= 0.5 : false;
      const lookahead = parameters.lookahead ? parameters.lookahead[0] : 0.025;
      
      // Berechne Step-Intervall (4 Steps pro Viertelnote)
      this.stepInterval = (60 / bpm) / 4;
      
      if (isRunning && currentTime >= this.nextStepTime - lookahead) {
        this.port.postMessage({
          type: 'tick',
          step: this.currentStep,
          time: this.nextStepTime,
          bpm: bpm
        });
        
        this.nextStepTime += this.stepInterval;
        this.currentStep = (this.currentStep + 1) % 16; // 16 Steps in Standard-Pattern
      }
      
      return true;
    }
  }
  
  registerProcessor('tribex-clock', ClockProcessor);
`;

export interface AudioEngineConfig {
  sampleRate?: number;
  bufferSize?: number;
  lookahead?: number;
  queueTime?: number;
  enableWorklets?: boolean;
}

export interface TimingEvent {
  step: number;
  time: number;
  bpm: number;
}

export class AudioEngineV2 {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private config: AudioEngineConfig;
  private isInitialized: boolean = false;
  
  // Module
  public sampleEngine: SampleEngine;
  public synthEngine: SynthEngine;
  public effectProcessor: EffectProcessor;
  public mixer: Mixer;
  public motionEngine: MotionEngine;
  
  // Timing-System
  private clockNode: AudioWorkletNode | null = null;
  private timingCallbacks: ((event: TimingEvent) => void)[] = [];
  private clockWorkletUrl: string | null = null;
  
  // Zustand
  private isRunning: boolean = false;
  private bpm: number = 120;
  private swing: number = 0;
  private currentStep: number = 0;
  private lookAheadTime: number = 0.1; // 100ms Lookahead für präzise Timing
  
  // Performance-Optimierungen
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private gainNodePool: GainNode[] = [];
  private pannerNodePool: StereoPannerNode[] = [];
  private filterNodePool: BiquadFilterNode[] = [];
  private voiceChannelPool: Map<string, any> = new Map(); // Wiederverwendbare Voice-Channels
  
  constructor(config: AudioEngineConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate || 44100,
      bufferSize: config.bufferSize || 1024,
      lookahead: config.lookahead || 0.025, // 25ms
      queueTime: config.queueTime || 0.1,   // 100ms
      enableWorklets: config.enableWorklets ?? true
    };
    
    // Initialisiere Web Audio Context
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContext({
      sampleRate: this.config.sampleRate,
      latencyHint: 'playback'
    });
    
    // Master-Knoten erstellen
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    
    // Module initialisieren
    this.mixer = new Mixer(this.audioContext);
    this.sampleEngine = new SampleEngine(this.audioContext, this.mixer);
    this.synthEngine = new SynthEngine(this.audioContext, this.mixer);
    this.effectProcessor = new EffectProcessor(this.audioContext, this.mixer);
    this.motionEngine = new MotionEngine();
  }
  
  async initialize(): Promise<void> {
    // Starte Audio Context (erforderlich für moderne Browser)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Initialisiere Audio Worklet, falls aktiviert
    if (this.config.enableWorklets && this.audioContext.audioWorklet) {
      try {
        // Erstelle eine temporäre Worklet-Datei oder registriere Inline-Code
        const blob = new Blob([CLOCK_WORKLET_CODE], { type: 'application/javascript' });
        this.clockWorkletUrl = URL.createObjectURL(blob);
        
        await this.audioContext.audioWorklet.addModule(this.clockWorkletUrl);
        
        this.clockNode = new AudioWorkletNode(this.audioContext, 'tribex-clock', {
          outputChannelCount: [1],
          parameterData: {
            bpm: this.bpm,
            running: 0,
            lookahead: this.config.lookahead
          }
        });
        
        this.clockNode.port.onmessage = (event) => {
          if (event.data.type === 'tick') {
            this.currentStep = event.data.step;
            this.handleTimingEvent(event.data);
          }
        };
        
        this.clockNode.connect(this.audioContext.destination);
      } catch (error) {
        console.warn('Audio Worklet konnte nicht initialisiert werden, verwende Fallback:', error);
        // Fallback-Implementierung würde hier aktiviert
      }
    }
    
    this.isInitialized = true;
    console.log('Audio Engine V2 initialisiert');
  }
  
  private handleTimingEvent(event: TimingEvent): void {
    // Rufe alle registrierten Timing-Callbacks auf
    for (const callback of this.timingCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Fehler in Timing-Callback:', error);
      }
    }
  }
  
  /**
   * Registriert einen Callback für Timing-Ereignisse
   */
  onTimingEvent(callback: (event: TimingEvent) => void): void {
    this.timingCallbacks.push(callback);
  }
  
  /**
   * Entfernt einen Timing-Callback
   */
  offTimingEvent(callback: (event: TimingEvent) => void): void {
    const index = this.timingCallbacks.indexOf(callback);
    if (index !== -1) {
      this.timingCallbacks.splice(index, 1);
    }
  }
  
  /**
   * Lädt ein Projekt und initialisiert alle Module entsprechend
   */
  async loadProject(project: ProjectState): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Setze Projektwerte
    this.setBpm(project.bpm);
    this.setSwing(project.swing);
    
    // Initialisiere alle Module mit Projektdaten
    await Promise.all([
      this.sampleEngine.loadProject(project),
      this.synthEngine.loadProject(project),
      this.effectProcessor.loadProject(project)
    ]);
    
    console.log('Audio Engine V2: Projekt geladen');
  }
  
  /**
   * Startet die Audio-Engine
   */
  start(): void {
    if (!this.isInitialized) {
      console.error('Audio Engine V2 nicht initialisiert');
      return;
    }
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    this.isRunning = true;
    
    // Starte den Clock-Node, falls verfügbar
    if (this.clockNode) {
      const runningParam = this.clockNode.parameters.get('running');
      if (runningParam) {
        runningParam.setValueAtTime(1, this.audioContext.currentTime);
      }
    }
    
    console.log('Audio Engine V2 gestartet');
  }
  
  /**
   * Stoppt die Audio-Engine
   */
  stop(): void {
    this.isRunning = false;
    
    // Stoppe den Clock-Node, falls verfügbar
    if (this.clockNode) {
      const runningParam = this.clockNode.parameters.get('running');
      if (runningParam) {
        runningParam.setValueAtTime(0, this.audioContext.currentTime);
      }
    }
    
    console.log('Audio Engine V2 gestoppt');
  }
  
  /**
   * Setzt die BPM und aktualisiert alle zeitabhängigen Parameter
   */
  setBpm(bpm: number): void {
    this.bpm = clamp(bpm, 60, 240);
    
    // Aktualisiere den Clock-Node Parameter
    if (this.clockNode) {
      const bpmParam = this.clockNode.parameters.get('bpm');
      if (bpmParam) {
        bpmParam.setValueAtTime(this.bpm, this.audioContext.currentTime);
      }
    }
    
    console.log(`BPM auf ${this.bpm} gesetzt`);
  }
  
  setSwing(swing: number): void {
    this.swing = clamp(swing, 0, 100);
    console.log(`Swing auf ${this.swing}% gesetzt`);
  }
  
  getBpm(): number {
    return this.bpm;
  }
  
  getSwing(): number {
    return this.swing;
  }
  
  getCurrentStep(): number {
    return this.currentStep;
  }
  
  /**
   * Spiel ein Sample oder Synthesizer-Ton ab
   * Optimiert für gleichzeitige Sampler- und Synthesizer-Verwendung
   */
  playPart(part: Part, time: number, velocity: number = 1.0, noteNumber?: number): void {
    if (part.type === 'sample') {
      this.sampleEngine.play(part, time, velocity);
    } else if (part.type === 'synth' && noteNumber !== undefined) {
      this.synthEngine.playNote(part, noteNumber, time, velocity);
    }
  }
  
  /**
   * Gibt die aktuelle Anzahl aktiver Audio-Quellen zurück
   */
  getActiveSourceCount(): number {
    return this.activeSources.size;
  }
  
  /**
   * Gibt eine Audio-Quelle nach der Wiedergabe frei
   */
  releaseSource(source: AudioBufferSourceNode): void {
    this.activeSources.delete(source);
    // In einer vollständigen Implementierung würden wir die Quelle in einen Pool geben
  }
  
  /**
   * Gibt eine Gain-Node frei oder fügt sie dem Pool hinzu
   */
  releaseGainNode(gainNode: GainNode): void {
    // In einer vollständigen Implementierung würden wir die Node im Pool speichern
    // Für Wiederverwendung
  }
  
  /**
   * Gibt eine Panner-Node frei oder fügt sie dem Pool hinzu
   */
  releasePannerNode(pannerNode: StereoPannerNode): void {
    // In einer vollständigen Implementierung würden wir die Node im Pool speichern
    // Für Wiederverwendung
  }
  
  /**
   * Gibt eine Filter-Node frei oder fügt sie dem Pool hinzu
   */
  releaseFilterNode(filterNode: BiquadFilterNode): void {
    // In einer vollständigen Implementierung würden wir die Node im Pool speichern
    // Für Wiederverwendung
  }
  
  /**
   * Gibt Ressourcen frei und stoppt alle aktiven Quellen
   */
  async destroy(): Promise<void> {
    this.stop();
    
    // Stoppe alle aktiven Quellen
    for (const source of this.activeSources) {
      try {
        if (source.playbackState !== 3) { // 3 = finished
          source.stop();
        }
      } catch (e) {
        // Quelle war möglicherweise bereits gestoppt
      }
    }
    
    this.activeSources.clear();
    
    // Zerstöre Module
    await Promise.all([
      this.sampleEngine.destroy(),
      this.synthEngine.destroy(),
      this.effectProcessor.destroy(),
      this.mixer.destroy(),
      // MotionEngine benötigt keine asynchrone Zerstörung
    ]);
    
    // Trenne Master-Verbindungen
    this.masterGain.disconnect();
    
    // Schließe Audio-Context
    if (this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    
    // Bereinige Worklet-URL, falls vorhanden
    if (this.clockWorkletUrl) {
      URL.revokeObjectURL(this.clockWorkletUrl);
    }
    
    console.log('Audio Engine V2 zerstört');
  }
  
  /**
   * Gibt Zugriff auf den Audio-Context für externe Nutzung
   */
  get context(): AudioContext {
    return this.audioContext;
  }
  
  get destination(): AudioNode {
    return this.masterGain;
  }
  
  /**
   * Gibt den aktuellen Status der Engine zurück
   */
  getStatus(): {
    isInitialized: boolean;
    isRunning: boolean;
    bpm: number;
    swing: number;
    activeSources: number;
  } {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      bpm: this.bpm,
      swing: this.swing,
      activeSources: this.activeSources.size
    };
  }
}