/**
 * SynthEngine.ts - Virtuell-analoger Synthesizer für TribeX
 * Teil des Core-Systems gemäß Roadmap
 * Implementiert Multi Modeling Technology (MMT)
 */

import { Part, ProjectState, SynthSettings } from '../../types';
import { Mixer } from '../mixer/Mixer';
import { clamp } from '../../utils/index';

export interface VoiceAllocation {
  id: string;
  partId: string;
  note: number;
  time: number;
  released: boolean;
}

export interface SynthVoice {
  oscillator: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  lfo?: OscillatorNode;
  lfoGain?: GainNode;
  adsr: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  connected: boolean;
}

export class SynthEngine {
  private context: AudioContext;
  private mixer: Mixer;
  private voices: Map<string, SynthVoice> = new Map();
  private activeVoices: Map<string, VoiceAllocation> = new Map(); // partId-note als Key
  private maxVoices: number = 32; // Polyphonie-Limit
  private nextVoiceId: number = 0;

  constructor(context: AudioContext, mixer: Mixer) {
    this.context = context;
    this.mixer = mixer;
  }

  /**
   * Lädt alle Synthesizer-Einstellungen für ein Projekt
   */
  async loadProject(project: ProjectState): Promise<void> {
    // In einer vollständigen Implementierung würden hier
    // Synthesizer-Einstellungen geladen
    console.log('SynthEngine: Projekt geladen');
  }

  /**
   * Erstellt eine neue Synthesizer-Stimme
   */
  private createVoice(part: Part): SynthVoice {
    const synthSettings = part.synth || this.getDefaultSynthSettings();
    
    // Erstelle Audio-Nodes
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    // Konfiguriere Oszillator
    oscillator.type = synthSettings.waveform || 'sawtooth';
    
    // Konfiguriere Filter
    filter.type = 'lowpass';
    filter.frequency.value = synthSettings.cutoff || 10000;
    filter.Q.value = synthSettings.resonance || 0.2;
    
    // Konfiguriere ADSR
    const adsr = {
      attack: synthSettings.attack || 0.01,
      decay: synthSettings.decay || 0.3,
      sustain: synthSettings.sustain || 0.7,
      release: synthSettings.release || 0.4
    };
    
    // Verbindungen: Osc -> Filter -> Gain -> Channel Strip
    oscillator.connect(filter);
    filter.connect(gain);
    
    // Hole oder erstelle einen Channel Strip für diesen Part
    this.mixer.createChannelStrip(part.id, part.name);
    const channelStrip = this.mixer.createChannelStrip(part.id, part.name);
    gain.connect(channelStrip.input);
    
    const voice: SynthVoice = {
      oscillator,
      gain,
      filter,
      adsr,
      connected: true
    };
    
    // Initialisiere mit minimaler Lautstärke
    gain.gain.value = 0;
    
    return voice;
  }

  /**
   * Gibt eine Stimme frei
   */
  private releaseVoice(voiceId: string): void {
    const voice = this.voices.get(voiceId);
    if (!voice) return;
    
    if (voice.connected) {
      try {
        voice.oscillator.stop();
        voice.oscillator.disconnect();
        voice.gain.disconnect();
        voice.filter.disconnect();
      } catch (e) {
        // Nodes waren möglicherweise bereits getrennt
      }
    }
    
    this.voices.delete(voiceId);
  }

