import { clamp } from './utils.js';

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

export class MixerChannel {
  constructor(context, master) {
    this.context = context;
    this.input = context.createGain();
    this.hp = context.createBiquadFilter();
    this.hp.type = 'highpass';
    this.hp.frequency.value = 20;
    this.drive = context.createWaveShaper();
    this.drive.curve = makeDriveCurve(0);
    this.lp = context.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = 20000;
    this.pan = context.createStereoPanner();
    this.duck = context.createGain();
    this.duck.gain.value = 1;
    this.gain = context.createGain();
    this.gain.gain.value = 0.8;

    this.input.connect(this.hp)
      .connect(this.drive)
      .connect(this.lp)
      .connect(this.pan)
      .connect(this.duck)
      .connect(this.gain)
      .connect(master);
  }

  update(settings) {
    this.gain.gain.setTargetAtTime(clamp(settings.gain, 0, 1.5), this.context.currentTime, 0.01);
    this.pan.pan.setTargetAtTime(clamp(settings.pan, -1, 1), this.context.currentTime, 0.01);
    this.hp.frequency.setTargetAtTime(clamp(settings.hp, 20, 1000), this.context.currentTime, 0.01);
    this.lp.frequency.setTargetAtTime(clamp(settings.lp, 200, 20000), this.context.currentTime, 0.01);
    this.drive.curve = makeDriveCurve(clamp(settings.drive, 0, 1));
  }

  triggerDucking(time, depth, attack, release) {
    const start = time ?? this.context.currentTime;
    const minGain = Math.max(depth, 0.05);
    const gainParam = this.duck.gain;
    gainParam.cancelScheduledValues(start);
    gainParam.setValueAtTime(1, start);
    gainParam.linearRampToValueAtTime(minGain, start + attack);
    gainParam.exponentialRampToValueAtTime(1, start + release);
  }
}
