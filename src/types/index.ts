// Zentrale Typdefinitionen für TribeX gemäß Roadmap
// Diese Datei exportiert alle wichtigen Typen für das Projekt

import { 
  ProjectState, 
  Part, 
  Pattern, 
  Step, 
  MotionPoint, 
  AppState, 
  UIElements,
  MasterSettings,
  PartParams,
  MixerSettings,
  SynthSettings,
  ChainEntry
} from '../tribeX-types';

// Weitere spezifische Typen für die neuen Module

// Sampler-Typen
export interface Sample {
  id: string;
  name: string;
  path: string;
  type: 'one-shot' | 'pitched' | 'time-stretched' | 'time-sliced';
  duration: number;
  sampleRate: number;
  channels: number;
  isLoaded: boolean;
}

export interface Slice {
  id: string;
  start: number;
  end: number;
  name?: string;
}

// Synthesizer-Typen (MMT - Multi Modeling Technology)
export interface SynthVoice {
  id: string;
  oscillatorType: 'sawtooth' | 'square' | 'sine' | 'triangle' | 'wavetable';
  filterType: 'lowpass' | 'highpass' | 'bandpass' | 'bandpass-plus';
  adsr: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  lfo: {
    rate: number;
    depth: number;
    target: 'pitch' | 'filter' | 'amplitude';
  };
}

// Effekt-Typen
export type EffectType = 
  'reverb' | 'delay' | 'chorus' | 'flanger' | 'phaser' | 
  'bitcrusher' | 'compressor' | 'limiter' | 'eq' | 'distortion' | 'valve';

export interface Effect {
  id: string;
  type: EffectType;
  params: Record<string, number>;
  enabled: boolean;
}

// Export aller Haupttypen
export {
  ProjectState,
  Part,
  Pattern,
  Step,
  MotionPoint,
  AppState,
  UIElements,
  MasterSettings,
  PartParams,
  MixerSettings,
  SynthSettings,
  ChainEntry,
  Sample,
  Slice,
  SynthVoice,
  Effect,
  EffectType
};