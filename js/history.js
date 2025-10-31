/**
 * Simple undo/redo manager for TribeX
 * Manages project state history for undo/redo functionality
 */

class HistoryManager {
  constructor(app, maxHistory = 50) {
    this.app = app;
    this.history = [];
    this.currentIndex = -1;
    this.maxHistory = maxHistory;
    this.ignoreNext = false; // Flag to avoid saving state after undo/redo
  }

  // Save current project state to history
  saveState() {
    if (this.ignoreNext) {
      this.ignoreNext = false;
      return;
    }

    // Remove any redo states that are after current index
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add current project state to history
    const currentState = JSON.parse(JSON.stringify(this.app.state.project));
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
  canUndo() {
    return this.currentIndex > 0;
  }

  // Check if redo is available
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  // Undo last action
  undo() {
    if (!this.canUndo()) {
      return false;
    }

    this.currentIndex--;
    this.ignoreNext = true; // Prevent the undo from being saved to history
    
    // Restore project state
    const stateToRestore = this.history[this.currentIndex];
    this.app.state.project = JSON.parse(JSON.stringify(stateToRestore));
    
    // Update UI
    this.app.setCurrentPattern(this.app.state.project.patterns[0].id);
    this.app.renderAll();
    
    return true;
  }

  // Redo next action
  redo() {
    if (!this.canRedo()) {
      return false;
    }

    this.currentIndex++;
    this.ignoreNext = true; // Prevent the redo from being saved to history
    
    // Restore project state
    const stateToRestore = this.history[this.currentIndex];
    this.app.state.project = JSON.parse(JSON.stringify(stateToRestore));
    
    // Update UI
    this.app.setCurrentPattern(this.app.state.project.patterns[0].id);
    this.app.renderAll();
    
    return true;
  }

  // Reset history (for when loading new projects)
  reset() {
    this.history = [];
    this.currentIndex = -1;
    this.ignoreNext = false;
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HistoryManager };
} else {
  window.HistoryManager = HistoryManager;
}