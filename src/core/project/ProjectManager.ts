/**
 * ProjectManager.ts - Projektverwaltung für TribeX
 * Teil des Core-Systems gemäß Roadmap
 */

import { ProjectState } from '../../types';
import { AudioEngineV2 } from '../audio-engine/AudioEngineV2';

export interface ProjectOptions {
  autoSave?: boolean;
  historySize?: number;
  backupEnabled?: boolean;
}

export class ProjectManager {
  private currentProject: ProjectState | null = null;
  private audioEngine: AudioEngineV2;
  private projectHistory: ProjectState[] = [];
  private maxHistorySize: number = 50;
  private options: ProjectOptions;

  constructor(audioEngine: AudioEngineV2, options: ProjectOptions = {}) {
    this.audioEngine = audioEngine;
    this.options = {
      autoSave: options.autoSave ?? true,
      historySize: options.historySize ?? 50,
      backupEnabled: options.backupEnabled ?? true,
    };
    this.maxHistorySize = this.options.historySize;
  }

  /**
   * Erstellt ein neues Projekt
   */
  createNewProject(name: string, bpm: number = 120): ProjectState {
    const newProject: ProjectState = {
      id: `project_${Date.now()}`,
      name: name,
      bpm: bpm,
      swing: 0,
      lengthSteps: 16,
      kit: 'tr909',
      parts: createDefaultParts(),
      patterns: [],
      chain: [],
      version: '2.0',
      master: { tilt: 0, clip: -0.3 }
    };

    // Füge ein Standard-Pattern hinzu
    const initialPattern = {
      id: `pattern_1`,
      bank: 'A',
      slot: 1,
      name: 'Init',
      steps: newProject.parts.map(part => {
        const steps = new Array(16).fill(null);
        if (part.type === 'kick') {
          steps[0] = { index: 0, on: true, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 };
          steps[4] = { index: 4, on: true, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 };
          steps[8] = { index: 8, on: true, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 };
          steps[12] = { index: 12, on: true, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 };
        }
        return steps;
      })
    };

    newProject.patterns = [initialPattern];

    this.setProject(newProject);
    return newProject;
  }

  /**
   * Setzt das aktuelle Projekt
   */
  async setProject(project: ProjectState): Promise<void> {
    // Speichere vorheriges Projekt im Verlauf
    if (this.currentProject && this.projectHistory.length < this.maxHistorySize) {
      this.projectHistory.push({ ...this.currentProject });
    } else if (this.projectHistory.length >= this.maxHistorySize) {
      this.projectHistory.shift(); // Entferne ältestes Projekt
      this.projectHistory.push({ ...this.currentProject! });
    }

    this.currentProject = project;

    // Lade das Projekt in die Audio-Engine
    await this.audioEngine.loadProject(project);
  }

  /**
   * Gibt das aktuelle Projekt zurück
   */
  getCurrentProject(): ProjectState | null {
    return this.currentProject;
  }

  /**
   * Speichert das Projekt im JSON-Format
   */
  exportProject(): string {
    if (!this.currentProject) {
      throw new Error('Kein Projekt zum Exportieren vorhanden');
    }

    return JSON.stringify(this.currentProject, null, 2);
  }

  /**
   * Lädt ein Projekt aus JSON-Format
   */
  async importProject(jsonString: string): Promise<void> {
    try {
      const project: ProjectState = JSON.parse(jsonString);
      await this.setProject(project);
    } catch (error) {
      throw new Error(`Fehler beim Importieren des Projekts: ${error.message}`);
    }
  }

  /**
   * Speichert das Projekt lokal (z.B. in localStorage oder Datei)
   */
  async saveProject(filename?: string): Promise<void> {
    if (!this.currentProject) {
      throw new Error('Kein Projekt zum Speichern vorhanden');
    }

    if (!filename) {
      filename = `${this.currentProject.name}_${this.currentProject.id}.json`;
    }

    // In einer vollständigen Implementierung würde hier das Projekt
    // tatsächlich gespeichert (z.B. in IndexedDB, localStorage oder als Datei)
    const projectData = this.exportProject();
    
    // Für den Browser speichern wir es in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`tribex_project_${filename}`, projectData);
    }
    
