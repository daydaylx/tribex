/**
 * Metronome implementation for TribeX
 * Provides audible and visual metronome functionality
 */

class Metronome {
  constructor(audioContext, sequencer) {
    this.audioContext = audioContext;
    this.sequencer = sequencer;
    this.isActive = false;
    this.isRunning = false;
    this.tempo = 120; // Default tempo
    this.currentStep = 0;
    this.lookahead = 25; // ms
    this.timerID = null;
    this.nextStepTime = 0;
    this.secondsPerStep = 0.5; // Default for 120 BPM
    this.oscillators = [];
    
    // Visual elements
    this.visualIndicator = null;
  }

  // Initialize visual indicator
  initVisualIndicator(containerId = 'step-grid') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Create visual indicator element
    this.visualIndicator = document.createElement('div');
    this.visualIndicator.className = 'metronome-visual';
    this.visualIndicator.textContent = '●';
    this.visualIndicator.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 20px;
      height: 20px;
      background: var(--accent);
      border-radius: 50%;
      opacity: 0;
      pointer-events: none;
      z-index: 1000;
      transition: opacity 0.1s ease;
    `;
    
    // Add to container
    container.style.position = 'relative';
    container.appendChild(this.visualIndicator);
  }

  // Toggle metronome on/off
  toggle() {
    this.isActive = !this.isActive;
    if (!this.isActive) {
      this.stop();
    }
    return this.isActive;
  }

  // Set tempo for the metronome
  setTempo(bpm) {
    this.tempo = bpm;
    this.secondsPerStep = 60.0 / this.tempo;
  }

  // Start the metronome
  start() {
    if (!this.isActive || this.isRunning) return;
    
    this.isRunning = true;
    this.currentStep = 0;
    
    // Calculate the next step time based on current time
    this.nextStepTime = this.audioContext.currentTime;
    this._scheduler();
  }

  // Stop the metronome
  stop() {
    this.isRunning = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
    this._clearOscillators();
  }

  // Internal scheduler function
  _scheduler() {
    if (!this.isRunning) return;
    
    // Schedule steps within the lookahead window
    while (this.nextStepTime < this.audioContext.currentTime + this.lookahead / 1000.0) {
      this._scheduleStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += this.secondsPerStep;
      this.currentStep += 1;
    }
    
    // Set timeout for next scheduler run
    this.timerID = setTimeout(() => this._scheduler(), 10);
  }

  // Schedule a single metronome step
  _scheduleStep(stepIndex, time) {
    // Play audio click
    this._playClick(time, stepIndex % 4 === 0); // Accent every 4th beat
    
    // Update visual indicator
    this._updateVisualIndicator(stepIndex % 4 === 0);
  }

  // Play audible click
  _playClick(time, isAccent) {
    // Create oscillator for the click sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Set properties based on whether it's an accent
    if (isAccent) {
      oscillator.frequency.value = 880.0; // Higher pitch for accents
      gainNode.gain.value = 0.2;
    } else {
      oscillator.frequency.value = 440.0; // Standard pitch
      gainNode.gain.value = 0.1;
    }
    
    oscillator.start(time);
    oscillator.stop(time + 0.02); // Short duration
    
    // Add to oscillators array for cleanup
    this.oscillators.push(oscillator);
    
    // Remove completed oscillators
    oscillator.onended = () => {
      const index = this.oscillators.indexOf(oscillator);
      if (index !== -1) {
        this.oscillators.splice(index, 1);
      }
    };
  }

  // Update visual indicator
  _updateVisualIndicator(isAccent) {
    if (!this.visualIndicator) return;
    
    // Show visual indicator with accent styling
    this.visualIndicator.style.opacity = '1';
    this.visualIndicator.style.background = isAccent ? 'var(--accent-strong)' : 'var(--accent)';
    
    // Reset after a short time
    setTimeout(() => {
      if (this.visualIndicator) {
        this.visualIndicator.style.opacity = '0';
      }
    }, 50);
  }

  // Clear any running oscillators
  _clearOscillators() {
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    this.oscillators = [];
  }

  // Sync with sequencer if provided
  syncWithSequencer() {
    if (this.sequencer) {
      // When sequencer starts, start metronome too
      this.sequencer.on('start', () => {
        if (this.isActive) {
          this.start();
        }
      });
      
      // When sequencer stops, stop metronome too
      this.sequencer.on('stop', () => {
        this.stop();
      });
      
      // When sequencer BPM changes, update metronome
      // This would be implemented as part of the sequencer's event system
    }
  }

  // Cleanup function
  destroy() {
    this.stop();
    this._clearOscillators();
    if (this.visualIndicator) {
      this.visualIndicator.remove();
      this.visualIndicator = null;
    }
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Metronome };
} else {
  window.Metronome = Metronome;
}