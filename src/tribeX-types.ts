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