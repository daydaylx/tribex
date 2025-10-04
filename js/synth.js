import { clamp } from './utils.js';

export function midiToFrequency(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export function createDefaultSynthSettings() {
  return {
    waveform: 'sawtooth',
    attack: 0.01,
    decay: 0.18,
    sustain: 0.75,
    release: 0.35,
    cutoff: 2200,
    resonance: 0.2,
    gain: 0.9,
    octave: 0,
    glide: 0,
    detune: 0,
    filterType: 'lowpass',
    lfoWaveform: 'sine',
    lfoRate: 0,
    lfoDepth: 0
  };
}

export class SynthezicSynth {
  constructor(context, mixer) {
    this.context = context;
    this.mixer = mixer;
    this.activeVoices = new Map();
  }

  trigger(part, step, time, velocity = 1) {
    const settings = part.synth || createDefaultSynthSettings();
    const channel = this.mixer.createVoiceChannel(part.id);
    const osc = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();

    osc.type = settings.waveform || 'sawtooth';
    const note = (step?.note ?? settings.baseNote ?? 60) + ((settings.octave ?? 0) * 12);
    const detune = step?.detune ?? settings.detune ?? 0;
    const frequency = midiToFrequency(note);
    const glide = Math.max(settings.glide ?? 0, 0);
    const lastVoice = this.activeVoices.get(part.id);
    if (glide > 0 && lastVoice) {
      osc.frequency.setValueAtTime(lastVoice.frequency, time);
      osc.frequency.linearRampToValueAtTime(frequency, time + glide);
    } else {
      osc.frequency.setValueAtTime(frequency, time);
    }
    if (detune !== 0) {
      osc.detune.setValueAtTime(detune, time);
    }

    const filterType = settings.filterType || 'lowpass';
    const validFilterTypes = ['lowpass', 'highpass', 'bandpass'];
    filter.type = validFilterTypes.includes(filterType) ? filterType : 'lowpass';
    const cutoffMin = 120;
    const cutoffMax = 18000;
    const cutoff = clamp(settings.cutoff ?? 2200, cutoffMin, cutoffMax);
    filter.frequency.setValueAtTime(cutoff, time);
    const resonance = clamp(settings.resonance ?? 0.2, 0, 1);
    filter.Q.setValueAtTime(0.5 + resonance * 11.5, time);
    filter.detune.setValueAtTime(0, time);

    let lfo = null;
    if ((settings.lfoDepth ?? 0) > 0 && (settings.lfoRate ?? 0) > 0) {
      lfo = this.context.createOscillator();
      lfo.type = settings.lfoWaveform || 'sine';
      lfo.frequency.setValueAtTime(clamp(settings.lfoRate, 0.01, 20), time);
      const lfoGain = this.context.createGain();
      lfoGain.gain.setValueAtTime(clamp(settings.lfoDepth, 0, 12) * 100, time);
      lfo.connect(lfoGain).connect(filter.detune);
    }

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

    amp.gain.setValueAtTime(0, startTime);
    amp.gain.linearRampToValueAtTime(peak, peakTime);
    amp.gain.linearRampToValueAtTime(peak * sustain, decayTime);
    amp.gain.setValueAtTime(peak * sustain, releaseStart);
    amp.gain.linearRampToValueAtTime(0.0001, releaseStart + release);

    osc.connect(filter).connect(amp).connect(channel.input);
    const voiceId = Symbol('voice');
    const voice = { frequency, voiceId, lfo };
    this.activeVoices.set(part.id, voice);
    osc.onended = () => {
      const current = this.activeVoices.get(part.id);
      if (current && current.voiceId === voiceId) {
        if (current.lfo) {
          try {
            current.lfo.stop();
          } catch (error) {
            // ignore
          }
        }
        this.activeVoices.delete(part.id);
      }
    };
    if (lfo) {
      lfo.start(startTime);
      lfo.stop(stopTime);
    }
    osc.start(startTime);
    osc.stop(stopTime);
  }
}
