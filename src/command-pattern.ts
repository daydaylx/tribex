/**
 * command-pattern.ts - Erweitertes Undo/Redo-System für TribeX
 * Implementiert das Command-Pattern für präzisere Operationen
 */

import { ProjectState, Pattern, Step, Part } from './tribeX-types';

export interface Command {
  execute(): void;
  undo(): void;
  name: string;
  timestamp: number;
}

// Basis-Befehle
export class SetStepOnCommand implements Command {
  public name: string = 'Step toggle';
  public timestamp: number;

  private previousValue: boolean;

  constructor(
    private project: ProjectState,
    private patternId: string,
    private partIndex: number,
    private stepIndex: number,
    private newValue: boolean
  ) {
    this.timestamp = Date.now();
    const pattern = project.patterns.find(p => p.id === patternId);
    if (pattern && pattern.steps[partIndex] && pattern.steps[partIndex][stepIndex]) {
      this.previousValue = pattern.steps[partIndex][stepIndex].on;
    } else {
      this.previousValue = false;
    }
  }

  execute(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern && pattern.steps[this.partIndex] && pattern.steps[this.partIndex][this.stepIndex]) {
      pattern.steps[this.partIndex][this.stepIndex].on = this.newValue;
    }
  }

  undo(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern && pattern.steps[this.partIndex] && pattern.steps[this.partIndex][this.stepIndex]) {
      pattern.steps[this.partIndex][this.stepIndex].on = this.previousValue;
    }
  }
}

export class SetStepVelocityCommand implements Command {
  public name: string = 'Step velocity change';
  public timestamp: number;

  private previousValue: number;

  constructor(
    private project: ProjectState,
    private patternId: string,
    private partIndex: number,
    private stepIndex: number,
    private newValue: number
  ) {
    this.timestamp = Date.now();
    const pattern = project.patterns.find(p => p.id === patternId);
    if (pattern && pattern.steps[partIndex] && pattern.steps[partIndex][stepIndex]) {
      this.previousValue = pattern.steps[partIndex][stepIndex].vel;
    } else {
      this.previousValue = 1;
    }
  }

  execute(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern && pattern.steps[this.partIndex] && pattern.steps[this.partIndex][this.stepIndex]) {
      pattern.steps[this.partIndex][this.stepIndex].vel = this.newValue;
    }
  }

  undo(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern && pattern.steps[this.partIndex] && pattern.steps[this.partIndex][this.stepIndex]) {
      pattern.steps[this.partIndex][this.stepIndex].vel = this.previousValue;
    }
  }
}

export class SetStepAccentCommand implements Command {
  public name: string = 'Step accent toggle';
  public timestamp: number;

  private previousValue: boolean;

  constructor(
    private project: ProjectState,
    private patternId: string,
    private partIndex: number,
    private stepIndex: number,
    private newValue: boolean
  ) {
    this.timestamp = Date.now();
    const pattern = project.patterns.find(p => p.id === patternId);
    if (pattern && pattern.steps[partIndex] && pattern.steps[partIndex][stepIndex]) {
      this.previousValue = pattern.steps[partIndex][stepIndex].accent;
    } else {
      this.previousValue = false;
    }
  }

  execute(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern && pattern.steps[this.partIndex] && pattern.steps[this.partIndex][this.stepIndex]) {
      pattern.steps[this.partIndex][this.stepIndex].accent = this.newValue;
    }
  }

  undo(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern && pattern.steps[this.partIndex] && pattern.steps[this.partIndex][this.stepIndex]) {
      pattern.steps[this.partIndex][this.stepIndex].accent = this.previousValue;
    }
  }
}

export class SetStepProbabilityCommand implements Command {
  public name: string = 'Step probability change';
  public timestamp: number;

  private previousValue: number;

  constructor(
    private project: ProjectState,
    private patternId: string,
    private partIndex: number,
    private stepIndex: number,
    private newValue: number
  ) {
    this.timestamp = Date.now();
    const pattern = project.patterns.find(p => p.id === patternId);
    if (pattern && pattern.steps[partIndex] && pattern.steps[partIndex][stepIndex]) {
      this.previousValue = pattern.steps[partIndex][stepIndex].prob;
    } else {
      this.previousValue = 1;
    }
  }

