/**
 * effects.ts - Effekt-Module für TribeX
 * Implementiert verschiedene Audio-Effekte für erweiterte Klanggestaltung
 */

import { clamp } from './utils.js';

// Effekt-Typen
export type EffectType = 
  | 'reverb'
  | 'delay'
  | 'chorus'
  | 'flanger'
  | 'phaser'
  | 'distortion'
  | 'compressor'
  | 'eq'
  | 'tremolo'
  | 'vibrato'
  | 'pitchShift'
  | 'filter'
  | 'bitcrusher'
  | 'ringModulator';

// Basistyp für Effektparameter
export interface EffectParams {
  enabled: boolean;
  mix: number; // 0-1, Anteil des Effekts im Gesamtsignal
  bypass: boolean;
}

// Reverb-Parameter
export interface ReverbParams extends EffectParams {
  type: 'reverb';
  decay: number; // Nachhallzeit
  roomSize: number; // Raumgröße
  damping: number; // Dämpfung
  wet: number; // Effektanteil
  predelay: number; // Vorverzögerung
}

// Delay-Parameter
export interface DelayParams extends EffectParams {
  type: 'delay';
  time: number; // Verzögerungszeit in Sekunden
  feedback: number; // Rückkopplung
  wet: number; // Effektanteil
  stereo: boolean; // Stereo-Verzögerung
  rate: number; // Modulationsrate (für modulated delay)
  depth: number; // Modulationstiefe
}

// Chorus-Parameter
export interface ChorusParams extends EffectParams {
  type: 'chorus';
  rate: number; // Modulationsrate
  depth: number; // Modulationstiefe
  feedback: number; // Rückkopplung
  delay: number; // Basisverzögerungszeit
  wet: number; // Effektanteil
}

// Flanger-Parameter
export interface FlangerParams extends EffectParams {
  type: 'flanger';
  rate: number; // Modulationsrate
  depth: number; // Modulationstiefe
  feedback: number; // Rückkopplung
  delay: number; // Basisverzögerungszeit
  wet: number; // Effektanteil
}

// Phaser-Parameter
export interface PhaserParams extends EffectParams {
  type: 'phaser';
  rate: number; // Modulationsrate
  depth: number; // Modulationstiefe
  feedback: number; // Rückkopplung
  stages: number; // Anzahl der Allpass-Filter (2, 4, 6, 8, 12, 24)
  baseFreq: number; // Basisfrequenz
  wet: number; // Effektanteil
}

// Distortion-Parameter
export interface DistortionParams extends EffectParams {
  type: 'distortion';
  drive: number; // Antrieb/Verzerrung
  tone: number; // Klangfarbe
  wet: number; // Effektanteil
  curveAmount: number; // Kurvenstärke
}

// Compressor-Parameter
export interface CompressorParams extends EffectParams {
  type: 'compressor';
  threshold: number; // Schwellwert
  ratio: number; // Kompressionsverhältnis
  attack: number; // Angriffszeit
  release: number; // Release-Zeit
  knee: number; // Übergangsweichheit
}

// EQ-Parameter (Multi-Band)
export interface EQParams extends EffectParams {
  type: 'eq';
  lowGain: number; // Basse
  midGain: number; // Mitten
  highGain: number; // Höhen
  lowFreq: number; // Low-Shelf Frequenz
  highFreq: number; // High-Shelf Frequenz
  midFreq: number; // Mittenfrequenz
  midQ: number; // Mitten-Q-Faktor
}

// Tremolo-Parameter
export interface TremoloParams extends EffectParams {
  type: 'tremolo';
  rate: number; // Modulationsrate
  depth: number; // Modulationstiefe
  waveform: 'sine' | 'triangle' | 'sawtooth' | 'square'; // Wellenform
  wet: number; // Effektanteil
}

// Vibrato-Parameter
export interface VibratoParams extends EffectParams {
  type: 'vibrato';
  rate: number; // Modulationsrate
  depth: number; // Modulationstiefe
  delay: number; // Verzögerungszeit
  feedback: number; // Rückkopplung
  wet: number; // Effektanteil
}

// PitchShift-Parameter
export interface PitchShiftParams extends EffectParams {
  type: 'pitchShift';
  semitones: number; // Tonhöhenverschiebung in Halbtönen
  wet: number; // Effektanteil
}

