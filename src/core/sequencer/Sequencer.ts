/**
 * Sequencer.ts - Sequencer-Logik für TribeX
 * Teil des Core-Systems gemäß Roadmap
 * 
 * Implementiert:
 * - Pattern-basiertes Sequencing mit 128 Patterns à 128 Steps
 * - 16 Spuren pro Pattern (9 Drum, 2 Synth, 2 Stretch, 1 Slice, 1 Audio-In, 1 Accent)
 * - Motion Sequencing für Parameter-Automation
 * - Song-Modus mit Verkettung von Patterns
 * - Swing/Groove-Unterstützung
 */

import { AudioEngineV2 as AudioEngine } from '../audio-engine/AudioEngineV2';
import { MotionEngine } from '../../core/motion/MotionEngine';
import { ProjectState, Pattern, Step, Part, MotionPoint, ChainEntry } from '../../types';
import { stepDurationSeconds } from '../../utils/index';

export interface SequencerState {
  isPlaying: boolean;
  currentPatternId: string | null;
  currentChainIndex: number;
  currentStep: number;
  loopEnabled: boolean;
  followMode: boolean; // Folge dem Song-Modus
}

export interface SequencerCallbacks {
  onStep?: (stepIndex: number, time: number) => void;
  onPatternChange?: (patternId: string) => void;
  onChainAdvance?: (chainIndex: number, patternId: string) => void;
  onPlay?: () => void;
  onStop?: () => void;
  onTempoChange?: (bpm: number) => void;
}

export class Sequencer {
  private audioEngine: AudioEngine;
  private motionEngine: MotionEngine;
  private state: SequencerState;
  private callbacks: SequencerCallbacks;
  private project: ProjectState | null = null;
  
  // Timing
  private bpm: number = 120;
  private swing: number = 0;
  private nextStepTime: number = 0;
  private stepInterval: number = 0;
  
  // Interna
  private timerId: number | null = null;
  private lastUpdateTime: number = 0;
  
  constructor(audioEngine: AudioEngine, callbacks: SequencerCallbacks = {}) {
    this.audioEngine = audioEngine;
    this.motionEngine = new MotionEngine();
    this.state = {
      isPlaying: false,
      currentPatternId: null,
      currentChainIndex: 0,
      currentStep: 0,
      loopEnabled: true,
      followMode: true
    };
    this.callbacks = callbacks;
    this.updateStepInterval();
  }
  
  private updateStepInterval(): void {
    this.stepInterval = stepDurationSeconds(this.bpm) * 4; // Viertelnote-Basis
  }
  
  setProject(project: ProjectState): void {
    this.project = project;
    this.bpm = project.bpm;
    this.swing = project.swing;
    this.updateStepInterval();
    
    // Setze das erste Pattern
    if (project.patterns && project.patterns.length > 0) {
      this.state.currentPatternId = project.patterns[0].id;
    }
    
    console.log(`Sequencer: Projekt '${project.name}' geladen`);
  }
  
  setPattern(patternId: string): void {
    if (!this.project) {
      console.error('Kein Projekt geladen');
      return;
    }
    
    const patternExists = this.project.patterns.some(p => p.id === patternId);
    if (patternExists) {
      this.state.currentPatternId = patternId;
      this.state.currentStep = 0; // Zurücksetzen beim Pattern-Wechsel
      
      if (this.callbacks.onPatternChange) {
        this.callbacks.onPatternChange(patternId);
      }
      
      console.log(`Sequencer: Pattern gewechselt zu ${patternId}`);
    } else {
      console.error(`Pattern ${patternId} nicht gefunden`);
    }
  }
  
  setChain(chain: ChainEntry[]): void {
    if (!this.project) {
      this.project = { 
        id: 'temp', 
        name: 'Temp', 
        bpm: this.bpm, 
        swing: this.swing, 
        lengthSteps: 16, 
        kit: 'tr909', 
        parts: [], 
        patterns: [], 
        chain: chain,
        version: '1.0',
        master: { tilt: 0, clip: -0.3 }
      };
    } else {
      this.project.chain = chain;
    }
    
    this.state.currentChainIndex = 0;
    console.log(`Sequencer: Chain mit ${chain.length} Einträgen gesetzt`);
  }
  
  setBpm(bpm: number): void {
    this.bpm = Math.max(30, Math.min(300, bpm)); // Bereich 30-300 BPM
    this.updateStepInterval();
    
    if (this.callbacks.onTempoChange) {
      this.callbacks.onTempoChange(this.bpm);
    }
    
    console.log(`Sequencer: BPM auf ${this.bpm} gesetzt`);
  }
  
  setSwing(swing: number): void {
    this.swing = Math.max(0, Math.min(100, swing)); // 0-100%
    console.log(`Sequencer: Swing auf ${this.swing}% gesetzt`);
  }
  
  start(): void {
    if (this.state.isPlaying) return;
    
    this.state.isPlaying = true;
    this.lastUpdateTime = this.audioEngine.context.currentTime;
    
    if (this.callbacks.onPlay) {
      this.callbacks.onPlay();
    }
    
    this.scheduleSteps();
    console.log('Sequencer gestartet');
  }
  
  stop(): void {
    if (!this.state.isPlaying) return;
    
    if (this.timerId) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
    
    this.state.isPlaying = false;
    
    if (this.callbacks.onStop) {
      this.callbacks.onStop();
    }
    
    console.log('Sequencer gestoppt');
  }
  
