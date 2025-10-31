import { MixerChannel } from './mixer-channel.js';
import { clamp, dbToGain } from './utils.js';

const DUCK_TARGETS = ['part-bass', 'part-clhh', 'part-ophh'];
const DUCK_DEPTH_DB = -8;
const DUCK_ATTACK = 0.003;
const DUCK_RELEASE = 0.16;

class MasterChannel {
  constructor(context) {
    this.context = context;
    this.input = context.createGain();
    this.lowShelf = context.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 200;
    this.highShelf = context.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 3000;
    this.clip = context.createWaveShaper();
    this.clip.curve = this.makeDriveCurve(0.2);
    this.output = context.createGain();
    this.output.gain.value = dbToGain(-0.3);

    this.input.connect(this.lowShelf)
      .connect(this.highShelf)
      .connect(this.clip)
      .connect(this.output)
      .connect(context.destination);
  }

  setTilt(value) {
    const tilt = clamp(value, -1, 1);
    const gain = tilt * 6;
    this.lowShelf.gain.setTargetAtTime(-gain, this.context.currentTime, 0.05);
    this.highShelf.gain.setTargetAtTime(gain, this.context.currentTime, 0.05);
  }

  setClip(dbValue) {
    const amount = clamp((dbValue + 12) / 12, 0, 1);
    this.clip.curve = this.makeDriveCurve(amount);
  }

  makeDriveCurve(amount) {
    const k = amount * 800 + 1;
    const samples = 512;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i += 1) {
      const x = (i / (samples - 1)) * 2 - 1;
      curve[i] = Math.atan(x * k) / Math.atan(k);
    }
    return curve;
  }
}

export class Mixer {
  constructor(context) {
    this.context = context;
    this.masterChannel = new MasterChannel(context);
    this.partChannels = new Map();
  }

  ensureChannel(partId) {
    if (this.partChannels.has(partId)) {
      return this.partChannels.get(partId);
    }
    const channel = new MixerChannel(this.context, this.masterChannel.input);
    this.partChannels.set(partId, channel);
    return channel;
  }

  createVoiceChannel(partId) {
    return this.ensureChannel(partId);
  }

  updatePart(partId, settings) {
    const channel = this.ensureChannel(partId);
    channel.update(settings);
  }

  setMasterTilt(value) {
    this.masterChannel.setTilt(value);
  }

  setMasterClip(dbValue) {
    this.masterChannel.setClip(dbValue);
  }

  update(parts) {
    const soloed = parts.some(p => p.solo);
    parts.forEach(part => {
      const channel = this.ensureChannel(part.id);
      if (soloed) {
        channel.gain.gain.value = part.solo ? part.mixer.gain : 0;
      } else {
        channel.gain.gain.value = part.mute ? 0 : part.mixer.gain;
      }
    });
  }

  triggerDucking(time) {
    const depth = dbToGain(DUCK_DEPTH_DB);
    DUCK_TARGETS.forEach(id => {
      const channel = this.partChannels.get(id);
      if (channel) {
        channel.triggerDucking(time, depth, DUCK_ATTACK, DUCK_RELEASE);
      }
    });
  }
}
