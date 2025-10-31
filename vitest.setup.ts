import '@testing-library/jest-dom/vitest';

// Mock für Web Audio API, da diese in jsdom nicht vollständig unterstützt wird
const mockAudioContext = {
  createGain: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
  }),
  createStereoPanner: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    pan: { value: 0, setValueAtTime: vi.fn() }
  }),
  createBiquadFilter: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    type: 'lowpass',
    frequency: { value: 1000, setValueAtTime: vi.fn() },
    Q: { value: 1, setValueAtTime: vi.fn() }
  }),
  createOscillator: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sawtooth',
    frequency: { value: 440, setValueAtTime: vi.fn() }
  }),
  createBufferSource: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    loop: false,
    playbackRate: { value: 1 },
    buffer: null,
    onended: null
  }),
  createAnalyser: () => ({
    connect: vi.fn(),
    disconnect: vi.fn()
  }),
  createConvolver: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    buffer: null
  }),
  createDelay: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    delayTime: { value: 0 }
  }),
  createDynamicsCompressor: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    threshold: { value: -20 },
    knee: { value: 30 },
    ratio: { value: 12 },
    reduction: { value: 0 },
    attack: { value: 0.003 },
    release: { value: 0.25 }
  }),
  createWaveShaper: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    curve: null,
    oversample: 'none'
  }),
  decodeAudioData: vi.fn().mockResolvedValue({ duration: 1, sampleRate: 44100, numberOfChannels: 2 }),
  close: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
  suspend: vi.fn().mockResolvedValue(undefined),
  state: 'running',
  currentTime: 0,
  destination: {}
};

// Mock für AudioWorklet
const mockAudioWorkletNode = vi.fn().mockImplementation(() => ({
  port: {
    postMessage: vi.fn(),
    onmessage: null
  },
  connect: vi.fn(),
  disconnect: vi.fn(),
  parameters: {
    get: vi.fn().mockReturnValue({ 
      setValueAtTime: vi.fn(),
      value: 120
    })
  }
}));

// Erstelle ein globales Mock für AudioContext
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockAudioContext)
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockAudioContext)
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({})
  }
});

// Mock für AudioWorklet
vi.spyOn(navigator, 'requestMIDIAccess').mockResolvedValue({
  inputs: new Map(),
  outputs: new Map()
});