// Filter-Parameter
export interface FilterParams extends EffectParams {
  type: 'filter';
  frequency: number; // Filterfrequenz
  Q: number; // Resonanz
  gain: number; // Verstärkung (für peaking/shelf Filter)
  filterType: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'allpass' | 'peaking' | 'lowshelf' | 'highshelf';
}

// Bitcrusher-Parameter
export interface BitcrusherParams extends EffectParams {
  type: 'bitcrusher';
  bits: number; // Bit-Tiefe (1-16)
  samples: number; // Sample-Reduktion (1-128)
  wet: number; // Effektanteil
}

// Ring-Modulator-Parameter
export interface RingModulatorParams extends EffectParams {
  type: 'ringModulator';
  frequency: number; // Modulationsfrequenz
  waveform: 'sine' | 'triangle' | 'sawtooth' | 'square'; // Modulationswellenform
  wet: number; // Effektanteil
}

export type AnyEffectParams = 
  | ReverbParams
  | DelayParams
  | ChorusParams
  | FlangerParams
  | PhaserParams
  | DistortionParams
  | CompressorParams
  | EQParams
  | TremoloParams
  | VibratoParams
  | PitchShiftParams
  | FilterParams
  | BitcrusherParams
  | RingModulatorParams;

/**
 * Effekt-Interface
 */
export interface Effect {
  connect(input: AudioNode, output: AudioNode): void;
  disconnect(): void;
  update(params: AnyEffectParams): void;
  getParams(): AnyEffectParams;
}

/**
 * Reverb-Effekt
 */
export class ReverbEffect implements Effect {
  private convolver: ConvolverNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private output: GainNode;
  private params: ReverbParams;

  constructor(context: AudioContext, params: ReverbParams) {
    this.convolver = context.createConvolver();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    this.output = context.createGain();
    this.params = { ...params };
    
    // Erzeuge einen Impulsantwort-Puffer für den Reverb
    this.generateImpulseResponse(context, params.decay, params.damping, context.sampleRate);
    
    // Verbinde die Knoten
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(this.output);
    this.dryGain.connect(this.output);
  }

  private generateImpulseResponse(context: AudioContext, decay: number, damping: number, sampleRate: number): void {
    // Länge des Impulsantwort-Puffers
    const length = sampleRate * decay;
    const impulse = context.createBuffer(2, length, sampleRate);
    
    // Fülle beide Kanäle
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      // Erzeuge exponentiell abfallenden Rauschverlauf
      for (let i = 0; i < length; i++) {
        // Abklingkurve
        const decayValue = Math.exp(-i / (length * (1 - damping * 0.9)));
        // Zufälliges Rauschen für natürliches Gefühl
        channelData[i] = (Math.random() * 2 - 1) * decayValue;
      }
    }
    
    this.convolver.buffer = impulse;
  }

  connect(input: AudioNode, output: AudioNode): void {
    // Verbinde Trocken- und Nass-Signale
    input.connect(this.dryGain);
    input.connect(this.convolver);
    this.output.connect(output);
    
    // Setze aktuelle Parameter
    this.update(this.params);
  }

  disconnect(): void {
    // Trenne alle Verbindungen
    this.convolver.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.output.disconnect();
  }

  update(params: AnyEffectParams): void {
    if (params.type !== 'reverb') return;
    
    this.params = { ...params };
    this.wetGain.gain.value = params.wet;
    this.dryGain.gain.value = 1 - params.wet;
    
    // Erzeuge neue Impulsantwort basierend auf den neuen Parametern
    this.generateImpulseResponse(
      this.convolver.context as AudioContext, 
      params.decay, 
      params.damping, 
      this.convolver.context.sampleRate
    );
  }

  getParams(): ReverbParams {
    return { ...this.params };
  }
}

/**
 * Delay-Effekt
 */
export class DelayEffect implements Effect {
  private delayNode: DelayNode;
  private feedbackNode: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private output: GainNode;
  private params: DelayParams;

  constructor(context: AudioContext, params: DelayParams) {
    this.delayNode = context.createDelay(5.0); // Max Verzögerung 5s
    this.feedbackNode = context.createGain();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    this.output = context.createGain();
    this.params = { ...params };
    
    // Feedback-Schleife
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
    
    // Verbinde die Knoten
    this.delayNode.connect(this.wetGain);
    this.wetGain.connect(this.output);
    this.dryGain.connect(this.output);
  }

