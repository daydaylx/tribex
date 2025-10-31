import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SampleEngine } from '../SampleEngine';
import { Mixer } from '../../mixer/Mixer';
import { Part } from '../../../types';

// Mock für AudioContext
const mockAudioContext = {
  createBufferSource: vi.fn().mockReturnValue({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    playbackRate: { value: 1 },
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    onended: null
  }),
  createGain: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { setValueAtTime: vi.fn() }
  }),
  createStereoPanner: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    pan: { setValueAtTime: vi.fn() }
  }),
  decodeAudioData: vi.fn().mockResolvedValue({
    duration: 1,
    sampleRate: 44100,
    numberOfChannels: 2,
    length: 44100
  }),
  currentTime: 0
};

// Mock für Mixer
const mockMixer = {
  createChannelStrip: vi.fn(),
  updatePart: vi.fn()
} as unknown as Mixer;

describe('SampleEngine', () => {
  let sampleEngine: SampleEngine;
  let mockMixerInstance: Mixer;

  beforeEach(() => {
    mockMixerInstance = mockMixer;
    sampleEngine = new SampleEngine(mockAudioContext as any, mockMixerInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sollte korrekt initialisiert werden', () => {
    expect(sampleEngine).toBeInstanceOf(SampleEngine);
    expect(sampleEngine.getStatus()).toBeDefined();
  });

  it('sollte loadSample korrekt ausführen', async () => {
    // Mock für fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });

    const result = await sampleEngine.loadSample('test.wav', 'test-id');
    expect(result).toBeDefined();
    expect(sampleEngine.isSampleLoaded('test-id')).toBe(true);
    expect(sampleEngine.getLoadedSampleCount()).toBe(1);
  });

  it('sollte play korrekt ausführen', async () => {
    // Zuerst Sample laden
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });

    await sampleEngine.loadSample('test.wav', 'test-part');
    
    const mockPart: Part = {
      id: 'test-part',
      name: 'Test Part',
      type: 'sample',
      samplePath: 'test.wav',
      params: { cutoff: 20000, resonance: 0 },
      mixer: { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 },
      motion: [],
      synth: undefined
    };

    expect(() => {
      sampleEngine.play(mockPart, 0.5, 0.8);
    }).not.toThrow();

    expect(mockMixerInstance.createChannelStrip).toHaveBeenCalledWith('test-part', 'Test Part');
  });

  it('sollte playWithOffset korrekt ausführen', async () => {
    // Zuerst Sample laden
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });

    await sampleEngine.loadSample('test.wav', 'test-part');
    
    const mockPart: Part = {
      id: 'test-part',
      name: 'Test Part',
      type: 'sample',
      samplePath: 'test.wav',
      params: { cutoff: 20000, resonance: 0 },
      mixer: { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 },
      motion: [],
      synth: undefined
    };

    expect(() => {
      sampleEngine.playWithOffset(mockPart, 0.5, 0.1, 0.8);
    }).not.toThrow();
  });

  it('sollte playRatchet korrekt ausführen', async () => {
    // Zuerst Sample laden
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });

    await sampleEngine.loadSample('test.wav', 'test-part');
    
    const mockPart: Part = {
      id: 'test-part',
      name: 'Test Part',
      type: 'sample',
      samplePath: 'test.wav',
      params: { cutoff: 20000, resonance: 0 },
      mixer: { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 },
      motion: [],
      synth: undefined
    };

    expect(() => {
      sampleEngine.playRatchet(mockPart, 0.5, 0.8, 3, 0.05);
    }).not.toThrow();
  });

  it('sollte destroy korrekt ausführen', async () => {
    const result = await sampleEngine.destroy();
    expect(result).toBeUndefined();
  });

  it('sollte Status korrekt zurückgeben', () => {
    const status = sampleEngine.getStatus();
    expect(status).toHaveProperty('loadedSamples');
    expect(status).toHaveProperty('activeSources');
    expect(status).toHaveProperty('loadingPromises');
    
    expect(status.loadedSamples).toBe(0);
    expect(status.activeSources).toBe(0);
    expect(status.loadingPromises).toBe(0);
  });

  it('sollte korrekt mit nicht geladenen Samples umgehen', () => {
    const mockPart: Part = {
      id: 'nonexistent-part',
      name: 'Non-existent Part',
      type: 'sample',
      samplePath: 'nonexistent.wav',
      params: { cutoff: 20000, resonance: 0 },
      mixer: { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 },
      motion: [],
      synth: undefined
    };

    expect(() => {
      sampleEngine.play(mockPart, 0.5, 0.8);
    }).not.toThrow();
  });
});