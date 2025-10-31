/**
 * Timeline component for TribeX
 * Visualizes the chain sequence with pattern arrangement
 */

class Timeline {
  constructor(container, app) {
    this.container = container;
    this.app = app;
    this.element = null;
    this.patternElements = [];
    this.init();
  }

  init() {
    this.createTimelineElement();
    this.render();
  }

  createTimelineElement() {
    this.element = document.createElement('div');
    this.element.className = 'timeline';
    this.element.innerHTML = `
      <div class="timeline-header">
        <h3>Timeline</h3>
        <div class="timeline-controls">
          <button id="btn-timeline-add" class="btn">Pattern hinzufügen</button>
          <button id="btn-timeline-clear" class="btn danger">Leeren</button>
        </div>
      </div>
      <div class="timeline-chain" id="timeline-chain"></div>
    `;
    this.container.appendChild(this.element);

    // Add event listeners for timeline controls
    document.getElementById('btn-timeline-add')?.addEventListener('click', () => {
      this.addCurrentPatternToChain();
    });
    
    document.getElementById('btn-timeline-clear')?.addEventListener('click', () => {
      this.clearChain();
    });
  }

  render() {
    const chainContainer = document.getElementById('timeline-chain');
    if (!chainContainer) return;

    // Clear existing elements
    chainContainer.innerHTML = '';

    const project = this.app.state.project;
    if (!project || !project.chain) return;

    // Create visual representation of each pattern in the chain
    project.chain.forEach((patternId, index) => {
      const pattern = project.patterns.find(p => p.id === patternId);
      if (pattern) {
        const patternElement = this.createPatternElement(pattern, index);
        chainContainer.appendChild(patternElement);
      }
    });
  }

  createPatternElement(pattern, index) {
    const element = document.createElement('div');
    element.className = 'timeline-pattern';
    element.dataset.patternId = pattern.id;
    element.dataset.index = index;
    
    // Find the pattern name from its bank and slot
    const bank = pattern.bank || '?';
    const slot = pattern.slot !== undefined ? pattern.slot + 1 : '?';
    const name = pattern.name || `${bank}${slot}`;
    
    element.innerHTML = `
      <div class="timeline-pattern-header">
        <span class="timeline-pattern-name">${name}</span>
        <div class="timeline-pattern-actions">
          <button class="timeline-btn-move-left" title="Nach links verschieben">◀</button>
          <button class="timeline-btn-move-right" title="Nach rechts verschieben">▶</button>
          <button class="timeline-btn-remove" title="Entfernen">×</button>
        </div>
      </div>
      <div class="timeline-pattern-steps">
        ${this.renderPatternSteps(pattern)}
      </div>
      <div class="timeline-pattern-footer">
        <span class="timeline-pattern-step-count">${pattern.steps?.[0]?.length || 0} Steps</span>
        <span class="timeline-pattern-part-count">${pattern.steps?.length || 0} Parts</span>
      </div>
    `;

    // Add event listeners
    element.querySelector('.timeline-btn-move-left')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.movePattern(index, -1);
    });
    
    element.querySelector('.timeline-btn-move-right')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.movePattern(index, 1);
    });
    
    element.querySelector('.timeline-btn-remove')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removePattern(index);
    });

    // Click to select this pattern
    element.addEventListener('click', () => {
      this.app.setCurrentPattern(pattern.id);
      this.highlightCurrentPattern();
    });

    return element;
  }

  renderPatternSteps(pattern) {
    if (!pattern.steps || pattern.steps.length === 0) return '';

    // Create a simplified visualization of the pattern
    // For each step in the first 4 rows, create a small indicator
    let stepsHtml = '';
    const rowsToShow = Math.min(4, pattern.steps.length);
    const stepsToShow = Math.min(16, pattern.steps[0]?.length || 0);

    for (let row = 0; row < rowsToShow; row++) {
      const rowSteps = pattern.steps[row] || [];
      let rowHtml = '<div class="timeline-step-row">';
      
      for (let stepIdx = 0; stepIdx < stepsToShow; stepIdx++) {
        const step = rowSteps[stepIdx];
        const isActive = step && step.on;
        rowHtml += `<div class="timeline-step ${isActive ? 'active' : ''}"></div>`;
      }
      
      rowHtml += '</div>';
      stepsHtml += rowHtml;
    }

    return stepsHtml;
  }

  addCurrentPatternToChain() {
    if (!this.app.state.project) return;
    
    // Add current pattern to chain
    const currentPattern = this.app.getCurrentPattern();
    if (currentPattern) {
      this.app.state.project.chain = [...(this.app.state.project.chain || []), currentPattern.id];
      this.app.saveToHistory(); // Save to history if function is available
      this.app.renderChain(); // Update the original chain display
      this.render(); // Update the timeline
      this.highlightCurrentPattern();
    }
  }

  removePattern(index) {
    if (!this.app.state.project || !this.app.state.project.chain) return;
    
    const chain = [...this.app.state.project.chain];
    chain.splice(index, 1);
    this.app.state.project.chain = chain;
    
    this.app.saveToHistory(); // Save to history if function is available
    this.app.renderChain(); // Update the original chain display
    this.render(); // Update the timeline
  }

  movePattern(fromIndex, direction) {
    if (!this.app.state.project || !this.app.state.project.chain) return;
    
    const chain = [...this.app.state.project.chain];
    const toIndex = fromIndex + direction;
    
    // Check if the move is valid
    if (toIndex < 0 || toIndex >= chain.length) return;
    
    // Swap elements
    [chain[fromIndex], chain[toIndex]] = [chain[toIndex], chain[fromIndex]];
    
    this.app.state.project.chain = chain;
    
    this.app.saveToHistory(); // Save to history if function is available
    this.app.renderChain(); // Update the original chain display
    this.render(); // Update the timeline
  }

  clearChain() {
    if (!this.app.state.project) return;
    
    this.app.state.project.chain = [];
    this.app.saveToHistory(); // Save to history if function is available
    this.app.renderChain(); // Update the original chain display
    this.render(); // Update the timeline
  }

  highlightCurrentPattern() {
    // Remove previous highlights
    document.querySelectorAll('.timeline-pattern.current').forEach(el => {
      el.classList.remove('current');
    });

    // Add highlight to current pattern in timeline
    if (this.app.state.currentPatternId) {
      const currentPatternElement = document.querySelector(`.timeline-pattern[data-pattern-id="${this.app.state.currentPatternId}"]`);
      if (currentPatternElement) {
        currentPatternElement.classList.add('current');
      }
    }
  }

  updateForCurrentStep(stepIndex) {
    // Remove previous step highlights
    document.querySelectorAll('.timeline-pattern .timeline-step.current').forEach(step => {
      step.classList.remove('current');
    });

    // Highlight the current step in the current pattern
    if (this.app.state.currentPatternId) {
      const currentPatternElement = document.querySelector(`.timeline-pattern[data-pattern-id="${this.app.state.currentPatternId}"]`);
      if (currentPatternElement) {
        // Find the step at the current index
        const stepElements = currentPatternElement.querySelectorAll('.timeline-step');
        if (stepElements[stepIndex]) {
          stepElements[stepIndex].classList.add('current');
        }
      }
    }
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Timeline };
} else {
  window.Timeline = Timeline;
}