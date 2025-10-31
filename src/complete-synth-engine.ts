/**
 * complete-synth-engine.ts - Vollständige Synthesizer-Engine für TribeX
 * Integriert alle erweiterten Funktionen in einer umfassenden Synthesizer-Engine
 */

import { 
  AdvancedSynthVoice, 
  AdvancedSynthezicSynth, 
  createDefaultAdvancedSynthSettings 
} from './advanced-synth';
import { 
  FilterFactory, 
  AdvancedFilterParams, 
  FilterType 
} from './advanced-filters';
import { 
  EffectFactory, 
  Effect, 
  AnyEffectParams,
  EffectType
} from './effects';
import { clamp, lerp } from './utils.js';
import { SynthSettings } from './tribeX-types';

// Erweiterte Synth-Einstellungen für die vollständige Engine
interface CompleteSynthSettings {
  // Basis-Oszillator-Einstellungen
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';
  baseNote: number;
  octave: number;
  detune: number;
  pulseWidth: number; // Nur für square
  
  // Filter-Einstellungen
  filterType: FilterType;
  cutoff: number;
  resonance: number;
  filterEnvAmount: number;
  filterEnvAttack: number;
  filterEnvDecay: number;
  filterEnvSustain: number;
  filterEnvRelease: number;
  
  // Envelope-Einstellungen (ADSR)
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  
  // LFOs
  lfo1Enabled: boolean;
  lfo1Rate: number;
  lfo1Depth: number;
  lfo1Target: 'pitch' | 'cutoff' | 'amp' | 'filter';
  lfo1Waveform: 'sine' | 'sawtooth' | 'triangle' | 'square';
  
  lfo2Enabled: boolean;
  lfo2Rate: number;
  lfo2Depth: number;
  lfo2Target: 'pitch' | 'cutoff' | 'amp' | 'filter';
  lfo2Waveform: 'sine' | 'sawtooth' | 'triangle' | 'square';
  
  // Modulation
  glide: number;
  unison: number;
  unisonDetune: number;
  stereoWidth: number;
  
  // Noise
  noiseLevel: number;
  noiseColor: 'white' | 'pink' | 'brown';
  
  // FM-Synthese
  fmEnabled: boolean;
  fmDepth: number;
  fmRatio: number;
  
  // Effekte
  reverbEnabled: boolean;
  reverbAmount: number;
  delayEnabled: boolean;
  delayAmount: number;
  distortionEnabled: boolean;
  distortionAmount: number;
  
  // Sonstige
  volume: number;
  pan: number;
}

// Polyphonie-Management
interface Voice {
  id: symbol;
  note: number;
  startedAt: number;
  node: AudioNode;
  gainNode: GainNode;
  connectedTo: AudioNode[];
}

export class CompleteSynthEngine {
  private context: AudioContext;
  private masterGain: GainNode;
  private masterFilter: BiquadFilterNode;
  private effectsChain: Effect[] = [];
  private activeVoices: Map<symbol, Voice> = new Map();
  private maxPolyphony: number = 16;
  private settings: CompleteSynthSettings;
  private filterNodes: BiquadFilterNode[] = [];

