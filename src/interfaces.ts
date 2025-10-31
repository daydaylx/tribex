// interfaces.ts - TypeScript Interfaces für die bestehenden Klassen

import { ProjectState, Pattern, Part, MotionPoint, PartType, ParamId } from './tribeX-types';

export interface Router {
  init(): void;
  navigate(route: string): void;
}

export interface Page {
  render(container: HTMLElement): void;
  destroy?(): void;
}

export interface Sequencer {
  initClock(): Promise<void>;
  on(event: string, callback: (data: any) => void): void;
  setProject(project: ProjectState): void;
  setPattern(pattern: Pattern): void;
  setChain(chain: any[]): void;
  setBpm(bpm: number): void;
  setSwing(percent: number): void;
  setStepLength(length: number): void;
  start(): void;
  stop(): void;
  getCurrentStep(): number;
}

export interface Mixer {
  updatePart(partId: string, settings: any): void;
  setMasterTilt(tilt: number): void;
  setMasterClip(clip: number): void;
}

export interface SampleEngine {
  loadKit(kit: string, progressCallback?: (progress: number) => void): Promise<void>;
  play(part: Part, step: any, time: number, velocity: number): void;
}

export interface MotionEngine {
  setMotion(partId: string, paramId: ParamId, points: MotionPoint[]): void;
  getPoints(partId: string, paramId: ParamId): MotionPoint[];
  addPoint(partId: string, paramId: ParamId, point: MotionPoint): void;
  clearPart(partId: string): void;
  valueAt(partId: string, paramId: ParamId, timeBeats: number): number | null;
  quantizeValue(value: number, steps?: number): number;
  quantizeTime(time: number, beatDivision?: number): number;
}

export interface KeyboardHandler {
  constructor(app: any): void;
}

export interface HistoryManager {
  saveState(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): boolean;
  redo(): boolean;
  reset(): void;
}

export interface Timeline {
  render(): void;
  updateForCurrentStep(stepIndex: number): void;
  highlightCurrentPattern(): void;
}

export interface Metronome {
  toggle(): boolean;
  setTempo(bpm: number): void;
  start(): void;
  stop(): void;
  syncWithSequencer(): void;
}