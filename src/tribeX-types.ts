// tribeX-types.ts - Grundlegende Typdefinitionen für TribeX

// Zustands-Typen
export interface ProjectState {
  id: string;
  name: string;
  bpm: number;
  swing: number;
  lengthSteps: number;
  kit: string;
  parts: Part[];
  patterns: Pattern[];
  chain: ChainEntry[];
  version: string;
  master: MasterSettings;
}

export interface MasterSettings {
  tilt: number;
  clip: number;
}

export interface Part {
  id: string;
  name: string;
  type: 'sample' | 'synth';
  samplePath?: string;
  params: PartParams;
  mixer: MixerSettings;
  synth?: SynthSettings;
  motion: MotionPoint[];
}

export interface PartParams {
  cutoff: number;
  resonance: number;
}

export interface MixerSettings {
  pan: number;
  level: number;
  lp: number;
  hp: number;
  send: {
    reverb: number;
    delay: number;
  };
}

export interface SynthSettings {
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
  cutoff: number;
  resonance: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  lfoRate: number;
  lfoDepth: number;
  glide: number;
}

export interface Pattern {
  id: string;
  bank: string;
  slot: number;
  name: string;
  steps: Step[][];
}

export interface Step {
  index: number;
  on: boolean;
  vel: number;
  accent: boolean;
  prob: number;
  ratchet: number;
  microMs: number;
  note: number;
  detune: number;
}

export interface ChainEntry {
  patternId: string;
}

export interface MotionPoint {
  timeBeats: number;
  value: number;
  interp: string;
}

// Zustandstypen für die Anwendung
export interface AppState {
  project: ProjectState | null;
  audioContext: AudioContext | null;
  mixer: Mixer | null;
  engine: SampleEngine | null;
  sequencer: Sequencer | null;
  motion: MotionEngine | null;
  currentPatternId: string | null;
  currentBank: string;
  selectedStep: { partIndex: number; stepIndex: number } | null;
  motionTarget: { partId: string; paramId: string } | null;
  motionRecord: boolean;
  audioReady: boolean;
}

// UI-Elemente Typen
export interface UIElements {
  btnPlay?: HTMLElement;
  btnStop?: HTMLElement;
  tempo?: HTMLInputElement;
  swing?: HTMLInputElement;
  swingValue?: HTMLElement;
  stepLength?: HTMLSelectElement;
  kit?: HTMLSelectElement;
  btnSaveProject?: HTMLElement;
  btnLoadProject?: HTMLElement;
  btnNewProject?: HTMLElement;
  patternList?: HTMLElement;
  patternBank?: HTMLSelectElement;
  btnPatternSave?: HTMLElement;
  btnPatternClear?: HTMLElement;
  chainList?: HTMLElement;
  btnChainAdd?: HTMLElement;
  btnChainClear?: HTMLElement;
  stepGrid?: HTMLElement;
  stepDetail?: HTMLElement;
  accentToggle?: HTMLInputElement;
  probToggle?: HTMLInputElement;
  ratchetToggle?: HTMLInputElement;
  microToggle?: HTMLInputElement;
  mixer?: HTMLElement;
  masterTilt?: HTMLInputElement;
  masterClip?: HTMLInputElement;
  motionTarget?: HTMLSelectElement;
  motionLanes?: HTMLElement;
  btnMotionRecord?: HTMLElement;
  btnMotionClear?: HTMLElement;
  btnMotionAdd?: HTMLElement;
  motionTime?: HTMLInputElement;
  motionValue?: HTMLInputElement;
  motionInterp?: HTMLSelectElement;
  btnExport?: HTMLElement;
  exportBars?: HTMLInputElement;
  exportStatus?: HTMLElement;
  statusBpm?: HTMLElement;
  statusSteps?: HTMLElement;
  statusKit?: HTMLElement;
  statusChain?: HTMLElement;
}

// Callback-Typen
export type SequencerCallback = (data: any) => void;
export type SequencerCallbacks = {
  [key: string]: SequencerCallback;
};

// Allgemeine Hilfstypen
export type PartType = 'sample' | 'synth';
export type ParamId = 'cutoff' | 'resonance' | 'attack' | 'decay' | 'sustain' | 'release' | 'lfoRate' | 'lfoDepth' | 'glide';

// Funktion zur Erstellung von Standard-Parts
export function createDefaultParts() {
  const kit = KIT_PRESETS.tr909;
  return DEFAULT_PARTS.map((part, index) => {
    const sampleKey = part.sampleKey;
    const sampleFile = sampleKey ? kit.samples[sampleKey] : null;
    return {
      id: part.id,
      name: part.name,
      type: part.type,
      sampleKey,
      samplePath: sampleFile ? `${kit.root}${sampleFile}` : null,
      mixer: { ...defaultMixerSettings(), gain: part.type === 'bass' ? 0.7 : part.type === 'synth' ? 0.6 : 0.8 },
      params: defaultParams(),
      motion: emptyMotion(),
      synth: part.type === 'synth' ? createDefaultSynthSettings() : undefined
    };
  });
}

export const KIT_PRESETS = {
  tr909: {
    name: 'Roland TR-909',
    root: 'assets/kits/909/',
    samples: {
      kick: 'kick.wav',
      snare: 'snare.wav',
      clap: 'clap.wav',
      rim: 'rim.wav',
      tomLow: 'tom-low.wav',
      tomMid: 'tom-mid.wav',
      tomHigh: 'tom-high.wav',
      clhh: 'closed-hat.wav',
      ophh: 'open-hat.wav',
      crash: 'crash.wav',
      bass: 'bass.wav'
    }
  }
};

export const DEFAULT_PARTS = [
  { id: 'part-kick', name: 'Kick', type: 'kick', sampleKey: 'kick' },
  { id: 'part-snare', name: 'Snare', type: 'snare', sampleKey: 'snare' },
  { id: 'part-clap', name: 'Clap', type: 'perc', sampleKey: 'clap' },
  { id: 'part-rim', name: 'Rim', type: 'perc', sampleKey: 'rim' },
  { id: 'part-tom-low', name: 'Tom Low', type: 'perc', sampleKey: 'tomLow' },
  { id: 'part-tom-mid', name: 'Tom Mid', type: 'perc', sampleKey: 'tomMid' },
  { id: 'part-tom-high', name: 'Tom High', type: 'perc', sampleKey: 'tomHigh' },
  { id: 'part-clhh', name: 'Closed Hat', type: 'clhh', sampleKey: 'clhh' },
  { id: 'part-ophh', name: 'Open Hat', type: 'ophh', sampleKey: 'ophh' },
  { id: 'part-crash', name: 'Crash', type: 'perc', sampleKey: 'crash' },
  { id: 'part-bass', name: 'Bass', type: 'bass', sampleKey: 'bass' },
  { id: 'part-synth', name: 'Synthezic', type: 'synth', sampleKey: null }
];

function defaultMixerSettings() {
  return {
    gain: 0.8,
    pan: 0,
    hp: 20,
    lp: 20000,
    drive: 0
  };
}

function defaultParams() {
  return {
    cutoff: 20000,
    resonance: 0,
    start: 0,
    end: 1
  };
}

function emptyMotion() {
  return [];
}

function createDefaultSynthSettings() {
  return {
    waveform: 'sawtooth' as const,
    attack: 0.01,
    decay: 0.18,
    sustain: 0.75,
    release: 0.35,
    cutoff: 2200,
    resonance: 0.2,
    glide: 0,
    lfoRate: 0,
    lfoDepth: 0
  };
}