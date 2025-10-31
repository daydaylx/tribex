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

export const KIT_PRESETS = {
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

export const DEFAULT_PARTS = [
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

function createDefaultSynthSettings() {
  return {
    waveform: 'sawtooth',
    attack: 0.01,
    decay: 0.18,
    sustain: 0.75,
    release: 0.35,
    filterType: 'lowpass',
    cutoff: 2200,
    resonance: 0.2,
    glide: 0,
    lfoWaveform: 'sine',
    lfoRate: 0,
    lfoDepth: 0
  };
}