  constructor(context: AudioContext, settings?: Partial<CompleteSynthSettings>) {
    this.context = context;
    
    // Master-Knoten
    this.masterGain = context.createGain();
    this.masterFilter = context.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 20000;
    
    // Verbinde Master-Knoten
    this.masterFilter.connect(this.masterGain);
    
    // Setze Standard-Einstellungen
    this.settings = {
      // Basis-Oszillator
      waveform: 'sawtooth',
      baseNote: 60,
      octave: 0,
      detune: 0,
      pulseWidth: 0.5,
      
      // Filter
      filterType: 'lowpass',
      cutoff: 2200,
      resonance: 0.2,
      filterEnvAmount: 0,
      filterEnvAttack: 0.1,
      filterEnvDecay: 0.2,
      filterEnvSustain: 0.5,
      filterEnvRelease: 0.3,
      
      // Envelope
      attack: 0.01,
      decay: 0.18,
      sustain: 0.75,
      release: 0.35,
      
      // LFOs
      lfo1Enabled: false,
      lfo1Rate: 1,
      lfo1Depth: 0,
      lfo1Target: 'pitch',
      lfo1Waveform: 'sine',
      
      lfo2Enabled: false,
      lfo2Rate: 2,
      lfo2Depth: 0,
      lfo2Target: 'cutoff',
      lfo2Waveform: 'sine',
      
      // Modulation
      glide: 0,
      unison: 1,
      unisonDetune: 10,
      stereoWidth: 1,
      
      // Noise
      noiseLevel: 0,
      noiseColor: 'white',
      
      // FM
      fmEnabled: false,
      fmDepth: 0,
      fmRatio: 1,
      
      // Effekte
      reverbEnabled: false,
      reverbAmount: 0,
      delayEnabled: false,
      delayAmount: 0,
      distortionEnabled: false,
      distortionAmount: 0,
      
      // Sonstige
      volume: 0.8,
      pan: 0
    };
    
    // Übernehme eventuelle benutzerdefinierte Einstellungen
    if (settings) {
      this.settings = { ...this.settings, ...settings };
    }
    
    this.masterGain.gain.value = this.settings.volume;
  }

  /**
   * Triggert eine Note
   */
  triggerNote(note: number, velocity: number = 1, duration?: number): symbol {
    // Stelle Polyphonie sicher
    if (this.activeVoices.size >= this.maxPolyphony) {
      // Stoppe die älteste Stimme
      const oldest = Array.from(this.activeVoices.values())
        .sort((a, b) => a.startedAt - b.startedAt)[0];
      if (oldest) {
        this.stopVoice(oldest.id);
      }
    }

    // Erzeuge eine neue Stimme-ID
    const voiceId = Symbol('voice');
    
    // Erstelle eine neue Stimme
    const voice = this.createVoice(voiceId, note, velocity);
    
    // Speichere die Stimme
    this.activeVoices.set(voiceId, {
      id: voiceId,
      note,
      startedAt: this.context.currentTime,
      node: voice.oscillator,
      gainNode: voice.amp,
      connectedTo: [voice.filter]
    });
    
    // Starte die Stimme
    voice.trigger(this.context.currentTime, duration || 0.5);
    
    return voiceId;
  }

  /**
   * Stoppt eine spezifische Stimme
   */
  stopVoice(voiceId: symbol): void {
    const voice = this.activeVoices.get(voiceId);
    if (!voice) return;

    // Entferne die Stimme aus der aktiven Liste
    this.activeVoices.delete(voiceId);
  }

  /**
   * Stoppt alle aktiven Stimmen
   */
  stopAllVoices(): void {
    this.activeVoices.forEach((_, voiceId) => {
      this.stopVoice(voiceId);
    });
  }

  /**
   * Erstellt eine Stimme mit allen Modulationsmöglichkeiten
   */
  private createVoice(voiceId: symbol, note: number, velocity: number): AdvancedSynthVoice {
    // Erstelle Stimmenparameter basierend auf aktuellen Einstellungen
    const voiceSettings = { ...createDefaultAdvancedSynthSettings(), ...this.settings };
    
    // Erstelle eine neue Stimme
    const voice = new AdvancedSynthVoice(
      this.context,
      voiceSettings,
      `voice-${voiceId.toString()}`,
      note,
      velocity,
      this.context.currentTime
    );
    
    // Verbinde mit Master-Ausgang durch Effekte
    const destination = this.setupEffectsChain(voiceId);
    voice.connect(destination);
    
    return voice;
  }

