/**
 * MotionEngine.ts - Motion Sequencing für TribeX
 * Teil des Core-Systems gemäß Roadmap
 * Parameter-Automation für alle Synth-Parameter
 */

import { MotionPoint, ParamId } from '../../types';

export interface MotionTarget {
  partId: string;
  paramId: ParamId;
}

export class MotionEngine {
  private activeRecordings: Map<string, MotionPoint[]> = new Map(); // partId-paramId als Key
  private motionData: Map<string, MotionPoint[]> = new Map(); // partId-paramId als Key
  private isRecording: boolean = false;
  private recordingTarget: MotionTarget | null = null;
  private startTime: number | null = null;

  /**
   * Startet die Aufnahme von Motion-Daten
   */
  startRecording(target: MotionTarget, startTime: number): void {
    this.recordingTarget = target;
    this.startTime = startTime;
    this.isRecording = true;
    
    const key = `${target.partId}-${target.paramId}`;
    
    // Leere vorhandene Aufnahme, wenn vorhanden
    this.activeRecordings.set(key, []);
  }

  /**
   * Stoppt die Aufnahme von Motion-Daten
   */
  stopRecording(): MotionPoint[] | null {
    if (!this.recordingTarget || !this.startTime) {
      this.isRecording = false;
      return null;
    }

    const key = `${this.recordingTarget.partId}-${this.recordingTarget.paramId}`;
    const recording = this.activeRecordings.get(key);
    
    if (recording) {
      // Speichere die Aufnahme dauerhaft
      this.motionData.set(key, [...recording]);
      this.activeRecordings.delete(key);
    }
    
    this.isRecording = false;
    this.recordingTarget = null;
    this.startTime = null;
    
    return recording || null;
  }

  /**
   * Nimmt einen Motion-Point auf
   */
  recordPoint(time: number, value: number, interpolation: 'linear' | 'step' | 'spline' = 'linear'): void {
    if (!this.isRecording || !this.recordingTarget || this.startTime === null) {
      return;
    }

    const relativeTime = time - this.startTime;
    const point: MotionPoint = {
      timeBeats: relativeTime, // In Beats umgerechnet
      value: value,
      interp: interpolation
    };

    const key = `${this.recordingTarget.partId}-${this.recordingTarget.paramId}`;
    let recording = this.activeRecordings.get(key);

    if (!recording) {
      recording = [];
      this.activeRecordings.set(key, recording);
    }

    recording.push(point);
  }

  /**
   * Fügt einen Motion-Point hinzu (für manuelle Eingabe)
   */
  addPoint(target: MotionTarget, point: MotionPoint): void {
    const key = `${target.partId}-${target.paramId}`;
    let points = this.motionData.get(key);

    if (!points) {
      points = [];
      this.motionData.set(key, points);
    }

    // Füge den Punkt ein und sortiere nach Zeit
    points.push(point);
    points.sort((a, b) => a.timeBeats - b.timeBeats);
  }

  /**
   * Löscht alle Motion-Points für ein Target
   */
  clearMotion(target: MotionTarget): void {
    const key = `${target.partId}-${target.paramId}`;
    this.motionData.delete(key);
    this.activeRecordings.delete(key);
  }

  /**
   * Löscht alle Motion-Daten
   */
  clearAll(): void {
    this.motionData.clear();
    this.activeRecordings.clear();
    this.isRecording = false;
    this.recordingTarget = null;
    this.startTime = null;
  }

  /**
   * Holt alle Motion-Points für ein Target
   */
  getPoints(target: MotionTarget): MotionPoint[] {
    const key = `${target.partId}-${target.paramId}`;
    const storedPoints = this.motionData.get(key) || [];
    const recordingPoints = this.activeRecordings.get(key) || [];
    
    // Kombiniere gespeicherte und aktuell aufgenommene Points
    return [...storedPoints, ...recordingPoints].sort((a, b) => a.timeBeats - b.timeBeats);
  }

  /**
   * Setzt alle Motion-Points für ein Target
   */
  setPoints(target: MotionTarget, points: MotionPoint[]): void {
    const key = `${target.partId}-${target.paramId}`;
    // Sortiere Punkte nach Zeit
    const sortedPoints = [...points].sort((a, b) => a.timeBeats - b.timeBeats);
    this.motionData.set(key, sortedPoints);
  }

  /**
   * Interpoliert einen Wert basierend auf den Motion-Points
   */
  getValueAtTime(target: MotionTarget, time: number): number | null {
    const points = this.getPoints(target);
    
    if (points.length === 0) {
      return null;
    }
    
    // Wenn nur ein Punkt vorhanden ist, gib dessen Wert zurück
    if (points.length === 1) {
      return points[0].value;
    }
    
    // Suche den relevanten Zeitbereich
    let prevPoint: MotionPoint | null = null;
    let nextPoint: MotionPoint | null = null;
    
    for (let i = 0; i < points.length; i++) {
      if (points[i].timeBeats <= time) {
        prevPoint = points[i];
      }
      if (points[i].timeBeats >= time) {
        nextPoint = points[i];
        break;
      }
    }
    
    // Wenn der Zeitpunkt vor dem ersten Punkt liegt, gib den ersten Wert zurück
    if (!prevPoint) {
      return points[0].value;
    }
    
    // Wenn der Zeitpunkt nach dem letzten Punkt liegt, gib den letzten Wert zurück
    if (!nextPoint) {
      return points[points.length - 1].value;
    }
    
    // Interpoliere zwischen den Punkten basierend auf dem Interpolationstyp
    if (prevPoint === nextPoint) {
      return prevPoint.value;
    }
    
    const timeDiff = nextPoint.timeBeats - prevPoint.timeBeats;
    const timeOffset = time - prevPoint.timeBeats;
    const ratio = timeDiff !== 0 ? timeOffset / timeDiff : 0;
    
    if (prevPoint.interp === 'step') {
      return prevPoint.value;
    } else {
      // Lineare Interpolation
      return prevPoint.value + (nextPoint.value - prevPoint.value) * ratio;
    }
  }

  /**
   * Quantisiert einen Motion-Value
   */
  quantizeValue(value: number, steps: number = 128): number {
    return Math.round(value * steps) / steps;
  }

  /**
   * Quantisiert eine Motion-Time
   */
  quantizeTime(time: number, beatDivision: number = 16): number {
    const beatFraction = 1 / beatDivision;
    return Math.round(time / beatFraction) * beatFraction;
  }

  /**
   * Prüft, ob eine Aufnahme aktiv ist
   */
  isRecordingForTarget(target: MotionTarget): boolean {
    return this.isRecording && 
           this.recordingTarget?.partId === target.partId && 
           this.recordingTarget?.paramId === target.paramId;
  }

  /**
   * Prüft, ob Motion-Daten für ein Target vorhanden sind
   */
  hasMotionData(target: MotionTarget): boolean {
    const key = `${target.partId}-${target.paramId}`;
    return this.motionData.has(key) && this.motionData.get(key)!.length > 0;
  }

  /**
   * Gibt den Aufnahmezustand zurück
   */
  getRecordingState(): {
    isRecording: boolean;
    target: MotionTarget | null;
  } {
    return {
      isRecording: this.isRecording,
      target: this.recordingTarget
    };
  }
}