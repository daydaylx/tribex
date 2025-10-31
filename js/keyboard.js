/**
 * Keyboard shortcut handler for TribeX
 * Implements common keyboard shortcuts for improved workflow
 */

class KeyboardHandler {
  constructor(app) {
    this.app = app;
    this.shortcuts = new Map();
    this.init();
  }

  init() {
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
    this.addShortcut('KeyS', (e) => {
      e.preventDefault();
      this.app.saveProject();
    }, 'Project: Save current project', { ctrl: true });
    
    this.addShortcut('KeyZ', (e) => {
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

  addShortcut(key, callback, description, options = {}) {
    const shortcut = {
      key,
      callback,
      description,
      ctrl: options.ctrl || false,
      shift: options.shift || false,
      alt: options.alt || false
    };
    
    this.shortcuts.set(key, shortcut);
  }

  toggleMetronome() {
    if (window.app && window.app.metronome) {
      const isEnabled = window.app.metronome.toggle();
      console.log(isEnabled ? 'Metronom aktiviert' : 'Metronom deaktiviert');
      // Could update UI to show metronome status
    } else {
      console.log('Metronome not available');
    }
  }

  handleKeyDown(event) {
    // Don't intercept keys when focused on inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
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

  togglePlay() {
    const playButton = document.getElementById('btn-play');
    if (playButton) {
      playButton.click();
    }
  }

  adjustTempo(delta) {
    const tempoInput = document.getElementById('tempo');
    if (tempoInput) {
      let newValue = parseInt(tempoInput.value) + delta;
      // Constrain to valid range
      newValue = Math.max(130, Math.min(200, newValue));
      tempoInput.value = newValue;
      
      // Trigger change event to update the UI
      const changeEvent = new Event('change', { bubbles: true });
      tempoInput.dispatchEvent(changeEvent);
      
      // Also trigger input event for real-time updates
      const inputEvent = new Event('input', { bubbles: true });
      tempoInput.dispatchEvent(inputEvent);
      
      // Update status display
      const statusValue = document.getElementById('status-bpm-value');
      if (statusValue) {
        statusValue.textContent = newValue;
      }
    }
  }



  randomizePattern() {
    // Placeholder - would implement pattern randomization logic
    console.log('Randomizing current pattern...');
    // In a real implementation, this would call the app's pattern randomization function
  }

  clearPattern() {
    const clearButton = document.getElementById('btn-pattern-clear');
    if (clearButton) {
      clearButton.click();
    }
  }

  undo() {
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

  redo() {
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

  // Method to get all available shortcuts for display in UI
  getShortcuts() {
    return Array.from(this.shortcuts.values());
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KeyboardHandler };
} else {
  window.KeyboardHandler = KeyboardHandler;
}