import { SynthVoice } from './synth-voice.js';

export class Synth {
  constructor(context, mixer) {
    this.context = context;
    this.mixer = mixer;
    this.voices = new Map();
  }

  trigger(part, step, time, velocity = 1) {
    const channel = this.mixer.createVoiceChannel(part.id);
    const voice = new SynthVoice(this.context, channel.input);
    voice.trigger(part.synth, step, time, velocity);
  }
}
