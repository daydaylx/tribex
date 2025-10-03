class TribexClockProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'lookahead', defaultValue: 0.025, minValue: 0.001, maxValue: 0.1, automationRate: 'k-rate' },
      { name: 'bpm', defaultValue: 170, minValue: 20, maxValue: 300, automationRate: 'k-rate' },
      { name: 'running', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.nextTick = currentTime;
    this.tickInterval = 0.01;
  }

  process(inputs, outputs, parameters) {
    const running = parameters.running[0] > 0.5;
    const lookahead = parameters.lookahead[0];
    if (!running) {
      this.nextTick = currentTime + this.tickInterval;
      return true;
    }

    const now = currentTime;
    if (now + lookahead >= this.nextTick) {
      this.nextTick = now + this.tickInterval;
      this.port.postMessage({ type: 'tick', currentTime: now });
    }

    // keep processor alive by writing silence
    const output = outputs[0];
    if (output) {
      for (let channel = 0; channel < output.length; channel += 1) {
        output[channel].fill(0);
      }
    }
    return true;
  }
}

registerProcessor('tribex-clock', TribexClockProcessor);
