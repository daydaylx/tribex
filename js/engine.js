import { clamp, dbToGain } from './utils.js';
import { SynthezicSynth, createDefaultSynthSettings } from './synth.js';

const KIT_PRESETS = {
  tr909: {
    name: 'Roland TR-909',
    root: 'assets/kits/909/',
    samples: {
      kick: 'kick.wav',
      snare: 'snare.wav',
      clap: 'clap.wav',
      rim: 'rim.wav',
      tomLow: 'tom-low.wav',
      tomMid: 'tom-mid.wav',
      tomHigh: 'tom-high.wav',
      clhh: 'closed-hat.wav',
      ophh: 'open-hat.wav',
      crash: 'crash.wav',
      bass: 'bass.wav'
    }
  }
};

const DEFAULT_PARTS = [
  { id: 'part-kick', name: 'Kick', type: 'kick', sampleKey: 'kick' },
  { id: 'part-snare', name: 'Snare', type: 'snare', sampleKey: 'snare' },
  { id: 'part-clap', name: 'Clap', type: 'perc', sampleKey: 'clap' },
  { id: 'part-rim', name: 'Rim', type: 'perc', sampleKey: 'rim' },
  { id: 'part-tom-low', name: 'Tom Low', type: 'perc', sampleKey: 'tomLow' },
  { id: 'part-tom-mid', name: 'Tom Mid', type: 'perc', sampleKey: 'tomMid' },
  { id: 'part-tom-high', name: 'Tom High', type: 'perc', sampleKey: 'tomHigh' },
  { id: 'part-clhh', name: 'Closed Hat', type: 'clhh', sampleKey: 'clhh' },
  { id: 'part-ophh', name: 'Open Hat', type: 'ophh', sampleKey: 'ophh' },
  { id: 'part-crash', name: 'Crash', type: 'perc', sampleKey: 'crash' },
  { id: 'part-bass', name: 'Bass', type: 'bass', sampleKey: 'bass' },
  { id: 'part-synth', name: 'Synthezic', type: 'synth', sampleKey: null }
];

function defaultMixerSettings() {
  return {
    gain: 0.8,
    pan: 0,
    hp: 20,
    lp: 20000,
    drive: 0
  };
}

function defaultParams() {
  return {
    cutoff: 20000,
    resonance: 0,
    start: 0,
    end: 1
  };
}

function emptyMotion() {
  return [];
}

export function createDefaultParts() {
  const kit = KIT_PRESETS.tr909;
  return DEFAULT_PARTS.map((part, index) => {
    const sampleKey = part.sampleKey;
    const sampleFile = sampleKey ? kit.samples[sampleKey] : null;
    return {
      id: part.id,
      name: part.name,
      type: part.type,
      sampleKey,
      samplePath: sampleFile ? `${kit.root}${sampleFile}` : null,
      mixer: { ...defaultMixerSettings(), gain: part.type === 'bass' ? 0.7 : part.type === 'synth' ? 0.6 : 0.8 },
      params: defaultParams(),
      motion: emptyMotion(),
      synth: part.type === 'synth' ? createDefaultSynthSettings() : undefined
    };
  });
}

export class SampleEngine {
  constructor(context, mixer) {
    this.context = context;
    this.mixer = mixer;
    this.currentKitId = 'tr909';
    this.buffers = new Map();
    this.synth = new SynthezicSynth(context, mixer);
  }

  async loadKit(kitId, progressCallback = null) {
    const kit = KIT_PRESETS[kitId];
    if (!kit) {
      throw new Error(`Unbekanntes Kit: ${kitId}`);
    }
    const entries = Object.entries(kit.samples);
    let loaded = 0;
    for (const [key, filename] of entries) {
      const url = `${kit.root}${filename}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await this.context.decodeAudioData(arrayBuffer);
        this.buffers.set(key, buffer);
      } catch (error) {
        console.warn(`Sample ${url} konnte nicht geladen werden (${error.message}). Erstelle Ersatz-Click.`);
        const buffer = this._createFallbackBuffer();
        this.buffers.set(key, buffer);
      }
      loaded += 1;
      if (progressCallback) {
        progressCallback(loaded / entries.length);
      }
    }
    this.currentKitId = kitId;
  }

  hasSample(key) {
    return this.buffers.has(key);
  }

  play(part, step, time, velocity = 1) {
    if (part.type === 'synth') {
      const micro = (step?.microMs || 0) / 1000;
      const startTime = time + micro;
      const duration = step?.duration ?? 0.25;
      const ratchet = step?.ratchet ?? 1;
      const accentBoost = step?.accent ? 1.2 : 1;
      const synthVelocity = clamp((step?.vel ?? velocity) * accentBoost, 0, 1.5);
      if (ratchet > 1) {
        const interval = duration / ratchet;
        for (let i = 0; i < ratchet; i += 1) {
          const subStep = { ...step, duration: interval, microMs: 0 };
          this.synth.trigger(part, subStep, startTime + i * interval, synthVelocity);
        }
      } else {
        this.synth.trigger(part, step, startTime, synthVelocity);
      }
      return;
    }
    const buffer = this.buffers.get(part.sampleKey || part.key || part.type);
    if (!buffer) {
      return;
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const channel = this.mixer.createVoiceChannel(part.id);
    const playbackGain = this.context.createGain();
    const velocityFactor = clamp(step?.vel ?? velocity, 0, 1);
    const accentBoost = step?.accent ? 1.2 : 1;
    playbackGain.gain.setValueAtTime(clamp(velocityFactor * accentBoost, 0, 1.4), time);

    if (step?.ratchet && step.ratchet > 1) {
      const interval = (step.duration ?? 0.125) / step.ratchet;
      for (let i = 0; i < step.ratchet; i += 1) {
        const t = time + i * interval;
        const s = this.context.createBufferSource();
        s.buffer = buffer;
        s.connect(playbackGain).connect(channel.input);
        s.start(t + ((step?.microMs || 0) / 1000));
      }
      return;
    }

    source.connect(playbackGain).connect(channel.input);
    const micro = (step?.microMs || 0) / 1000;
    const startOffset = (step?.params?.start ?? part.params.start) * buffer.duration;
    const endOffset = (step?.params?.end ?? part.params.end) * buffer.duration;
    const duration = Math.max(endOffset - startOffset, 0.011);
    source.start(time + micro, startOffset, duration);

    if (part.type === 'kick') {
      this.mixer.triggerDucking(time);
    }
  }

  _createFallbackBuffer() {
    const length = Math.floor(this.context.sampleRate * 0.05);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const env = Math.exp(-6 * (i / length));
      data[i] = (Math.random() * 2 - 1) * env * 0.6;
    }
    return buffer;
  }
}

export { KIT_PRESETS };
