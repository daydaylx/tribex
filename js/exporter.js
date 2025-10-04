import { stepDurationSeconds } from './utils.js';
import { Mixer } from './mixer.js';
import { SampleEngine } from './engine.js';
import { MotionEngine } from './motion.js';

function cloneBuffer(context, buffer) {
  const cloned = context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    cloned.copyToChannel(buffer.getChannelData(channel), channel);
  }
  return cloned;
}

function seededRandom(seed) {
  let x = seed;
  return () => {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return ((x < 0 ? ~x + 1 : x) % 1000) / 1000;
  };
}

function applyEdgeFade(buffer, fadeTime = 0.005) {
  const fadeSamples = Math.floor(buffer.sampleRate * fadeTime);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < fadeSamples; i += 1) {
      const fadeIn = i / fadeSamples;
      data[i] *= fadeIn;
      const fadeOut = (fadeSamples - i) / fadeSamples;
      data[data.length - 1 - i] *= fadeOut;
    }
  }
}

function encodeWav24(buffer) {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 3;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = dataSize + headerSize;
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset, string) {
    for (let i = 0; i < string.length; i += 1) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channelData = [];
  for (let channel = 0; channel < numChannels; channel += 1) {
    channelData.push(buffer.getChannelData(channel));
  }
  let peak = 0;
  for (let i = 0; i < length; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = channelData[channel][i];
      peak = Math.max(peak, Math.abs(sample));
      const clamped = Math.max(-1, Math.min(1, sample));
      const intVal = Math.round(clamped * 0x7fffff);
      view.setUint8(offset + 0, intVal & 0xff);
      view.setUint8(offset + 1, (intVal >> 8) & 0xff);
      view.setUint8(offset + 2, (intVal >> 16) & 0xff);
      offset += 3;
    }
  }
  return { arrayBuffer, peak };
}

