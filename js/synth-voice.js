import { clamp, midiToFrequency } from './utils.js';

export class SynthVoice {
  constructor(context, destination) {
    this.context = context;
    this.osc = context.createOscillator();
    this.filter = context.createBiquadFilter();
    this.amp = context.createGain();
    this.lfo = context.createOscillator();
    this.lfoGain = context.createGain();

    this.lfo.connect(this.lfoGain).connect(this.filter.frequency);
    this.osc.connect(this.filter).connect(this.amp).connect(destination);
  }

  trigger(settings, step, time, velocity) {
    const note = (step?.note ?? settings.baseNote ?? 60) + ((settings.octave ?? 0) * 12);
    const detune = step?.detune ?? settings.detune ?? 0;
    const frequency = midiToFrequency(note);

    this.osc.type = settings.waveform || 'sawtooth';
    this.osc.frequency.setValueAtTime(frequency, time);
    if (detune !== 0) {
      this.osc.detune.setValueAtTime(detune, time);
    }

    this.filter.type = settings.filterType || 'lowpass';
    this.filter.frequency.setValueAtTime(clamp(settings.cutoff ?? 2200, 120, 18000), time);
    this.filter.Q.setValueAtTime(0.5 + clamp(settings.resonance ?? 0.2, 0, 1) * 11.5, time);

    this.lfo.type = settings.lfoWaveform || 'sine';
    this.lfo.frequency.setValueAtTime(settings.lfoRate || 0, time);
    this.lfoGain.gain.setValueAtTime(settings.lfoDepth || 0, time);

    const peak = clamp(settings.gain ?? 0.9, 0, 2) * clamp(velocity, 0, 1.5);
    const attack = Math.max(settings.attack ?? 0.01, 0.001);
    const decay = Math.max(settings.decay ?? 0.1, 0.001);
    const sustain = clamp(settings.sustain ?? 0.7, 0, 1);
    const release = Math.max(settings.release ?? 0.25, 0.01);
    const duration = step?.duration ?? 0.25;

    const startTime = time;
    const peakTime = startTime + attack;
    const decayTime = peakTime + decay;
    const releaseStart = startTime + duration;
    const stopTime = releaseStart + release + 0.05;

    this.amp.gain.setValueAtTime(0, startTime);
    this.amp.gain.linearRampToValueAtTime(peak, peakTime);
    this.amp.gain.linearRampToValueAtTime(peak * sustain, decayTime);
    this.amp.gain.setValueAtTime(peak * sustain, releaseStart);
    this.amp.gain.linearRampToValueAtTime(0.0001, releaseStart + release);

    this.lfo.start(startTime);
    this.lfo.stop(stopTime);
    this.osc.start(startTime);
    this.osc.stop(stopTime);
  }
}