  execute(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern && pattern.steps[this.partIndex] && pattern.steps[this.partIndex][this.stepIndex]) {
      pattern.steps[this.partIndex][this.stepIndex].prob = this.newValue;
    }
  }

  undo(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern && pattern.steps[this.partIndex] && pattern.steps[this.partIndex][this.stepIndex]) {
      pattern.steps[this.partIndex][this.stepIndex].prob = this.previousValue;
    }
  }
}

export class SetPatternNameCommand implements Command {
  public name: string = 'Pattern name change';
  public timestamp: number;

  private previousValue: string;

  constructor(
    private project: ProjectState,
    private patternId: string,
    private newName: string
  ) {
    this.timestamp = Date.now();
    const pattern = project.patterns.find(p => p.id === patternId);
    this.previousValue = pattern ? pattern.name : '';
  }

  execute(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern) {
      pattern.name = this.newName;
    }
  }

  undo(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern) {
      pattern.name = this.previousValue;
    }
  }
}

export class SetTempoCommand implements Command {
  public name: string = 'Tempo change';
  public timestamp: number;

  private previousValue: number;

  constructor(
    private project: ProjectState,
    private newTempo: number
  ) {
    this.timestamp = Date.now();
    this.previousValue = project.bpm;
  }

  execute(): void {
    this.project.bpm = this.newTempo;
  }

  undo(): void {
    this.project.bpm = this.previousValue;
  }
}

export class SetSwingCommand implements Command {
  public name: string = 'Swing change';
  public timestamp: number;

  private previousValue: number;

  constructor(
    private project: ProjectState,
    private newSwing: number
  ) {
    this.timestamp = Date.now();
    this.previousValue = project.swing;
  }

  execute(): void {
    this.project.swing = this.newSwing;
  }

  undo(): void {
    this.project.swing = this.previousValue;
  }
}

// Komplexe Befehle
export class ClearPatternCommand implements Command {
  public name: string = 'Clear pattern';
  public timestamp: number;

  private previousSteps: Step[][] = [];

  constructor(
    private project: ProjectState,
    private patternId: string
  ) {
    this.timestamp = Date.now();
    const pattern = project.patterns.find(p => p.id === patternId);
    if (pattern) {
      // Tiefes Klonen der vorherigen Schritte
      this.previousSteps = JSON.parse(JSON.stringify(pattern.steps));
    }
  }

  execute(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern) {
      pattern.steps.forEach(row => {
        row.forEach((step, index) => {
          Object.assign(step, this.createEmptyStep(index));
        });
      });
    }
  }

  undo(): void {
    const pattern = this.project.patterns.find(p => p.id === this.patternId);
    if (pattern && this.previousSteps.length > 0) {
      pattern.steps = JSON.parse(JSON.stringify(this.previousSteps));
    }
  }

  private createEmptyStep(index: number): Step {
    return {
      index,
      on: false,
      vel: 1,
      accent: false,
      prob: 1,
      ratchet: 1,
      microMs: 0,
      note: 60,
      detune: 0
    };
  }
}

export class AddPatternToChainCommand implements Command {
  public name: string = 'Add pattern to chain';
  public timestamp: number;

  private chainIndex: number | null = null;

  constructor(
    private project: ProjectState,
    private patternId: string
  ) {
    this.timestamp = Date.now();
  }

  execute(): void {
    // Finde den Index, an dem das Pattern eingefügt wird (am Ende)
    this.chainIndex = this.project.chain.length;
    this.project.chain.push({ patternId: this.patternId });
  }

  undo(): void {
    if (this.chainIndex !== null && this.chainIndex < this.project.chain.length) {
      this.project.chain.splice(this.chainIndex, 1);
    }
  }
}

export class CompositeCommand implements Command {
  public name: string = 'Multiple changes';
  public timestamp: number;

  constructor(
    private commands: Command[],
    customName?: string
  ) {
    this.timestamp = Date.now();
    if (customName) {
      this.name = customName;
    }
  }

  execute(): void {
    for (const command of this.commands) {
      command.execute();
    }
  }

  undo(): void {
    // Rückgängig machen in umgekehrter Reihenfolge
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}