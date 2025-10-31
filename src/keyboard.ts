/**
 * keyboard.ts - Tastatur-Handler für TribeX
 * Implementiert Tastaturkürzel für verbesserte Workflow
 */

import { HistoryManager } from './history';

class KeyboardHandler {
  private app: any;
  private shortcuts: Map<string, ShortcutConfig>;

  constructor(app: any) {
    this.app = app;
    this.shortcuts = new Map();
    this.init();
  }

  private init(): void {
    // Transport shortcuts
    this.addShortcut('Space', () => this.togglePlay(), 'Transport: Play/Pause');
    this.addShortcut('KeyK', () => this.togglePlay(), 'Transport: Play/Pause (Alternative)');
    
    // Tempo shortcuts
    this.addShortcut('ArrowUp', () => this.adjustTempo(5), 'Tempo: Increase by 5 BPM');
    this.addShortcut('ArrowDown', () => this.adjustTempo(-5), 'Tempo: Decrease by 5 BPM');
    

    
    // Pattern shortcuts
    this.addShortcut('KeyR', () => this.randomizePattern(), 'Pattern: Randomize current pattern');
    this.addShortcut('KeyC', () => this.clearPattern(), 'Pattern: Clear current pattern');
    
    // Project shortcuts
    this.addShortcut('KeyS', (e: KeyboardEvent) => {
      e.preventDefault();
      this.app.saveProject();
    }, 'Project: Save current project', { ctrl: true });
    
    this.addShortcut('KeyZ', (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey) {
          // Redo
          this.redo();
        } else {
          // Undo
          this.undo();
        }
      }
    }, 'Edit: Undo/Redo', { ctrl: true });
    
    // Metronome shortcut
    this.addShortcut('KeyM', () => {
      this.toggleMetronome();
    }, 'Metronome: Toggle on/off');
    
    // Add the event listener
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private addShortcut(key: string, callback: (event?: KeyboardEvent) => void, description: string, options: ShortcutOptions = {}): void {
    const shortcut: ShortcutConfig = {
      key,
      callback,
      description,
      ctrl: options.ctrl || false,
      shift: options.shift || false,
      alt: options.alt || false
    };
    
    this.shortcuts.set(key, shortcut);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Don't intercept keys when focused on inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement || 
        event.target instanceof HTMLSelectElement) {
      return;
    }

    const shortcut = this.shortcuts.get(event.code);
    
    if (shortcut) {
      const matchesCtrl = shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const matchesShift = shortcut.shift === event.shiftKey;
      const matchesAlt = shortcut.alt === event.altKey;
      
      if (matchesCtrl && matchesShift && matchesAlt) {
        event.preventDefault();
        shortcut.callback(event);
      }
    }
  }

  private togglePlay(): void {
    const playButton = document.getElementById('btn-play');
    if (playButton) {
      playButton.click();
    }
  }

  private adjustTempo(delta: number): void {
    const tempoInput = document.getElementById('tempo') as HTMLInputElement;
    if (tempoInput) {
      let newValue = parseInt(tempoInput.value) + delta;
      // Constrain to valid range
      newValue = Math.max(130, Math.min(200, newValue));
      tempoInput.value = newValue.toString();
      
      // Trigger change event to update the UI
      tempoInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Also trigger input event for real-time updates
      tempoInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Update status display
      const statusValue = document.getElementById('status-bpm-value');
      if (statusValue) {
        statusValue.textContent = newValue.toString();
      }
    }
  }



  private randomizePattern(): void {
    // Placeholder - would implement pattern randomization logic
    console.log('Randomizing current pattern...');
    // In a real implementation, this would call the app's pattern randomization function
  }

  private clearPattern(): void {
    const clearButton = document.getElementById('btn-pattern-clear');
    if (clearButton) {
      clearButton.click();
    }
  }

  private undo(): void {
    if (window.app && window.app.historyManager) {
      const success = window.app.historyManager.undo();
      if (success) {
        console.log('Undo successful');
      } else {
        console.log('Nothing to undo');
      }
    } else {
      console.log('History manager not available');
    }
  }

  private redo(): void {
    if (window.app && window.app.historyManager) {
      const success = window.app.historyManager.redo();
      if (success) {
        console.log('Redo successful');
      } else {
        console.log('Nothing to redo');
      }
    } else {
      console.log('History manager not available');
    }
  }

  private toggleMetronome(): void {
    if (window.app && window.app.metronome) {
      const isEnabled = window.app.metronome.toggle();
      console.log(isEnabled ? 'Metronome aktiviert' : 'Metronome deaktiviert');
      // Could update UI to show metronome status
    } else {
      console.log('Metronome not available');
    }
  }

  // Method to get all available shortcuts for display in UI
  getShortcuts(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }
}

// Typdefinitionen
interface ShortcutOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

interface ShortcutConfig {
  key: string;
  callback: (event?: KeyboardEvent) => void;
  description: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

// Export for module use
export { KeyboardHandler };