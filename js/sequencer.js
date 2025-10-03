import { clamp, stepDurationSeconds } from './utils.js';

const LOOKAHEAD = 0.025; // 25 ms
const QUEUE_TIME = 0.1; // 100 ms

export class Sequencer {
  constructor(context, engine, mixer, motion) {
    this.context = context;
    this.engine = engine;
    this.mixer = mixer;
    this.motion = motion;

    this.pattern = null;
    this.chain = [];
    this.chainIndex = 0;
    this.currentStep = 0;
    this.isRunning = false;
    this.requestStart = false;
    this.requestStop = false;
    this.nextStepTime = 0;
    this.secondsPerStep = stepDurationSeconds(170);
    this.swing = 0;
    this.bpm = 170;
    this.callbacks = {};
  }

  async initClock() {
    if (!this.context.audioWorklet) {
      throw new Error('AudioWorklet wird nicht unterstützt.');
    }
    await this.context.audioWorklet.addModule('js/worklets/clock-processor.js');
    this.clockNode = new AudioWorkletNode(this.context, 'tribex-clock', {
      outputChannelCount: [1]
    });
    this.clockNode.port.onmessage = (event) => {
      if (event.data?.type === 'tick') {
        this._schedule(event.data.currentTime);
      }
    };
    const lookaheadParam = this.clockNode.parameters.get('lookahead');
    if (lookaheadParam) {
      lookaheadParam.setValueAtTime(LOOKAHEAD, this.context.currentTime);
    }
    this.clockNode.connect(this.context.destination);
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  setProject(project) {
    this.project = project;
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
    this.bpm = clamp(bpm, 130, 200);
    this.secondsPerStep = stepDurationSeconds(this.bpm);
    if (this.clockNode) {
      const bpmParam = this.clockNode.parameters.get('bpm');
      if (bpmParam) {
        bpmParam.setValueAtTime(this.bpm, this.context.currentTime);
      }
    }
  }

  setSwing(percent) {
    this.swing = clamp(percent, 0, 100) / 100;
  }

  setStepLength(length) {
    this.lengthSteps = length;
  }

  start() {
    if (this.isRunning || this.requestStart) return;
    this.requestStart = true;
  }

  stop() {
    if (!this.isRunning) return;
    this.requestStop = true;
  }

  _schedule(currentTime) {
    if (this.requestStart) {
      this._performStart(currentTime);
    }
    if (!this.isRunning) {
      return;
    }
    while (this.nextStepTime < currentTime + QUEUE_TIME) {
      const stepIndex = this.currentStep % this.lengthSteps;
      const swingOffset = this._swingOffset(stepIndex);
      const eventTime = this.nextStepTime + swingOffset;
      this._scheduleStep(stepIndex, eventTime);
      this.currentStep += 1;
      if (this.currentStep % this.lengthSteps === 0) {
        this._patternComplete(eventTime);
      }
      this.nextStepTime += this.secondsPerStep;
    }
    if (this.requestStop && this.currentStep % this.lengthSteps === 0) {
      this._performStop();
    }
  }

  _performStart(currentTime) {
    this.requestStart = false;
    const barDuration = this.secondsPerStep * this.lengthSteps;
    const startAt = Math.ceil((currentTime + LOOKAHEAD) / barDuration) * barDuration;
    this.nextStepTime = startAt;
    this.currentStep = 0;
    this.isRunning = true;
    if (this.clockNode) {
      const runningParam = this.clockNode.parameters.get('running');
      if (runningParam) {
        runningParam.setValueAtTime(1, this.context.currentTime);
      }
    }
    this.callbacks.start?.(startAt);
  }

  _performStop() {
    this.isRunning = false;
    this.requestStop = false;
    if (this.clockNode) {
      const runningParam = this.clockNode.parameters.get('running');
      if (runningParam) {
        runningParam.setValueAtTime(0, this.context.currentTime);
      }
    }
    this.callbacks.stop?.();
  }

  _patternComplete(time) {
    if (this.callbacks.patternEnd) {
      this.callbacks.patternEnd(time);
    }
    if (this.chain.length > 0) {
      this.chainIndex = (this.chainIndex + 1) % this.chain.length;
      const nextPattern = this.callbacks.resolvePattern?.(this.chain[this.chainIndex]);
      if (nextPattern) {
        this.setPattern(nextPattern);
      }
    }
  }

  _swingOffset(stepIndex) {
    if (this.swing === 0 || stepIndex % 2 === 0) {
      return 0;
    }
    const amount = this.swing * this.secondsPerStep * 0.5;
    return amount;
  }

  _scheduleStep(stepIndex, time) {
    if (!this.pattern || !this.project) return;
    const stepDuration = this.secondsPerStep;
    const beatPosition = stepIndex / 4;
    const events = [];
    this.pattern.steps.forEach((row, partIndex) => {
      const part = this.project.parts[partIndex];
      if (!part) return;
      const step = row[stepIndex];
      if (!step?.on) return;
      if (step.prob !== undefined && Math.random() > step.prob) return;
      const motionCutoff = this.motion.valueAt(part.id, 'cutoff', beatPosition);
      if (motionCutoff !== null) {
        part.params.cutoff = motionCutoff * 20000;
        part.mixer.lp = part.params.cutoff;
        this.mixer.updatePart(part.id, part.mixer);
      }
      const voiceStep = {
        ...step,
        duration: stepDuration,
      };
      this.engine.play(part, voiceStep, time, step.vel ?? 1);
      events.push({ partId: part.id, stepIndex });
    });
    this.callbacks.step?.({ stepIndex, time, events });
  }

  getCurrentStep() {
    return this.currentStep % (this.lengthSteps || 16);
  }
}
