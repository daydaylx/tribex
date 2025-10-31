import { clamp, stepDurationSeconds } from './utils.js';

export class Sequencer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.context = audioEngine.context;
    this.pattern = null;
    this.chain = [];
    this.chainIndex = 0;
    this.currentStep = 0;
    this.isRunning = false;
    this.lengthSteps = 16;
    this.callbacks = {};

    this.audioEngine.on('tick', this._tick.bind(this));
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  setPattern(pattern) {
    this.pattern = pattern;
    if (pattern?.steps?.[0]) {
      this.lengthSteps = pattern.steps[0].length;
    }
    this.currentStep = 0;
    this.callbacks.patternChange?.(pattern);
  }

  setChain(chain) {
    this.chain = chain;
    this.chainIndex = 0;
  }

  setBpm(bpm) {
    this.audioEngine.setBpm(bpm);
  }

  setSwing(percent) {
    this.audioEngine.setSwing(percent);
  }

  setStepLength(length) {
    this.lengthSteps = length;
  }

  start() {
    this.audioEngine.start();
  }

  stop() {
    this.audioEngine.stop();
  }

  _tick({ step, time }) {
    if (!this.pattern) return;

    const events = [];
    this.pattern.steps.forEach((row, partIndex) => {
      const stepData = row[step];
      if (stepData?.on) {
        if (stepData.prob === undefined || Math.random() < stepData.prob) {
          events.push({ partIndex, stepData, time });
        }
      }
    });

    if (this.callbacks.step) {
      this.callbacks.step({ step, time, events });
    }

    if (step === this.lengthSteps - 1) {
      if (this.callbacks.patternEnd) {
        this.callbacks.patternEnd(time);
      }
      if (this.chain.length > 0) {
        this.chainIndex = (this.chainIndex + 1) % this.chain.length;
        const nextPatternId = this.chain[this.chainIndex].patternId;
        if (this.callbacks.resolvePattern) {
          const nextPattern = this.callbacks.resolvePattern(nextPatternId);
          if (nextPattern) {
            this.setPattern(nextPattern);
          }
        }
      }
    }
  }

  getCurrentStep() {
    return this.audioEngine.getCurrentStep();
  }
}