  /**
   * Spielt eine Note auf einem Synthesizer-Part ab
   */
  playNote(part: Part, noteNumber: number, time: number = this.context.currentTime, velocity: number = 1.0): void {
    // Generiere einen eindeutigen Key für diese Note am Part
    const voiceKey = `${part.id}-${noteNumber}`;
    
    // Prüfe, ob bereits eine Stimme für diese Note aktiv ist
    if (this.activeVoices.has(voiceKey)) {
      // Wenn ja, stoppe die alte Note (Portamento würde hier implementiert)
      this.stopNote(part, noteNumber, time);
    }
    
    // Versuche eine freie Stimme zu finden oder erstelle eine neue
    let voice: SynthVoice | null = null;
    let voiceId: string | null = null;
    
    // Suche nach nicht aktiven Stimmen
    for (const [id, v] of this.voices) {
      if (!this.activeVoices.has(id)) {
        voiceId = id;
        voice = v;
        break;
      }
    }
    
    // Wenn keine freie Stimme verfügbar, erstelle eine neue (mit Limit)
    if (!voice && this.voices.size < this.maxVoices) {
      voice = this.createVoice(part);
      voiceId = `voice-${this.nextVoiceId++}`;
      this.voices.set(voiceId, voice);
    }
    
    // Wenn immer noch keine Stimme verfügbar, stelle eine alte ab (Voice Stealing)
    if (!voice) {
      const oldestKey = this.getOldestActiveVoice();
      if (oldestKey) {
        voiceId = oldestKey;
        voice = this.voices.get(oldestKey) || null;
      }
    }
    
    if (!voiceId || !voice) {
      console.warn('Keine freie Stimme verfügbar für Synth-Abspielung');
      return;
    }
    
    // Konfiguriere die Stimme mit den aktuellen Part-Einstellungen
    this.configureVoice(voice, part, noteNumber, velocity);
    
    // Starte die Oszillatoren
    if (voice.oscillator.playbackState === 'scheduled' || voice.oscillator.playbackState === 'playing') {
      // Wenn bereits spielend, stoppe zuerst
      voice.oscillator.stop();
    }
    
    // Setze die Frequenz basierend auf der MIDI-Note
    const frequency = this.midiToFrequency(noteNumber);
    voice.oscillator.frequency.setValueAtTime(frequency, time);
    
    // Starte die Oszillatoren
    voice.oscillator.start(time);
    
    // Starte die ADSR-Hüllkurve
    this.startAdsr(voice, time, velocity);
    
    // Merke die aktive Stimme
    this.activeVoices.set(voiceKey, {
      id: voiceId,
      partId: part.id,
      note: noteNumber,
      time: time,
      released: false
    });
  }

  /**
   * Stoppt eine Note auf einem Synthesizer-Part
   */
  stopNote(part: Part, noteNumber: number, time: number = this.context.currentTime): void {
    const voiceKey = `${part.id}-${noteNumber}`;
    const allocation = this.activeVoices.get(voiceKey);
    
    if (!allocation) {
      return; // Keine aktive Stimme für diese Note
    }
    
    const voice = this.voices.get(allocation.id);
    if (!voice) {
      this.activeVoices.delete(voiceKey);
      return;
    }
    
    // Starte die Release-Phase der ADSR-Hüllkurve
    this.startRelease(voice, time);
    
    // Markiere als released
    allocation.released = true;
    
    // Entferne die Stimme nach der Release-Zeit
    const releaseTime = voice.adsr.release;
    this.context.setTimeout(() => {
      this.activeVoices.delete(voiceKey);
      
      // Wenn es sich um eine Stimme handelt, die wiederverwendet werden kann, 
      // halten wir sie vor (in einer vollständigen Implementierung)
    }, releaseTime * 1000);
  }

  /**
   * Konfiguriert eine Stimme mit Part-Einstellungen
   */
  private configureVoice(voice: SynthVoice, part: Part, noteNumber: number, velocity: number): void {
    const synthSettings = part.synth || this.getDefaultSynthSettings();
    
    // Konfiguriere Oszillator
    if (voice.oscillator.type !== synthSettings.waveform) {
      voice.oscillator.type = synthSettings.waveform || 'sawtooth';
    }
    
    // Konfiguriere Filter
    voice.filter.type = 'lowpass';
    voice.filter.frequency.setValueAtTime(synthSettings.cutoff || 10000, this.context.currentTime);
    voice.filter.Q.setValueAtTime(synthSettings.resonance || 0.2, this.context.currentTime);
    
    // Konfiguriere ADSR
    voice.adsr = {
      attack: synthSettings.attack || 0.01,
      decay: synthSettings.decay || 0.3,
      sustain: synthSettings.sustain || 0.7,
      release: synthSettings.release || 0.4
    };
  }