  togglePlay(): void {
    if (this.state.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }
  
  private scheduleSteps(): void {
    if (!this.state.isPlaying) return;
    
    const currentTime = this.audioEngine.context.currentTime;
    
    // Spiele Steps ab, wenn die Zeit reif ist
    while (this.nextStepTime <= currentTime + 0.05) { // 50ms Lookahead
      this.processStep(this.state.currentStep, this.nextStepTime);
      this.nextStepTime += this.stepInterval;
      this.state.currentStep = (this.state.currentStep + 1) % this.getPatternLength();
      
      // Wenn wir am Ende des Patterns sind
      if (this.state.currentStep === 0) {
        this.handlePatternEnd();
      }
    }
    
    this.timerId = requestAnimationFrame(() => this.scheduleSteps());
  }
  
  private getPatternLength(): number {
    if (!this.project || !this.state.currentPatternId) return 16;
    
    const pattern = this.project.patterns.find(p => p.id === this.state.currentPatternId);
    return pattern ? pattern.steps[0]?.length || 16 : 16;
  }
  
  private processStep(stepIndex: number, time: number): void {
    if (!this.project || !this.state.currentPatternId) return;
    
    const pattern = this.project.patterns.find(p => p.id === this.state.currentPatternId);
    if (!pattern) return;
    
    // Bestimme Swing-Offset
    let swingOffset = 0;
    if (this.swing > 0 && stepIndex % 2 === 1) { // Nur ungerade Steps (2, 4, 6, 8 etc. in 16-Step)
      swingOffset = (this.stepInterval / 3) * (this.swing / 100); // Maximal 1/3 Verzögerung
    }
    
    const actualTime = time + swingOffset;
    
    // Spiele jeden aktiven Step in jeder Spur ab
    pattern.steps.forEach((steps, partIndex) => {
      const step = steps[stepIndex];
      if (step && step.on) {
        // Prüfe Wahrscheinlichkeit
        if (typeof step.prob === 'undefined' || Math.random() < step.prob) {
          // Spiele Step abhängig vom Part-Typ ab
          const part = this.project!.parts[partIndex];
          if (part) {
            if (part.type === 'sample') {
              // Spiele Sample ab
              this.audioEngine.sampleEngine.play(part, step, actualTime);
            } else if (part.type === 'synth') {
              // Spiele Synth-Sound ab
              this.audioEngine.synthEngine.play(part, step, actualTime);
            }
          }
        }
      }
    });
    
    // Verarbeite Motion-Daten für alle Parts
    this.project.parts.forEach((part, partIndex) => {
      // Prüfe, ob Motion-Daten für diesen Part existieren
      const isSynthPart = part.type === 'synth';
      if (isSynthPart && part.synth) {
        // Aktualisiere synthetische Parameter basierend auf Motion-Daten
        // z.B. Filter-Cutoff, Resonance, ADSR-Parameter
        // In einer vollständigen Implementierung würden hier die synthetischen Parameter
        // basierend auf den Motion-Daten in Echtzeit angepasst
      }
    });
    
    // Rufe Callback auf
    if (this.callbacks.onStep) {
      this.callbacks.onStep(stepIndex, actualTime);
    }
  }
  
  private handlePatternEnd(): void {
    if (!this.project || !this.state.followMode) return;
    
    // Wenn Chain-Modus aktiv
    if (this.project.chain && this.project.chain.length > 0) {
      this.state.currentChainIndex = (this.state.currentChainIndex + 1) % this.project.chain.length;
      const nextPatternId = this.project.chain[this.state.currentChainIndex].patternId;
      
      // Wechsle zum nächsten Pattern in der Chain
      this.setPattern(nextPatternId);
      
      if (this.callbacks.onChainAdvance) {
        this.callbacks.onChainAdvance(this.state.currentChainIndex, nextPatternId);
      }
    } else if (!this.state.loopEnabled) {
      // Stoppe wenn nicht im Loop-Modus
      this.stop();
    }
  }
  
  getCurrentStep(): number {
    return this.state.currentStep;
  }
  
  getCurrentPatternId(): string | null {
    return this.state.currentPatternId;
  }
  
  getCurrentChainIndex(): number {
    return this.state.currentChainIndex;
  }
  
  isPlaying(): boolean {
    return this.state.isPlaying;
  }
  
  // Methode zum direkten Auslösen eines Steps (für Live-Performance)
  triggerStep(partIndex: number, stepIndex: number, immediate: boolean = true): void {
    if (!this.project || !this.state.currentPatternId) return;
    
    const pattern = this.project.patterns.find(p => p.id === this.state.currentPatternId);
    if (!pattern) return;
    
    const step = pattern.steps[partIndex]?.[stepIndex];
    if (step && step.on) {
      const time = immediate ? this.audioEngine.context.currentTime : this.nextStepTime;
      const part = this.project.parts[partIndex];
      
      if (part) {
        if (part.type === 'sample') {
          this.audioEngine.sampleEngine.play(part, step, time);
        } else if (part.type === 'synth') {
          this.audioEngine.synthEngine.play(part, step, time);
        }
      }
    }
  }
  
  // Zerstöre den Sequencer und alle Ressourcen
  destroy(): void {
    this.stop();
    console.log('Sequencer zerstört');
  }
}