  connect(input: AudioNode, output: AudioNode): void {
    input.connect(this.dryGain);
    input.connect(this.delayNode);
    this.output.connect(output);
    
    // Setze aktuelle Parameter
    this.update(this.params);
  }

  disconnect(): void {
    this.delayNode.disconnect();
    this.feedbackNode.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.output.disconnect();
  }

  update(params: AnyEffectParams): void {
    if (params.type !== 'delay') return;
    
    this.params = { ...params };
    this.delayNode.delayTime.value = params.time;
    this.feedbackNode.gain.value = params.feedback;
    this.wetGain.gain.value = params.wet;
    this.dryGain.gain.value = 1 - params.wet;
  }

  getParams(): DelayParams {
    return { ...this.params };
  }
}

/**
 * Chorus-Effekt
 */
export class ChorusEffect implements Effect {
  private delayNode: DelayNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private output: GainNode;
  private params: ChorusParams;

  constructor(context: AudioContext, params: ChorusParams) {
    this.delayNode = context.createDelay(0.05); // 50ms max delay
    this.lfo = context.createOscillator();
    this.lfoGain = context.createGain();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    this.output = context.createGain();
    this.params = { ...params };
    
    // Verbinde LFO zur Delay-Time Modulation
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delayNode.delayTime);
    
    // Verbinde die Knoten
    this.delayNode.connect(this.wetGain);
    this.wetGain.connect(this.output);
    this.dryGain.connect(this.output);
    
    // Starte LFO
    this.lfo.start();
  }

  connect(input: AudioNode, output: AudioNode): void {
    input.connect(this.dryGain);
    input.connect(this.delayNode);
    this.output.connect(output);
    
    // Setze aktuelle Parameter
    this.update(this.params);
  }

  disconnect(): void {
    this.lfo.stop();
    this.delayNode.disconnect();
    this.lfo.disconnect();
    this.lfoGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.output.disconnect();
  }

  update(params: AnyEffectParams): void {
    if (params.type !== 'chorus') return;
    
    this.params = { ...params };
    this.lfo.frequency.value = params.rate;
    this.lfoGain.gain.value = params.depth * params.delay; // Tiefe beeinflusst Verzögerung
    this.delayNode.delayTime.value = params.delay;
    this.feedbackNode.gain.value = params.feedback;
    this.wetGain.gain.value = params.wet;
    this.dryGain.gain.value = 1 - params.wet;
  }

  getParams(): ChorusParams {
    return { ...this.params };
  }
  
  // Referenz für Feedback-Node
  private feedbackNode: GainNode;
  
  // Init in constructor
  private initFeedbackNode(context: AudioContext) {
    this.feedbackNode = context.createGain();
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
  }
}

/**
 * Distortion-Effekt
 */
export class DistortionEffect implements Effect {
  private waveShaper: WaveShaperNode;
  private preGain: GainNode;
  private postGain: GainNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private output: GainNode;
  private params: DistortionParams;

  constructor(context: AudioContext, params: DistortionParams) {
    this.waveShaper = context.createWaveShaper();
    this.preGain = context.createGain();
    this.postGain = context.createGain();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    this.output = context.createGain();
    this.params = { ...params };
    
    // Setze initiale Verzerrungskurve
    this.setCurve(params.drive, params.curveAmount);
    
    // Verbinde die Knoten
    this.preGain.connect(this.waveShaper);
    this.waveShaper.connect(this.postGain);
    this.postGain.connect(this.wetGain);
    this.wetGain.connect(this.output);
    this.dryGain.connect(this.output);
  }

  private setCurve(drive: number, curveAmount: number): void {
    // Berechne Verzerrungskurve basierend auf Drive und Kurvenstärke
    const curve = new Float32Array(4096);
    const deg = Math.PI / 180;
    const driveFactor = clamp(drive, 0, 1);
    const curveFactor = clamp(curveAmount, 0, 1);
    
    for (let i = 0; i < 4096; i++) {
      const x = (i - 2048) / 2048; // -1 to 1
      const scaledX = x * driveFactor * 10;
      // Verwende eine Tangens-ähnliche Funktion für weiche Clipping
      curve[i] = (Math.tan(scaledX * deg * 45) * (1 - curveFactor)) + 
                 (Math.sin(scaledX) * curveFactor);
    }
    
    this.waveShaper.curve = curve;
    this.waveShaper.oversample = '4x';
  }

