import { Mixer } from './mixer.js';
import { clamp, stepDurationSeconds } from './utils.js';

const LOOKAHEAD = 0.025; // 25 ms
const QUEUE_TIME = 0.1; // 100 ms

export class AudioEngine {
  constructor() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContext();
    this.masterOut = this.audioContext.createGain();
    this.masterOut.connect(this.audioContext.destination);
    this.mixer = new Mixer(this.audioContext);

    this.isRunning = false;
    this.requestStart = false;
    this.requestStop = false;
    this.nextStepTime = 0;
    this.currentStep = 0;
    this.bpm = 170;
    this.swing = 0;
    this.lengthSteps = 16;
    this.callbacks = {};
  }

  async init() {
    if (!this.audioContext.audioWorklet) {
      throw new Error('AudioWorklet wird nicht unterstützt.');
    }
    await this.audioContext.audioWorklet.addModule('js/worklets/clock-processor.js');
    this.clockNode = new AudioWorkletNode(this.audioContext, 'tribex-clock', {
      outputChannelCount: [1]
    });
    this.clockNode.port.onmessage = (event) => {
      if (event.data?.type === 'tick') {
        this._schedule(event.data.currentTime);
      }
    };
    const lookaheadParam = this.clockNode.parameters.get('lookahead');
    if (lookaheadParam) {
      lookaheadParam.setValueAtTime(LOOKAHEAD, this.audioContext.currentTime);
    }
    this.clockNode.connect(this.audioContext.destination);
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  setBpm(bpm) {
    this.bpm = clamp(bpm, 130, 200);
    if (this.clockNode) {
      const bpmParam = this.clockNode.parameters.get('bpm');
      if (bpmParam) {
        bpmParam.setValueAtTime(this.bpm, this.audioContext.currentTime);
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
      
      if (this.callbacks.tick) {
        this.callbacks.tick({ step: stepIndex, time: eventTime });
      }

      this.currentStep += 1;
      this.nextStepTime += stepDurationSeconds(this.bpm);
    }
    if (this.requestStop && this.currentStep % this.lengthSteps === 0) {
      this._performStop();
    }
  }

  _performStart(currentTime) {
    this.requestStart = false;
    const barDuration = stepDurationSeconds(this.bpm) * this.lengthSteps;
    const startAt = Math.ceil((currentTime + LOOKAHEAD) / barDuration) * barDuration;
    this.nextStepTime = startAt;
    this.currentStep = 0;
    this.isRunning = true;
    if (this.clockNode) {
      const runningParam = this.clockNode.parameters.get('running');
      if (runningParam) {
        runningParam.setValueAtTime(1, this.audioContext.currentTime);
      }
    }
    if (this.callbacks.start) {
      this.callbacks.start(startAt);
    }
  }

  _performStop() {
    this.isRunning = false;
    this.requestStop = false;
    if (this.clockNode) {
      const runningParam = this.clockNode.parameters.get('running');
      if (runningParam) {
        runningParam.setValueAtTime(0, this.audioContext.currentTime);
      }
    }
    if (this.callbacks.stop) {
      this.callbacks.stop();
    }
  }

  _swingOffset(stepIndex) {
    if (this.swing === 0 || stepIndex % 2 === 0) {
      return 0;
    }
    const amount = this.swing * stepDurationSeconds(this.bpm) * 0.5;
    return amount;
  }

  getCurrentStep() {
    return this.currentStep % (this.lengthSteps || 16);
  }

  get context() {
    return this.audioContext;
  }

  get destination() {
    return this.masterOut;
  }
}
