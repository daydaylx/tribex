import { clamp, dbToGain } from './utils.js';

const DUCK_TARGETS = ['part-bass', 'part-clhh', 'part-ophh'];
const DUCK_DEPTH_DB = -8;
const DUCK_ATTACK = 0.003;
const DUCK_RELEASE = 0.16;

function makeDriveCurve(amount) {
  const k = amount * 800 + 1;
  const samples = 512;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.atan(x * k) / Math.atan(k);
  }
  return curve;
}

export class Mixer {
  constructor(context) {
    this.context = context;
    this.masterGain = context.createGain();
    this.masterGain.gain.value = dbToGain(-0.3);

    this.masterLowShelf = context.createBiquadFilter();
    this.masterLowShelf.type = 'lowshelf';
    this.masterLowShelf.frequency.value = 200;

    this.masterHighShelf = context.createBiquadFilter();
    this.masterHighShelf.type = 'highshelf';
    this.masterHighShelf.frequency.value = 3000;

    this.masterClip = context.createWaveShaper();
    this.masterClip.curve = makeDriveCurve(0.2);

    this.masterLowShelf.connect(this.masterHighShelf)
      .connect(this.masterClip)
      .connect(this.masterGain)
      .connect(context.destination);

    this.partChannels = new Map();
  }

  ensureChannel(partId) {
    if (this.partChannels.has(partId)) {
      return this.partChannels.get(partId);
    }
    const input = this.context.createGain();
    const hp = this.context.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 20;
    const drive = this.context.createWaveShaper();
    drive.curve = makeDriveCurve(0);
    const lp = this.context.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 20000;
    const pan = this.context.createStereoPanner();
    const duck = this.context.createGain();
    duck.gain.value = 1;
    const gain = this.context.createGain();
    gain.gain.value = 0.8;

    input.connect(hp)
      .connect(drive)
      .connect(lp)
      .connect(pan)
      .connect(duck)
      .connect(gain)
      .connect(this.masterLowShelf);

    const channel = { input, hp, drive, lp, pan, duck, gain };
    this.partChannels.set(partId, channel);
    return channel;
  }

  createVoiceChannel(partId) {
    return this.ensureChannel(partId);
  }

  updatePart(partId, settings) {
    const channel = this.ensureChannel(partId);
    channel.gain.gain.setTargetAtTime(clamp(settings.gain, 0, 1.5), this.context.currentTime, 0.01);
    channel.pan.pan.setTargetAtTime(clamp(settings.pan, -1, 1), this.context.currentTime, 0.01);
    channel.hp.frequency.setTargetAtTime(clamp(settings.hp, 20, 1000), this.context.currentTime, 0.01);
    channel.lp.frequency.setTargetAtTime(clamp(settings.lp, 200, 20000), this.context.currentTime, 0.01);
    channel.drive.curve = makeDriveCurve(clamp(settings.drive, 0, 1));
  }

  setMasterTilt(value) {
    const tilt = clamp(value, -1, 1);
    const gain = tilt * 6;
    this.masterLowShelf.gain.setTargetAtTime(-gain, this.context.currentTime, 0.05);
    this.masterHighShelf.gain.setTargetAtTime(gain, this.context.currentTime, 0.05);
  }

  setMasterClip(dbValue) {
    const amount = clamp((dbValue + 12) / 12, 0, 1);
    this.masterClip.curve = makeDriveCurve(amount);
  }

  triggerDucking(time) {
    const start = time ?? this.context.currentTime;
    const minGain = Math.max(dbToGain(DUCK_DEPTH_DB), 0.05);
    DUCK_TARGETS.forEach(id => {
      const channel = this.partChannels.get(id);
      if (!channel) return;
      const gainParam = channel.duck.gain;
      gainParam.cancelScheduledValues(start);
      gainParam.setValueAtTime(1, start);
      gainParam.linearRampToValueAtTime(minGain, start + DUCK_ATTACK);
      gainParam.exponentialRampToValueAtTime(1, start + DUCK_RELEASE);
    });
  }
}
