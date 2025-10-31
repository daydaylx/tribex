import { Effect } from './effect.js';

export class Reverb extends Effect {
  constructor(context) {
    super(context);
    this.convolver = context.createConvolver();
    this.input.connect(this.convolver).connect(this.output);
  }

  async loadImpulseResponse(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const impulseResponse = await this.context.decodeAudioData(arrayBuffer);
    this.convolver.buffer = impulseResponse;
  }
}
