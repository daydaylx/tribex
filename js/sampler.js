import { clamp } from './utils.js';
import { KIT_PRESETS } from './config.js';

export class Sampler {
  constructor(audioEngine, mixer) {
    this.audioEngine = audioEngine;
    this.context = audioEngine.context;
    this.mixer = mixer;
    this.currentKitId = 'tr909';
    this.buffers = new Map();
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

  async record(name) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Media Devices API not supported.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set(name, buffer);
    };

    mediaRecorder.start();

    return () => {
      mediaRecorder.stop();
    };
  }

  slice(buffer, numSlices) {
    const slices = [];
    const sliceLength = Math.floor(buffer.length / numSlices);

    for (let i = 0; i < numSlices; i++) {
      const start = i * sliceLength;
      const end = start + sliceLength;
      const slice = this.context.createBuffer(buffer.numberOfChannels, sliceLength, buffer.sampleRate);

      for (let j = 0; j < buffer.numberOfChannels; j++) {
        const channelData = buffer.getChannelData(j);
        const sliceData = slice.getChannelData(j);
        sliceData.set(channelData.subarray(start, end));
      }

      slices.push(slice);
    }

    return slices;
  }
}