  connect(input: AudioNode, output: AudioNode): void {
    input.connect(this.dryGain);
    input.connect(this.preGain);
    this.output.connect(output);
    
    // Setze aktuelle Parameter
    this.update(this.params);
  }

  disconnect(): void {
    this.waveShaper.disconnect();
    this.preGain.disconnect();
    this.postGain.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.output.disconnect();
  }

  update(params: AnyEffectParams): void {
    if (params.type !== 'distortion') return;
    
    this.params = { ...params };
    this.setCurve(params.drive, params.curveAmount);
    this.preGain.gain.value = params.drive * 10; // Pre-Drive
    this.postGain.gain.value = 1 / (params.drive * 10 || 1); // Post-Drive für Balance
    this.wetGain.gain.value = params.wet;
    this.dryGain.gain.value = 1 - params.wet;
  }

  getParams(): DistortionParams {
    return { ...this.params };
  }
}

/**
 * Compressor-Effekt
 */
export class CompressorEffect implements Effect {
  private compressor: DynamicsCompressorNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private output: GainNode;
  private params: CompressorParams;

  constructor(context: AudioContext, params: CompressorParams) {
    this.compressor = context.createDynamicsCompressor();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    this.output = context.createGain();
    this.params = { ...params };
    
    // Setze initiale Parameter
    this.update(params);
    
    // Verbinde die Knoten
    this.compressor.connect(this.wetGain);
    this.wetGain.connect(this.output);
    this.dryGain.connect(this.output);
  }

  connect(input: AudioNode, output: AudioNode): void {
    input.connect(this.dryGain);
    input.connect(this.compressor);
    this.output.connect(output);
    
    // Setze aktuelle Parameter
    this.update(this.params);
  }

  disconnect(): void {
    this.compressor.disconnect();
    this.wetGain.disconnect();
    this.dryGain.disconnect();
    this.output.disconnect();
  }

  update(params: AnyEffectParams): void {
    if (params.type !== 'compressor') return;
    
    this.params = { ...params };
    this.compressor.threshold.value = params.threshold;
    this.compressor.ratio.value = params.ratio;
    this.compressor.attack.value = params.attack;
    this.compressor.release.value = params.release;
    this.compressor.knee.value = params.knee;
    this.wetGain.gain.value = params.wet;
    this.dryGain.gain.value = 1 - params.wet;
  }

  getParams(): CompressorParams {
    return { ...this.params };
  }
}

/**
 * Effekt-Fabrik für alle unterstützten Effekttypen
 */
export class EffectFactory {
  static createEffect(context: AudioContext, params: AnyEffectParams): Effect {
    switch (params.type) {
      case 'reverb':
        return new ReverbEffect(context, params);
      case 'delay':
        return new DelayEffect(context, params);
      case 'chorus':
        return new ChorusEffect(context, params);
      case 'distortion':
        return new DistortionEffect(context, params);
      case 'compressor':
        return new CompressorEffect(context, params);
      case 'flanger':
      case 'phaser':
      case 'eq':
      case 'tremolo':
      case 'vibrato':
      case 'pitchShift':
      case 'filter':
      case 'bitcrusher':
      case 'ringModulator':
        // Andere Effekttypen würden hier implementiert werden
        console.warn(`Effekttyp ${params.type} ist noch nicht implementiert`);
        // Als Fallback: einfacher Effekt, der das Signal durchlässt
        return new PassthroughEffect(context, params);
      default:
        return new PassthroughEffect(context, params);
    }
  }
}

// Fallback-Effekt, der das Signal einfach durchlässt
class PassthroughEffect implements Effect {
  private params: AnyEffectParams;

  constructor(context: AudioContext, params: AnyEffectParams) {
    this.params = { ...params };
  }

  connect(input: AudioNode, output: AudioNode): void {
    input.connect(output);
  }

  disconnect(): void {
    // Nichts zu tun
  }

  update(params: AnyEffectParams): void {
    this.params = { ...params };
  }

  getParams(): AnyEffectParams {
    return { ...this.params };
  }
}