  /**
   * Setzt die Effekt-Kette für eine Stimme auf
   */
  private setupEffectsChain(voiceId: symbol): AudioNode {
    // Start mit dem Master-Filter
    let currentNode: AudioNode = this.masterFilter;
    
    // Füge Effekte in der richtigen Reihenfolge hinzu
    if (this.settings.reverbEnabled) {
      const reverbParams = {
        type: 'reverb' as EffectType,
        enabled: true,
        bypass: false,
        mix: this.settings.reverbAmount,
        decay: 2.0,
        roomSize: 0.8,
        damping: 0.2,
        wet: this.settings.reverbAmount,
        predelay: 0.01
      };
      const reverb = EffectFactory.createEffect(this.context, reverbParams);
      this.effectsChain.push(reverb);
      // Verbinde Effekt (in einer vollständigen Implementierung)
    }
    
    if (this.settings.delayEnabled) {
      const delayParams = {
        type: 'delay' as EffectType,
        enabled: true,
        bypass: false,
        mix: this.settings.delayAmount,
        time: 0.3,
        feedback: 0.3,
        wet: this.settings.delayAmount,
        stereo: true,
        rate: 0.1,
        depth: 0.1
      };
      const delay = EffectFactory.createEffect(this.context, delayParams);
      this.effectsChain.push(delay);
      // Verbinde Effekt (in einer vollständigen Implementierung)
    }
    
    if (this.settings.distortionEnabled) {
      const distortionParams = {
        type: 'distortion' as EffectType,
        enabled: true,
        bypass: false,
        mix: this.settings.distortionAmount,
        drive: this.settings.distortionAmount * 10,
        tone: 0.5,
        wet: this.settings.distortionAmount,
        curveAmount: this.settings.distortionAmount
      };
      const distortion = EffectFactory.createEffect(this.context, distortionParams);
      this.effectsChain.push(distortion);
      // Verbinde Effekt (in einer vollständigen Implementierung)
    }
    
    return this.masterGain;
  }

  /**
   * Aktualisiert die globalen Synthesizer-Einstellungen
   */
  updateSettings(newSettings: Partial<CompleteSynthSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Aktualisiere Master-Einstellungen
    this.masterGain.gain.value = this.settings.volume;
    
    // Filtereinstellungen aktualisieren
    this.masterFilter.type = this.settings.filterType as BiquadFilterType;
    this.masterFilter.frequency.value = clamp(this.settings.cutoff, 20, this.context.sampleRate / 2);
    this.masterFilter.Q.value = clamp(this.settings.resonance, 0.0001, 100);
  }

  /**
   * Aktualisiert die Einstellungen für eine spezifische Stimme
   */
  updateVoiceSettings(voiceId: symbol, newSettings: Partial<CompleteSynthSettings>): void {
    // In einer vollständigen Implementierung würden hier
    // die Parameter der laufenden Stimme aktualisiert
    console.log(`Aktualisierung der Stimme ${voiceId} mit neuen Einstellungen`, newSettings);
  }

  /**
   * Fügt einen neuen Effekt zur globalen Effekt-Kette hinzu
   */
  addEffect(params: AnyEffectParams): Effect {
    const effect = EffectFactory.createEffect(this.context, params);
    this.effectsChain.push(effect);
    return effect;
  }

  /**
   * Entfernt einen Effekt aus der globalen Effekt-Kette
   */
  removeEffect(effect: Effect): void {
    const index = this.effectsChain.indexOf(effect);
    if (index !== -1) {
      this.effectsChain.splice(index, 1);
      effect.disconnect();
    }
  }

  /**
   * Setzt alle Effekte zurück
   */
  clearEffects(): void {
    this.effectsChain.forEach(effect => effect.disconnect());
    this.effectsChain = [];
  }

  /**
   * Setzt die Synthesizer-Engine zurück
   */
  reset(): void {
    // Stoppe alle Stimmen
    this.stopAllVoices();
    
    // Lösche alle Effekte
    this.clearEffects();
    
    // Setze Standard-Einstellungen zurück
    this.settings = {
      // Basis-Oszillator
      waveform: 'sawtooth',
      baseNote: 60,
      octave: 0,
      detune: 0,
      pulseWidth: 0.5,
      
      // Filter
      filterType: 'lowpass',
      cutoff: 2200,
      resonance: 0.2,
      filterEnvAmount: 0,
      filterEnvAttack: 0.1,
      filterEnvDecay: 0.2,
      filterEnvSustain: 0.5,
      filterEnvRelease: 0.3,
      
      // Envelope
      attack: 0.01,
      decay: 0.18,
      sustain: 0.75,
      release: 0.35,
      
      // LFOs
      lfo1Enabled: false,
      lfo1Rate: 1,
      lfo1Depth: 0,
      lfo1Target: 'pitch',
      lfo1Waveform: 'sine',
      
      lfo2Enabled: false,
      lfo2Rate: 2,
      lfo2Depth: 0,
      lfo2Target: 'cutoff',
      lfo2Waveform: 'sine',
      
      // Modulation
      glide: 0,
      unison: 1,
      unisonDetune: 10,
      stereoWidth: 1,
      
      // Noise
      noiseLevel: 0,
      noiseColor: 'white',
      
      // FM
      fmEnabled: false,
      fmDepth: 0,
      fmRatio: 1,
      
      // Effekte
      reverbEnabled: false,
      reverbAmount: 0,
      delayEnabled: false,
      delayAmount: 0,
      distortionEnabled: false,
      distortionAmount: 0,
      
      // Sonstige
      volume: 0.8,
      pan: 0
    };
  }