    console.log(`Projekt "${filename}" gespeichert`);
  }

  /**
   * Lädt ein Projekt von lokal
   */
  async loadProject(filename: string): Promise<void> {
    // In einer vollständigen Implementierung würde hier das Projekt
    // tatsächlich geladen (z.B. von IndexedDB, localStorage oder Datei)
    let projectData: string | null = null;
    
    // Versuche von localStorage zu laden
    if (typeof window !== 'undefined' && window.localStorage) {
      projectData = localStorage.getItem(`tribex_project_${filename}`);
    }
    
    if (!projectData) {
      throw new Error(`Projekt "${filename}" nicht gefunden`);
    }
    
    await this.importProject(projectData);
  }

  /**
   * Fügt ein Pattern zum Projekt hinzu
   */
  addPattern(pattern: any): void {
    if (!this.currentProject) return;
    
    if (!this.currentProject.patterns) {
      this.currentProject.patterns = [];
    }
    
    this.currentProject.patterns.push(pattern);
  }

  /**
   * Löscht ein Pattern aus dem Projekt
   */
  removePattern(patternId: string): void {
    if (!this.currentProject || !this.currentProject.patterns) return;
    
    this.currentProject.patterns = this.currentProject.patterns.filter(p => p.id !== patternId);
  }

  /**
   * Fügt ein Pattern zur Chain hinzu
   */
  addPatternToChain(patternId: string): void {
    if (!this.currentProject) return;
    
    if (!this.currentProject.chain) {
      this.currentProject.chain = [];
    }
    
    this.currentProject.chain.push({ patternId });
  }

  /**
   * Löscht ein Pattern aus der Chain
   */
  removePatternFromChain(patternId: string): void {
    if (!this.currentProject || !this.currentProject.chain) return;
    
    this.currentProject.chain = this.currentProject.chain.filter(p => p.patternId !== patternId);
  }

  /**
   * Setzt die BPM des Projekts
   */
  setBpm(bpm: number): void {
    if (!this.currentProject) return;
    
    this.currentProject.bpm = bpm;
    this.audioEngine.setBpm(bpm);
  }

  /**
   * Setzt den Swing des Projekts
   */
  setSwing(swing: number): void {
    if (!this.currentProject) return;
    
    this.currentProject.swing = swing;
  }

  /**
   * Prüft, ob es Änderungen am Projekt gibt
   */
  hasUnsavedChanges(): boolean {
    // In einer vollständigen Implementierung würde man den aktuellen Zustand
    // mit dem zuletzt gespeicherten Zustand vergleichen
    return this.currentProject !== null;
  }

  /**
   * Gibt Projektstatistiken zurück
   */
  getProjectStats(): {
    patternCount: number;
    chainLength: number;
    partCount: number;
    bpm: number;
    stepCount: number;
  } {
    if (!this.currentProject) {
      return {
        patternCount: 0,
        chainLength: 0,
        partCount: 0,
        bpm: 120,
        stepCount: 16
      };
    }

    return {
      patternCount: this.currentProject.patterns.length,
      chainLength: this.currentProject.chain.length,
      partCount: this.currentProject.parts.length,
      bpm: this.currentProject.bpm,
      stepCount: this.currentProject.lengthSteps
    };
  }

  /**
   * Gibt den Projektstatus zurück
   */
  getStatus(): {
    hasProject: boolean;
    projectName: string | null;
    projectStats: ReturnType<typeof this.getProjectStats>;
  } {
    return {
      hasProject: this.currentProject !== null,
      projectName: this.currentProject?.name || null,
      projectStats: this.getProjectStats()
    };
  }
}