  /**
   * Startet die ADSR-Hüllkurve
   */
  private startAdsr(voice: SynthVoice, time: number, velocity: number): void {
    const { attack, decay, sustain } = voice.adsr;
    const gain = velocity; // Berücksichtigt auch die Velocity
    
    const now = time;
    
    // Setze Gain auf 0
    voice.gain.gain.setValueAtTime(0, now);
    
    // Attack Phase: 0 -> Peak
    const peakLevel = gain;
    voice.gain.gain.linearRampToValueAtTime(peakLevel, now + attack);
    
    // Decay Phase: Peak -> Sustain
    voice.gain.gain.linearRampToValueAtTime(sustain * peakLevel, now + attack + decay);
  }

  /**
   * Startet die Release-Phase
   */
  private startRelease(voice: SynthVoice, time: number): void {
    const now = time;
    const releaseTime = voice.adsr.release;
    
    // Aktuelle Lautstärke zum Zeitpunkt des Releases ermitteln
    const currentGain = voice.gain.gain.value;
    
    // Release Phase: Aktuelle Lautstärke -> 0
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(currentGain, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + releaseTime);
    
    // Stoppe den Oszillator nach der Release-Zeit
    voice.oscillator.stop(now + releaseTime + 0.1); // Kleine Sicherheitsmarge
  }

  /**
   * Gibt die älteste aktive Stimme zurück (für Voice Stealing)
   */
  private getOldestActiveVoice(): string | null {
    let oldestTime = Infinity;
    let oldestId: string | null = null;
    
    for (const [voiceKey, allocation] of this.activeVoices) {
      if (allocation.time < oldestTime) {
        oldestTime = allocation.time;
        oldestId = allocation.id;
      }
    }
    
    return oldestId;
  }

  /**
   * MIDI-Note in Frequenz umwandeln
   */
  private midiToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  /**
   * Gibt Standard-Synth-Einstellungen zurück
   */
  private getDefaultSynthSettings(): SynthSettings {
    return {
      waveform: 'sawtooth',
      cutoff: 10000,
      resonance: 0.2,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.7,
      release: 0.4,
      lfoRate: 3,
      lfoDepth: 0.1,
      glide: 0
    };
  }

  /**
   * Setzt einen Synthesizer-Parameter in Echtzeit
   */
  setParameter(partId: string, parameter: keyof SynthSettings, value: number): void {
    // In einer vollständigen Implementierung würden hier
    // aktive Stimmen für diesen Part angepasst
    console.log(`SynthEngine: Parameter ${parameter} auf ${value} für Part ${partId} gesetzt`);
  }

  /**
   * Spielt einen Synthesizer-Part mit Step-Daten ab
   */
  play(part: Part, time: number, velocity: number = 1.0): void {
    // Für Drum-Synthesizer, spiele mit fester Note (z.B. 60 für Kick)
    // Für melodische Synthesizer, würde die Note aus den Step-Daten kommen
    this.playNote(part, 60, time, velocity);
  }

  /**
   * Gibt alle Ressourcen frei
   */
  async destroy(): Promise<void> {
    // Stoppe alle aktiven Stimmen
    for (const voiceKey of this.activeVoices.keys()) {
      const allocation = this.activeVoices.get(voiceKey);
      if (allocation) {
        const voice = this.voices.get(allocation.id);
        if (voice) {
          this.startRelease(voice, this.context.currentTime);
        }
      }
    }
    
    // Lösche alle Stimmen
    for (const [voiceId, voice] of this.voices) {
      this.releaseVoice(voiceId);
    }
    
    this.voices.clear();
    this.activeVoices.clear();
    
    console.log('SynthEngine zerstört');
  }

  /**
   * Gibt den Status der SynthEngine zurück
   */
  getStatus(): {
    activeVoices: number;
    totalVoices: number;
    maxVoices: number;
  } {
    return {
      activeVoices: this.activeVoices.size,
      totalVoices: this.voices.size,
      maxVoices: this.maxVoices
    };
  }
}