export async function exportProjectToWav(project, engine, bars = 4) {
  if (!engine) throw new Error('Engine fehlt für Export.');
  const bpm = project.bpm;
  const stepLength = project.lengthSteps || 16;
  const secondsPerStep = stepDurationSeconds(bpm);
  const totalSteps = stepLength * bars;
  const durationSeconds = totalSteps * secondsPerStep;
  const sampleRate = 48000;
  const length = Math.ceil(durationSeconds * sampleRate);
  const offlineContext = new OfflineAudioContext(2, length, sampleRate);
  const offlineMixer = new Mixer(offlineContext);
  const offlineEngine = new SampleEngine(offlineContext, offlineMixer);
  offlineEngine.buffers = new Map();
  engine.buffers.forEach((buffer, key) => {
    offlineEngine.buffers.set(key, cloneBuffer(offlineContext, buffer));
  });

  const random = seededRandom(42);
  const patterns = new Map(project.patterns.map(p => [p.id, p]));
  const chain = project.chain.length > 0 ? project.chain : [{ patternId: project.patterns[0].id }];

  const parts = project.parts.map(part => ({
    ...part,
    mixer: { ...part.mixer },
    params: { ...part.params },
    synth: part.synth ? { ...part.synth } : undefined,
    motion: (part.motion || []).map(point => ({ ...point }))
  }));
  const motionEngine = new MotionEngine();
  parts.forEach(part => {
    part.motion.forEach(point => {
      motionEngine.addPoint(part.id, point.paramId, point);
    });
    offlineMixer.updatePart(part.id, part.mixer);
  });

  const masterTilt = project.master?.tilt ?? 0;
  const masterClip = project.master?.clip ?? -0.3;
  offlineMixer.setMasterTilt(masterTilt);
  offlineMixer.setMasterClip(masterClip);

  let currentChainIndex = 0;
  let pattern = patterns.get(chain[0].patternId) || project.patterns[0];

  for (let step = 0; step < totalSteps; step += 1) {
    const stepIndex = step % stepLength;
    if (stepIndex === 0 && step !== 0) {
      currentChainIndex = (currentChainIndex + 1) % chain.length;
      const next = patterns.get(chain[currentChainIndex].patternId);
      if (next) pattern = next;
    }
    const time = step * secondsPerStep;
    parts.forEach((part, partIndex) => {
      const row = pattern.steps[partIndex];
      if (!row) return;
      const info = row[stepIndex];
      if (!info?.on) return;
      const probability = info.prob ?? 1;
      if (probability < 1) {
        if (random() > probability) return;
      }
      const beat = step / 4;
      const motionValues = {
        cutoff: motionEngine.valueAt(part.id, 'cutoff', beat),
        resonance: motionEngine.valueAt(part.id, 'resonance', beat),
        attack: motionEngine.valueAt(part.id, 'attack', beat),
        decay: motionEngine.valueAt(part.id, 'decay', beat),
        sustain: motionEngine.valueAt(part.id, 'sustain', beat),
        release: motionEngine.valueAt(part.id, 'release', beat),
        glide: motionEngine.valueAt(part.id, 'glide', beat),
        lfoRate: motionEngine.valueAt(part.id, 'lfoRate', beat),
        lfoDepth: motionEngine.valueAt(part.id, 'lfoDepth', beat),
        gain: motionEngine.valueAt(part.id, 'gain', beat),
        pan: motionEngine.valueAt(part.id, 'pan', beat),
        drive: motionEngine.valueAt(part.id, 'drive', beat),
        start: motionEngine.valueAt(part.id, 'start', beat),
        end: motionEngine.valueAt(part.id, 'end', beat)
      };
      let needsUpdate = false;
      if (motionValues.cutoff !== null) {
        if (part.type === 'synth' && part.synth) {
          const minCut = 200;
          const maxCut = 12000;
          part.synth.cutoff = Math.min(maxCut, Math.max(minCut, minCut + (maxCut - minCut) * motionValues.cutoff));
        } else {
          part.mixer.lp = motionValues.cutoff * 20000;
          needsUpdate = true;
        }
      }
      if (motionValues.resonance !== null) {
        if (part.type === 'synth' && part.synth) {
          part.synth.resonance = Math.max(0, Math.min(1, motionValues.resonance));
        } else {
          part.params.resonance = Math.max(0, Math.min(1, motionValues.resonance));
        }
      }
      if (part.type === 'synth' && part.synth) {
        if (motionValues.attack !== undefined && motionValues.attack !== null) {
          part.synth.attack = Math.max(0.001, Math.min(0.8, motionValues.attack * 0.8));
        }
        if (motionValues.decay !== undefined && motionValues.decay !== null) {
          part.synth.decay = Math.max(0.001, Math.min(0.8, motionValues.decay * 0.8));
        }
        if (motionValues.sustain !== undefined && motionValues.sustain !== null) {
          part.synth.sustain = Math.max(0, Math.min(1, motionValues.sustain));
        }
        if (motionValues.release !== undefined && motionValues.release !== null) {
          part.synth.release = Math.max(0.01, Math.min(2, motionValues.release * 2));
        }
        if (motionValues.lfoRate !== undefined && motionValues.lfoRate !== null) {
          part.synth.lfoRate = Math.max(0, Math.min(10, motionValues.lfoRate * 10));
        }
        if (motionValues.lfoDepth !== undefined && motionValues.lfoDepth !== null) {
          part.synth.lfoDepth = Math.max(0, Math.min(12, motionValues.lfoDepth * 12));
        }
      }
      if (motionValues.glide !== null && part.type === 'synth' && part.synth) {
        part.synth.glide = Math.max(0, Math.min(0.5, motionValues.glide * 0.5));
      }
      if (motionValues.gain !== null) {
        part.mixer.gain = motionValues.gain;
        needsUpdate = true;
      }
      if (motionValues.pan !== null) {
        part.mixer.pan = motionValues.pan * 2 - 1;
        needsUpdate = true;
      }
      if (motionValues.drive !== null) {
        part.mixer.drive = motionValues.drive;
        needsUpdate = true;
      }
      if (needsUpdate) {
        offlineMixer.updatePart(part.id, part.mixer);
      }
      const voiceStep = {
        ...info,
        params: { ...(info.params || {}) },
        duration: secondsPerStep
      };
      if (motionValues.start !== null) voiceStep.params.start = motionValues.start;
      if (motionValues.end !== null) voiceStep.params.end = motionValues.end;
      offlineEngine.play(part, voiceStep, time, info.vel ?? 1);
    });
  }

  const renderedBuffer = await offlineContext.startRendering();
  applyEdgeFade(renderedBuffer);
  const { arrayBuffer, peak } = encodeWav24(renderedBuffer);
  const peakDb = 20 * Math.log10(peak || 1e-6);
  if (peakDb > -0.3) {
    console.warn(`Export Peak ${peakDb.toFixed(2)} dBFS überschreitet Limit.`);
  }
  return { arrayBuffer, peakDb, duration: durationSeconds };
}
