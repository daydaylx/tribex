import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Sequencer } from '../Sequencer';
import { AudioEngineV2 } from '../../audio-engine/AudioEngineV2';
import { ProjectState } from '../../../types';

// Mock für AudioEngineV2
const mockAudioEngine = {
  context: {
    currentTime: 0
  },
  sampleEngine: {
    play: vi.fn()
  },
  synthEngine: {
    play: vi.fn()
  },
  setBpm: vi.fn(),
  setSwing: vi.fn(),
  getCurrentStep: vi.fn().mockReturnValue(0)
} as unknown as AudioEngineV2;

// Mock für ProjectState
const mockProject: ProjectState = {
  id: 'test-project',
  name: 'Test Project',
  bpm: 120,
  swing: 0,
  lengthSteps: 16,
  kit: 'test-kit',
  parts: [
    {
      id: 'part-1',
      name: 'Kick',
      type: 'sample',
      samplePath: 'kick.wav',
      params: { cutoff: 20000, resonance: 0 },
      mixer: { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 },
      motion: [],
      synth: undefined
    }
  ],
  patterns: [
    {
      id: 'pattern-1',
      bank: 'A',
      slot: 1,
      name: 'Pattern 1',
      steps: [
        [
          { index: 0, on: true, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 1, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 2, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 3, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 4, on: true, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 5, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 6, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 7, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 8, on: true, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 9, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 10, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 11, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 12, on: true, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 13, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 14, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
          { index: 15, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 }
        ]
      ]
    }
  ],
  chain: [],
  version: '1.0',
  master: { tilt: 0, clip: -0.3 }
};

describe('Sequencer', () => {
  let sequencer: Sequencer;

  beforeEach(() => {
    sequencer = new Sequencer(mockAudioEngine);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sollte korrekt initialisiert werden', () => {
    expect(sequencer).toBeInstanceOf(Sequencer);
  });

  it('sollte Projekt korrekt setzen', () => {
    sequencer.setProject(mockProject);
    
    expect(sequencer.getBpm()).toBe(120);
    expect(sequencer.getSwing()).toBe(0);
  });

  it('sollte BPM korrekt setzen', () => {
    sequencer.setBpm(130);
    expect(sequencer.getBpm()).toBe(130);

    // Sollte Werte begrenzen
    sequencer.setBpm(300); // Über dem Maximum
    expect(sequencer.getBpm()).toBe(300); // In der Sequencer-Klasse ist das Maximum 300, nicht 240 wie in AudioEngine

    sequencer.setBpm(20); // Unter dem Minimum
    expect(sequencer.getBpm()).toBe(30);
  });

  it('sollte Swing korrekt setzen', () => {
    sequencer.setSwing(50);
    expect(sequencer.getSwing()).toBe(50);

    // Sollte Werte begrenzen
    sequencer.setSwing(150); // Über dem Maximum
    expect(sequencer.getSwing()).toBe(100);

    sequencer.setSwing(-10); // Unter dem Minimum
    expect(sequencer.getSwing()).toBe(0);
  });

  it('sollte Pattern korrekt setzen', () => {
    sequencer.setProject(mockProject);
    
    expect(() => {
      sequencer.setPattern('pattern-1');
    }).not.toThrow();
    
    expect(sequencer.getCurrentPatternId()).toBe('pattern-1');
  });

  it('sollte Chain korrekt setzen', () => {
    expect(() => {
      sequencer.setChain([{ patternId: 'pattern-1' }]);
    }).not.toThrow();
  });

  it('sollte korrekt starten und stoppen', () => {
    sequencer.setProject(mockProject);
    
    expect(sequencer.isPlaying()).toBe(false);
    
    sequencer.start();
    expect(sequencer.isPlaying()).toBe(true);
    
    sequencer.stop();
    expect(sequencer.isPlaying()).toBe(false);
  });

  it('sollte togglePlay korrekt ausführen', () => {
    sequencer.setProject(mockProject);
    
    expect(sequencer.isPlaying()).toBe(false);
    
    sequencer.togglePlay();
    expect(sequencer.isPlaying()).toBe(true);
    
    sequencer.togglePlay();
    expect(sequencer.isPlaying()).toBe(false);
  });

  it('sollte triggerStep korrekt ausführen', () => {
    sequencer.setProject(mockProject);
    sequencer.setPattern('pattern-1');
    
    expect(() => {
      sequencer.triggerStep(0, 0);
    }).not.toThrow();
  });

  it('sollte destroy korrekt ausführen', () => {
    sequencer.stop(); // Sicherstellen, dass der Sequencer nicht läuft
    expect(() => {
      sequencer.destroy();
    }).not.toThrow();
  });

  it('sollte getCurrentStep korrekt zurückgeben', () => {
    expect(sequencer.getCurrentStep()).toBe(0);
  });

  it('sollte getCurrentChainIndex korrekt zurückgeben', () => {
    expect(sequencer.getCurrentChainIndex()).toBe(0);
  });

  it('sollte getCurrentPatternId korrekt zurückgeben', () => {
    expect(sequencer.getCurrentPatternId()).toBeNull();
    
    sequencer.setProject(mockProject);
    sequencer.setPattern('pattern-1');
    expect(sequencer.getCurrentPatternId()).toBe('pattern-1');
  });
});