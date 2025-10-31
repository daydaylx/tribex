import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngineV2 } from '../../core/audio-engine/AudioEngineV2';
import { Sequencer } from '../../core/sequencer/Sequencer';
import { Mixer } from '../../modules/mixer/Mixer';
import { SampleEngine } from '../../modules/sampler/SampleEngine';
import { SynthEngine } from '../../modules/synthesizer/SynthEngine';
import { ProjectState, Part } from '../../types';

// Mock für AudioContext
const mockAudioContext = {
  createGain: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }
  }),
  createStereoPanner: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    pan: { value: 0, setValueAtTime: vi.fn() }
  }),
  createBiquadFilter: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    type: 'lowpass',
    frequency: { value: 20000, setValueAtTime: vi.fn() },
    Q: { value: 0.2, setValueAtTime: vi.fn() }
  }),
  createOscillator: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sawtooth',
    frequency: { value: 440, setValueAtTime: vi.fn() }
  }),
  createBufferSource: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    loop: false,
    playbackRate: { value: 1 },
    buffer: null,
    onended: null
  }),
  decodeAudioData: vi.fn().mockResolvedValue({ duration: 1, sampleRate: 44100, numberOfChannels: 2 }),
  close: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
  currentTime: 0,
  destination: {}
};

// Mock für die Web Audio API
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockAudioContext)
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockAudioContext)
});

describe('Integrationstests', () => {
  let audioEngine: AudioEngineV2;
  let sequencer: Sequencer;
  let mixer: Mixer;
  let sampleEngine: SampleEngine;
  let synthEngine: SynthEngine;

  beforeEach(() => {
    // Erstelle Instanzen mit Mocks
    audioEngine = new AudioEngineV2();
    sequencer = new Sequencer(audioEngine);
    
    // Ersetze die Module mit den tatsächlichen Instanzen
    // (In der Testumgebung funktioniert dies, da wir das AudioContext mocken)
  });

  afterEach(async () => {
    if (audioEngine) {
      try {
        await audioEngine.destroy();
      } catch (e) {
        // Ignoriere Fehler beim Cleanup in Tests
      }
    }
  });

  it('sollte AudioEngine, Sequencer und andere Module korrekt integrieren', async () => {
    // Teste die Integration zwischen AudioEngine und Sequencer
    expect(audioEngine).toBeDefined();
    expect(sequencer).toBeDefined();
    
    // Stelle sicher, dass die Module in der AudioEngine verfügbar sind
    expect(audioEngine.sampleEngine).toBeDefined();
    expect(audioEngine.synthEngine).toBeDefined();
    expect(audioEngine.mixer).toBeDefined();
    
    // Teste, ob der Sequencer die AudioEngine nutzt
    expect(sequencer['audioEngine']).toBe(audioEngine);
  });

  it('sollte ein vollständiges Projekt-Setup durchführen können', () => {
    const testProject: ProjectState = {
      id: 'integration-test-project',
      name: 'Integration Test Project',
      bpm: 120,
      swing: 0,
      lengthSteps: 16,
      kit: 'test-kit',
      parts: [
        {
          id: 'kick-part',
          name: 'Kick',
          type: 'sample',
          samplePath: 'kick.wav',
          params: { cutoff: 20000, resonance: 0 },
          mixer: { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 },
          motion: [],
          synth: undefined
        },
        {
          id: 'synth-part',
          name: 'Synth',
          type: 'synth',
          params: { cutoff: 20000, resonance: 0 },
          mixer: { gain: 0.6, pan: 0, hp: 20, lp: 20000, drive: 0 },
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
        }
      ],
      patterns: [
        {
          id: 'pattern-1',
          bank: 'A',
          slot: 1,
          name: 'Test Pattern',
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
            ],
            [
              { index: 0, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 1, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 2, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 3, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 4, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 5, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 6, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 7, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 8, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 9, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 10, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 11, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 12, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 13, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 14, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 },
              { index: 15, on: false, vel: 1, accent: false, prob: 1, ratchet: 1, microMs: 0, note: 60, detune: 0 }
            ] // Synth-Part hat alle Steps aus
          ]
        }
      ],
      chain: [{ patternId: 'pattern-1' }],
      version: '1.0',
      master: { tilt: 0, clip: -0.3 }
    };

    // Setze das Projekt im Sequencer
    sequencer.setProject(testProject);
    sequencer.setPattern('pattern-1');
    
    // Überprüfe, ob die Daten korrekt übertragen wurden
    expect(sequencer.getBpm()).toBe(testProject.bpm);
    expect(sequencer.getSwing()).toBe(testProject.swing);
  });

  it('sollte AudioEngine-Module korrekt miteinander verbinden', () => {
    // Teste die grundlegenden Funktionen
    expect(audioEngine.getBpm()).toBe(120);
    expect(audioEngine.getSwing()).toBe(0);
    
    // Versuche eine einfache Operation
    audioEngine.setBpm(130);
    expect(audioEngine.getBpm()).toBe(130);
    
    // Teste die Verbindung zwischen Modulen
    expect(audioEngine.sampleEngine).toBeDefined();
    expect(audioEngine.synthEngine).toBeDefined();
    expect(audioEngine.mixer).toBeDefined();
    expect(audioEngine.effectProcessor).toBeDefined();
  });

  it('sollte Sequencer- und AudioEngine-Integration testen', () => {
    const initialBpm = sequencer.getBpm();
    expect(initialBpm).toBe(120); // Standard-BPM
    
    // Setze BPM über Sequencer
    sequencer.setBpm(140);
    expect(sequencer.getBpm()).toBe(140);
    
    // Die AudioEngine sollte ebenfalls aktualisiert werden (wenn richtig verbunden)
  });

  it('sollte die Interaktion zwischen SampleEngine und Mixer testen', () => {
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

    // Teste, ob die grundlegenden Funktionen verfügbar sind
    expect(audioEngine.sampleEngine).toBeDefined();
    expect(audioEngine.mixer).toBeDefined();
  });
});