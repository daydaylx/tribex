/**
 * advanced-history.ts - Erweiterter History-Manager für TribeX
 * Nutzt das Command-Pattern für präzisere Undo/Redo-Operationen
 */

import { ProjectState } from './tribeX-types';
import { Command } from './command-pattern';

class AdvancedHistoryManager {
  private app: any;
  private history: Command[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 100;
  private ignoreNext: boolean = false; // Flag to avoid saving state after undo/redo
  private batchMode: boolean = false;
  private batchedCommands: Command[] = [];

  constructor(app: any, maxHistory: number = 100) {
    this.app = app;
    this.maxHistory = maxHistory;
  }

  /**
   * Fügt einen Befehl zur History hinzu und führt ihn aus
   */
  executeCommand(command: Command): void {
    if (this.ignoreNext) {
      command.execute();
      return;
    }

    if (this.batchMode) {
      // In Batch-Modus sammeln wir Befehle
      this.batchedCommands.push(command);
      command.execute();
      return;
    }

    // Entferne alle Redo-Befehle nach dem aktuellen Index
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Führe den Befehl aus und füge ihn zur History hinzu
    command.execute();
    this.history.push(command);

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift(); // Remove oldest command
      this.currentIndex = this.history.length - 1;
    } else {
      this.currentIndex = this.history.length - 1;
    }
  }

  /**
   * Startet den Batch-Modus für mehrere zusammenhängende Änderungen
   */
  startBatch(name: string = 'Batch Operation'): void {
    this.batchMode = true;
    this.batchedCommands = [];
  }

  /**
   * Beendet den Batch-Modus und fügt alle gesammelten Befehle als eine Operation hinzu
   */
  endBatch(): void {
    if (!this.batchMode) return;

    if (this.batchedCommands.length > 0) {
      const batchCommand = new (class implements Command {
        name: string;
        timestamp: number;

        constructor(name: string, private commands: Command[]) {
          this.name = name;
          this.timestamp = Date.now();
        }

        execute(): void {
          for (const cmd of this.commands) {
            cmd.execute();
          }
        }

        undo(): void {
          // In umgekehrter Reihenfolge rückgängig machen
          for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
          }
        }
      })(name, [...this.batchedCommands]);

      this.executeCommand(batchCommand);
    }

    this.batchMode = false;
    this.batchedCommands = [];
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Undo last action
   */
  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    this.ignoreNext = true; // Prevent the undo from being saved to history

    const command = this.history[this.currentIndex];
    if (command) {
      command.undo();
      
      // Update UI
      if (this.app && typeof this.app.renderAll === 'function') {
        this.app.renderAll();
      }
      
      this.currentIndex--;
    }

    this.ignoreNext = false;
    return true;
  }

  /**
   * Redo next action
   */
  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    this.ignoreNext = true; // Prevent the redo from being saved to history

    this.currentIndex++;
    const command = this.history[this.currentIndex];
    if (command) {
      command.execute();
      
      // Update UI
      if (this.app && typeof this.app.renderAll === 'function') {
        this.app.renderAll();
      }
    }

    this.ignoreNext = false;
    return true;
  }

  /**
   * Reset history (for when loading new projects)
   */
  reset(): void {
    this.history = [];
    this.currentIndex = -1;
    this.ignoreNext = false;
    this.batchMode = false;
    this.batchedCommands = [];
  }

  /**
   * Gibt die aktuelle Position in der History zurück
   */
  getCurrentPosition(): number {
    return this.currentIndex;
  }

  /**
   * Gibt die maximale Position in der History zurück
   */
  getMaxPosition(): number {
    return this.history.length - 1;
  }

  /**
   * Gibt alle verfügbaren Befehle in der History zurück
   */
  getHistory(): Command[] {
    return [...this.history];
  }

  /**
   * Gibt den aktuellen Befehl zurück
   */
  getCurrentCommand(): Command | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * Prüft, ob sich das Projekt geändert hat seit dem letzten Speichern
   */
  hasUnsavedChanges(): boolean {
    // In einer vollständigen Implementierung würde man den Anfangszustand speichern und vergleichen
    return this.history.length > 0;
  }
}

// Export for module use
export { AdvancedHistoryManager };