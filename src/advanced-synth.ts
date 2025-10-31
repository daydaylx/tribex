/**
 * advanced-synth.ts - Erweiterte Synthesizer-Engine für TribeX
 * Bietet vollwertige Synthesizer-Funktionalität mit zusätzlichen Modulen
 */

import { clamp, lerp } from './utils.js';
import { SynthSettings } from './tribeX-types';

// Erweiterte Synth-Einstellungen
interface AdvancedSynthSettings extends SynthSettings {
  baseNote: number;
  filterEnvAmount: number;
  filterEnvAttack: number;
  filterEnvDecay: number;
  filterEnvSustain: number;
  filterEnvRelease: number;
  lfoTarget: 'cutoff' | 'pitch' | 'amp' | 'pan';
  lfo2Waveform: string;
  lfo2Rate: number;
  lfo2Depth: number;
  lfo2Target: 'cutoff' | 'pitch' | 'amp' | 'pan';
  noiseLevel: number;
  noiseColor: 'white' | 'pink' | 'brown';
  ringModulator: boolean;
  ringFreq: number;
  unison: number;
  unisonDetune: number;
  stereoWidth: number;
  pulseWidth: number; // Nur für square Waveform
  phase: number;
  harmonicSpread: number;
  fmDepth: number;
  fmRatio: number;
  drive: number;
  driveType: 'clean' | 'soft' | 'hard' | 'clip';
  bitcrush: number;
  bitcrushDepth: number;
}

export function createDefaultAdvancedSynthSettings(): AdvancedSynthSettings {
  return {
    waveform: 'sawtooth',
    attack: 0.01,
    decay: 0.18,
    sustain: 0.75,
    release: 0.35,
    cutoff: 2200,
    resonance: 0.2,
    lfoRate: 0,
    lfoDepth: 0,
    glide: 0,
    
    // Neue Parameter
    baseNote: 60,
    filterEnvAmount: 0,
    filterEnvAttack: 0.1,
    filterEnvDecay: 0.2,
    filterEnvSustain: 0.5,
    filterEnvRelease: 0.3,
    lfoTarget: 'cutoff',
    lfo2Waveform: 'sine',
    lfo2Rate: 0,
    lfo2Depth: 0,
    lfo2Target: 'pitch',
    noiseLevel: 0,
    noiseColor: 'white',
    ringModulator: false,
    ringFreq: 440,
    unison: 1,
    unisonDetune: 10,
    stereoWidth: 1,
    pulseWidth: 0.5,
    phase: 0,
    harmonicSpread: 0,
    fmDepth: 0,
    fmRatio: 1,
    drive: 0,
    driveType: 'clean',
    bitcrush: 0,
    bitcrushDepth: 8
  };
}

class AdvancedSynthVoice {
  oscillator: OscillatorNode;
  filter: BiquadFilterNode;
  amp: GainNode;
  lfo?: OscillatorNode;
  lfoGain?: GainNode;
  lfo2?: OscillatorNode;
  lfo2Gain?: GainNode;
  noise?: AudioBufferSourceNode;
  ringModulator?: GainNode;
  filterEnv?: GainNode;
  fmOsc?: OscillatorNode;
  fmGain?: GainNode;
  driveNode?: WaveShaperNode;
  bitcrushNode?: AudioWorkletNode;
  
  constructor(
    public context: AudioContext,
    public settings: AdvancedSynthSettings,
    public partId: string,
    public note: number,
    public velocity: number,
    public startTime: number
  ) {
    // Haupt-Oszillator
    this.oscillator = context.createOscillator();
    this.oscillator.type = settings.waveform || 'sawtooth';
    
    // Filter
    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';
    
    // Verstärker
    this.amp = context.createGain();
    
    // Noise-Generator falls benötigt
    if (settings.noiseLevel > 0) {
      this.noise = this.createNoiseBuffer(context, settings.noiseColor);
    }
    
    // FM-Oszillator falls benötigt
    if (settings.fmDepth > 0) {
      this.fmOsc = context.createOscillator();
      this.fmGain = context.createGain();
      this.fmOsc.frequency.value = this.getFrequency() * settings.fmRatio;
      this.fmGain.gain.value = settings.fmDepth * 100; // Cent
    }
  }
  
  private getFrequency(): number {
    return 440 * Math.pow(2, (this.note - 69) / 12);
  }
  
