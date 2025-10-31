import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SynthEngine } from '../SynthEngine';
import { Mixer } from '../../mixer/Mixer';
import { Part } from '../../../types';

// Mock für AudioContext
const mockAudioContext = {
  createOscillator: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sawtooth',
    frequency: { value: 440, setValueAtTime: vi.fn() }
  }),
  createGain: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
  }),
  createBiquadFilter: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    type: 'lowpass',
    frequency: { value: 20000, setValueAtTime: vi.fn() },
    Q: { value: 0.2, setValueAtTime: vi.fn() }
  }),
  currentTime: 0
};

// Mock für Mixer
const mockMixer = {
  createChannelStrip: vi.fn(),
  updatePart: vi.fn()
} as unknown as Mixer;

describe('SynthEngine', () => {
  let synthEngine: SynthEngine;
  let mockMixerInstance: Mixer;

  beforeEach(() => {
    mockMixerInstance = mockMixer;
    synthEngine = new SynthEngine(mockAudioContext as any, mockMixerInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sollte korrekt initialisiert werden', () => {
    expect(synthEngine).toBeInstanceOf(SynthEngine);
    expect(synthEngine.getStatus()).toBeDefined();
  });

  it('sollte loadProject korrekt ausführen', async () => {
    const project = {
      id: 'test-project',
      name: 'Test Project',
      bpm: 120,
      swing: 0,
      lengthSteps: 16,
      kit: 'test-kit',
      parts: [],
      chain: [],
      version: '1.0',
      master: { tilt: 0, clip: -0.3 }
    };

    await expect(synthEngine.loadProject(project)).resolves.not.toThrow();
  });

  it('sollte playNote korrekt ausführen', () => {
    const mockPart: Part = {
      id: 'test-synth',
      name: 'Test Synth',
      type: 'synth',
      params: { cutoff: 20000, resonance: 0 },
      mixer: { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 },
      motion: [],
      synth: {
        waveform: 'sawtooth',
        cutoff: 10000,
        resonance: 0.2,
        attack: 0.01,
        decay: 0.3,
        sustain: 0.7,
        release: 0.4,
        lfoRate: 3,
        lfoDepth: 0.1,
        glide: 0
      }
    };

    expect(() => {
      synthEngine.playNote(mockPart, 60, 0.5, 0.8);
    }).not.toThrow();
  });

  it('sollte stopNote korrekt ausführen', () => {
    const mockPart: Part = {
      id: 'test-synth',
      name: 'Test Synth',
      type: 'synth',
      params: { cutoff: 20000, resonance: 0 },
      mixer: { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 },
      motion: [],
      synth: {
        waveform: 'sawtooth',
        cutoff: 10000,
        resonance: 0.2,
        attack: 0.01,
        decay: 0.3,
        sustain: 0.7,
        release: 0.4,
        lfoRate: 3,
        lfoDepth: 0.1,
        glide: 0
      }
    };

    // Zuerst eine Note abspielen
    synthEngine.playNote(mockPart, 60, 0.5, 0.8);
    
    // Dann stoppen
    expect(() => {
      synthEngine.stopNote(mockPart, 60, 1.0);
    }).not.toThrow();
  });

  it('sollte play korrekt ausführen', () => {
    const mockPart: Part = {
      id: 'test-synth',
      name: 'Test Synth',
      type: 'synth',
      params: { cutoff: 20000, resonance: 0 },
      mixer: { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 },
      motion: [],
      synth: {
        waveform: 'sawtooth',
        cutoff: 10000,
        resonance: 0.2,
        attack: 0.01,
        decay: 0.3,
        sustain: 0.7,
        release: 0.4,
        lfoRate: 3,
        lfoDepth: 0.1,
        glide: 0
      }
    };

    expect(() => {
      synthEngine.play(mockPart, 0.5, 0.8);
    }).not.toThrow();
  });

  it('sollte setParameter korrekt ausführen', () => {
    expect(() => {
      synthEngine.setParameter('test-part', 'attack', 0.5);
    }).not.toThrow();
  });

  it('sollte destroy korrekt ausführen', async () => {
    await expect(synthEngine.destroy()).resolves.not.toThrow();
  });

  it('sollte Status korrekt zurückgeben', () => {
    const status = synthEngine.getStatus();
    expect(status).toHaveProperty('activeVoices');
    expect(status).toHaveProperty('totalVoices');
    expect(status).toHaveProperty('maxVoices');
    
    expect(status.activeVoices).toBe(0);
    expect(status.totalVoices).toBe(0);
    expect(status.maxVoices).toBe(32);
  });
});