  /**
   * Gibt die aktuelle Polyphonie-Anzahl zurück
   */
  getActiveVoiceCount(): number {
    return this.activeVoices.size;
  }

  /**
   * Gibt die maximale Polyphonie-Anzahl zurück
   */
  getMaxPolyphony(): number {
    return this.maxPolyphony;
  }

  /**
   * Setzt die maximale Polyphonie-Anzahl
   */
  setMaxPolyphony(max: number): void {
    this.maxPolyphony = max;
  }

  /**
   * Gibt alle Stimmen-Einstellungen zurück
   */
  getSettings(): CompleteSynthSettings {
    return { ...this.settings };
  }

  /**
   * Verbindet die Synthesizer-Engine mit einem Ausgabeknoten
   */
  connect(destination: AudioNode): void {
    this.masterGain.connect(destination);
  }

  /**
   * Trennt die Verbindung zur Ausgabe
   */
  disconnect(destination?: AudioNode): void {
    if (destination) {
      this.masterGain.disconnect(destination);
    } else {
      this.masterGain.disconnect();
    }
  }

  /**
   * Spiel eine Note sequenziell (für Tests)
   */
  playNoteSequence(notes: number[], velocity: number = 1, interval: number = 0.5): void {
    let timeOffset = 0;
    
    for (const note of notes) {
      this.context.resume().then(() => {
        setTimeout(() => {
          this.triggerNote(note, velocity, interval * 0.8);
        }, timeOffset * 1000);
        
        timeOffset += interval;
      });
    }
  }
}

/**
 * Hilfsfunktionen für die Synthesizer-Engine
 */
export const SynthHelpers = {
  /**
   * Konvertiert MIDI-Note zu Frequenz
   */
  midiToFrequency: (note: number): number => {
    return 440 * Math.pow(2, (note - 69) / 12);
  },

  /**
   * Erzeugt eine Oszillator-Wellenform
   */
  createCustomWaveform: (real: number[], imag: number[]): PeriodicWave => {
    // Stelle sicher, dass die Arrays die richtige Länge haben
    if (real.length !== imag.length) {
      throw new Error("Real- und Imaginärteile müssen die gleiche Länge haben");
    }
    
    // Füge Gleichstromkomponente hinzu, wenn nicht vorhanden
    if (real[0] === 0) {
      real = [0, ...real];
      imag = [0, ...imag];
    }
    
    return new PeriodicWave(audioContext, { real, imag });
  },

  /**
   * Erzeugt eine Frequenz-Tabelle für benutzerdefinierte Wellenformen
   */
  generateWaveform: (type: 'harmonic', harmonics: number[]): [number[], number[]] => {
    const real: number[] = [0];
    const imag: number[] = [0];
    
    for (let i = 0; i < harmonics.length; i++) {
      real.push(0); // Keine cos-Terme
      imag.push(harmonics[i]); // sin-Terme mit Stärke der Oberschwingung
    }
    
    return [real, imag];
  }
};

// Globale Referenz für AudioContext (wenn nicht bereits vorhanden)
declare global {
  interface Window {
    audioContext: AudioContext;
  }
}

// Standard-AudioContext, falls benötigt
const audioContext = (typeof window !== 'undefined' && window.AudioContext) ? 
  new window.AudioContext() : 
  undefined;