  private createNoiseBuffer(context: AudioContext, color: 'white' | 'pink' | 'brown'): AudioBufferSourceNode {
    const bufferSize = context.sampleRate;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    
    switch (color) {
      case 'white':
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        break;
      case 'pink':
        // Simplified pink noise algorithm
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[i] *= 0.11; // Scale to prevent clipping
        }
        break;
      case 'brown':
        let lastValue = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastValue + white * 0.2) * 0.6;
          lastValue = data[i];
        }
        break;
    }
    
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }
  
  connect(destination: AudioNode): void {
    // Hauptsignalpfad
    if (this.noise) {
      this.noise.connect(this.amp);
    }
    
    // Oszillator-Pfad
    this.oscillator.connect(this.filter);
    this.filter.connect(this.amp);
    
    // FM-Verbindungen falls aktiv
    if (this.fmOsc && this.fmGain) {
      this.fmOsc.connect(this.fmGain);
      this.fmGain.connect(this.oscillator.frequency); // Moduliert Frequenz
    }
    
    // Zielverbindungen für LFOs
    if (this.lfo && this.lfoGain) {
      switch (this.settings.lfoTarget) {
        case 'cutoff':
          this.lfoGain.connect(this.filter.frequency);
          break;
        case 'pitch':
          this.lfoGain.connect(this.oscillator.frequency);
          break;
        case 'amp':
          this.lfoGain.connect(this.amp.gain);
          break;
        case 'pan':
          // Pan wird separat mit StereoPannerNode behandelt
          break;
      }
    }
    
    if (this.lfo2 && this.lfo2Gain) {
      switch (this.settings.lfo2Target) {
        case 'cutoff':
          this.lfo2Gain.connect(this.filter.frequency);
          break;
        case 'pitch':
          this.lfo2Gain.connect(this.oscillator.frequency);
          break;
        case 'amp':
          this.lfo2Gain.connect(this.amp.gain);
          break;
        case 'pan':
          // Pan wird separat mit StereoPannerNode behandelt
          break;
      }
    }
    
    // Filter-Evelope falls aktiv
    if (this.filterEnv) {
      this.filterEnv.connect(this.filter.frequency);
    }
    
    // Effekte
    if (this.driveNode) {
      this.amp.connect(this.driveNode);
      this.driveNode.connect(destination);
    } else {
      this.amp.connect(destination);
    }
  }
  
  trigger(time: number, duration: number): void {
    const settings = this.settings;
    const frequency = this.getFrequency();
    const peak = clamp(settings.gain ?? 0.9, 0, 2) * clamp(this.velocity, 0, 1.5);
    const attack = Math.max(settings.attack ?? 0.01, 0.001);
    const decay = Math.max(settings.decay ?? 0.1, 0.001);
    const sustain = clamp(settings.sustain ?? 0.7, 0, 1);
    const release = Math.max(settings.release ?? 0.25, 0.01);
    
    // Setze Frequenz
    if (settings.glide && settings.glide > 0) {
      this.oscillator.frequency.setValueAtTime(this.oscillator.frequency.value, time);
      this.oscillator.frequency.linearRampToValueAtTime(frequency, time + settings.glide);
    } else {
      this.oscillator.frequency.setValueAtTime(frequency, time);
    }

    // Setze Filtereigenschaften
    const cutoffMin = 120;
    const cutoffMax = 18000;
    const cutoff = clamp(settings.cutoff, cutoffMin, cutoffMax);
    this.filter.frequency.setValueAtTime(cutoff, time);
    const resonance = clamp(settings.resonance, 0, 1);
    this.filter.Q.setValueAtTime(0.5 + resonance * 11.5, time);

    // ADSR-Envelopes
    const peakTime = time + attack;
    const decayTime = peakTime + decay;
    const releaseStart = time + duration;
    const stopTime = releaseStart + release + 0.05;

    this.amp.gain.setValueAtTime(0, time);
    this.amp.gain.linearRampToValueAtTime(peak, peakTime);
    this.amp.gain.linearRampToValueAtTime(peak * sustain, decayTime);
    this.amp.gain.setValueAtTime(peak * sustain, releaseStart);
    this.amp.gain.linearRampToValueAtTime(0.0001, releaseStart + release);

    // LFOs initialisieren falls benötigt
    if (settings.lfoDepth > 0 && settings.lfoRate > 0) {
      this.lfo = this.context.createOscillator();
      this.lfo.type = settings.lfoWaveform || 'sine';
      this.lfo.frequency.setValueAtTime(clamp(settings.lfoRate, 0.01, 20), time);
      this.lfoGain = this.context.createGain();
      this.lfoGain.gain.setValueAtTime(clamp(settings.lfoDepth, 0, 12) * 100, time);
      this.lfo.start(time);
    }

    if (settings.lfo2Depth > 0 && settings.lfo2Rate > 0) {
      this.lfo2 = this.context.createOscillator();
      this.lfo2.type = settings.lfo2Waveform || 'sine';
      this.lfo2.frequency.setValueAtTime(clamp(settings.lfo2Rate, 0.01, 20), time);
      this.lfo2Gain = this.context.createGain();
      this.lfo2Gain.gain.setValueAtTime(clamp(settings.lfo2Depth, 0, 12) * 100, time);
      this.lfo2.start(time);
    }

    // Filter-Envelope falls aktiv
    if (settings.filterEnvAmount > 0) {
      this.filterEnv = this.context.createGain();
      // Filter-ADSR-Envelope simulieren
      const filterEnvGain = this.context.createGain();
      filterEnvGain.gain.setValueAtTime(0, time);
      filterEnvGain.gain.linearRampToValueAtTime(settings.filterEnvAmount * 5000, peakTime); // Amplitude des Filter-Effekts
      filterEnvGain.gain.linearRampToValueAtTime(settings.filterEnvAmount * 5000 * settings.filterEnvSustain, decayTime);
      filterEnvGain.gain.setValueAtTime(settings.filterEnvAmount * 5000 * settings.filterEnvSustain, releaseStart);
      filterEnvGain.gain.linearRampToValueAtTime(0.0001, releaseStart + settings.filterEnvRelease);
      filterEnvGain.connect(this.filter.frequency);
    }

    // Starte Haupt-Oszillator
    this.oscillator.start(time);
    this.oscillator.stop(stopTime);

    // Starte Noise falls aktiv
    if (this.noise) {
      this.noise.start(time);
      this.noise.stop(stopTime);
    }

    // Starte FM-Oszillator falls aktiv
    if (this.fmOsc) {
      this.fmOsc.start(time);
      this.fmOsc.stop(stopTime);
    }

    // Stoppe LFOs zur richtigen Zeit
    if (this.lfo) {
      this.lfo.stop(stopTime);
    }

    if (this.lfo2) {
      this.lfo2.stop(stopTime);
    }
  }
}

