/**
 * history.ts - Erweitertes History-Management für TribeX
 * Erweitert das bestehende System mit spezifischen Befehlen
 */

import { ProjectState } from './tribeX-types';

export interface HistoryCommand {
  execute: (project: ProjectState) => void;
  undo: (project: ProjectState) => void;
  name: string;
}

class HistoryManager {
  private app: any;
  private history: ProjectState[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 50;
  private ignoreNext: boolean = false; // Flag to avoid saving state after undo/redo

  constructor(app: any, maxHistory: number = 50) {
    this.app = app;
    this.maxHistory = maxHistory;
  }

  // Save current project state to history
  saveState(): void {
    if (this.ignoreNext) {
      this.ignoreNext = false;
      return;
    }

    // Remove any redo states that are after current index
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add current project state to history
    const currentState: ProjectState = JSON.parse(JSON.stringify(this.app.state.project));
    this.history.push(currentState);

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift(); // Remove oldest state
      this.currentIndex = this.history.length - 1;
    } else {
      this.currentIndex = this.history.length - 1;
    }
  }

  // Check if undo is available
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  // Check if redo is available
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  // Undo last action
  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    this.currentIndex--;
    this.ignoreNext = true; // Prevent the undo from being saved to history
    
    // Restore project state
    const stateToRestore: ProjectState = JSON.parse(JSON.stringify(this.history[this.currentIndex]));
    this.app.state.project = stateToRestore;
    
    // Update UI
    this.app.setCurrentPattern(this.app.state.project.patterns[0].id);
    this.app.renderAll();
    
    return true;
  }

  // Redo next action
  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    this.currentIndex++;
    this.ignoreNext = true; // Prevent the redo from being saved to history
    
    // Restore project state
    const stateToRestore: ProjectState = JSON.parse(JSON.stringify(this.history[this.currentIndex]));
    this.app.state.project = stateToRestore;
    
    // Update UI
    this.app.setCurrentPattern(this.app.state.project.patterns[0].id);
    this.app.renderAll();
    
    return true;
  }

  // Reset history (for when loading new projects)
  reset(): void {
    this.history = [];
    this.currentIndex = -1;
    this.ignoreNext = false;
  }

  // New: Execute and record a specific command
  executeCommand(command: HistoryCommand): void {
    // Execute the command
    command.execute(this.app.state.project);
    
    // Save the before state
    const beforeState: ProjectState = JSON.parse(JSON.stringify(this.app.state.project));
    
    // Execute the command
    command.execute(this.app.state.project);
    
    // Save to history
    if (!this.ignoreNext) {
      this.history = this.history.slice(0, this.currentIndex + 1);
      this.history.push(JSON.parse(JSON.stringify(this.app.state.project)));
      
      if (this.history.length > this.maxHistory) {
        this.history.shift();
        this.currentIndex = this.history.length - 1;
      } else {
        this.currentIndex = this.history.length - 1;
      }
    }
  }
}

// Export for module use
export { HistoryManager };