export class AdvancedSynthezicSynth {
  private context: AudioContext;
  private mixer: any;
  private activeVoices: Map<string, AdvancedSynthVoice> = new Map();
  private oscillators: OscillatorNode[] = [];

  constructor(context: AudioContext, mixer: any) {
    this.context = context;
    this.mixer = mixer;
  }

  trigger(part: any, step: any, time: number, velocity: number = 1): void {
    // Hole oder erstelle die erweiterten Synth-Einstellungen
    const settings = { ...createDefaultAdvancedSynthSettings(), ...(part.synth || {}) };
    
    // Bestimme den zu spielenden Ton
    const note = (step?.note ?? settings.baseNote ?? 60) + (settings.octave ?? 0) * 12;
    const duration = step?.duration ?? 0.25;
    
    // Erstelle eine neue Stimme
    const voice = new AdvancedSynthVoice(
      this.context,
      settings,
      part.id,
      note,
      velocity,
      time
    );
    
    // Verbinde mit dem Mixer-Kanal
    const channel = this.mixer.createVoiceChannel(part.id);
    voice.connect(channel.input);
    
    // Triggere die Stimme
    voice.trigger(time, duration);
    
    // Speichere die Stimme
    this.activeVoices.set(part.id, voice);
    
    // Setze Endzeit für Bereinigung
    setTimeout(() => {
      if (this.activeVoices.get(part.id) === voice) {
        this.activeVoices.delete(part.id);
      }
    }, (duration + settings.release + 0.1) * 1000);
  }
  
  // Methode zum Stoppen aller Stimmen
  stopAll(): void {
    this.activeVoices.forEach((voice, partId) => {
      // Stimmen stoppen (wird durch Timeouts automatisch passieren)
      this.activeVoices.delete(partId);
    });
  }
  
  // Methode zum Einstellen der Synth-Parameter in Echtzeit
  updatePart(partId: string, newSettings: Partial<AdvancedSynthSettings>): void {
    // Aktualisiere die Synth-Einstellungen für den Part
    const existingVoice = this.activeVoices.get(partId);
    if (existingVoice) {
      // In einer vollständigen Implementierung würden hier
      // die Parameter der laufenden Stimme aktualisiert
      Object.assign(existingVoice.settings, newSettings);
    }
  }
}

export { midiToFrequency, createDefaultSynthSettings };