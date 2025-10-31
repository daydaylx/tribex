import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngineV2 } from '../AudioEngineV2';
import { SampleEngine } from '../../../modules/sampler/SampleEngine';
import { SynthEngine } from '../../../modules/synthesizer/SynthEngine';
import { EffectProcessor } from '../../../modules/effects/EffectProcessor';
import { Mixer } from '../../../modules/mixer/Mixer';
import { Part } from '../../../types';

// Mock für Module, da die tatsächlichen Implementierungen Web Audio API verwenden
vi.mock('../../../modules/sampler/SampleEngine', () => ({
  SampleEngine: vi.fn().mockImplementation(() => ({
    loadProject: vi.fn().mockResolvedValue(undefined),
    play: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../../../modules/synthesizer/SynthEngine', () => ({
  SynthEngine: vi.fn().mockImplementation(() => ({
    loadProject: vi.fn().mockResolvedValue(undefined),
    playNote: vi.fn(),
    stopNote: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../../../modules/effects/EffectProcessor', () => ({
  EffectProcessor: vi.fn().mockImplementation(() => ({
    loadProject: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../../../modules/mixer/Mixer', () => ({
  Mixer: vi.fn().mockImplementation(() => ({
    createChannelStrip: vi.fn(),
    updatePart: vi.fn(),
    setMasterTilt: vi.fn(),
    setMasterClip: vi.fn(),
    triggerDucking: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('AudioEngineV2', () => {
  let audioEngine: AudioEngineV2;

  beforeEach(() => {
    // AudioEngineV2 erwartet einen AudioContext, der in jsdom nicht verfügbar ist
    // Daher müssen wir den Konstruktor so anpassen, dass er funktioniert
    audioEngine = new AudioEngineV2();
  });

  afterEach(async () => {
    if (audioEngine) {
      try {
        await audioEngine.destroy();
      } catch (e) {
        // Ignoriere Fehler beim Cleanup
      }
    }
  });

  it('sollte korrekt initialisiert werden', () => {
    expect(audioEngine).toBeInstanceOf(AudioEngineV2);
    expect(audioEngine.sampleEngine).toBeDefined();
    expect(audioEngine.synthEngine).toBeDefined();
    expect(audioEngine.effectProcessor).toBeDefined();
    expect(audioEngine.mixer).toBeDefined();
  });

  it('sollte die korrekten Standardwerte haben', () => {
    expect(audioEngine.getBpm()).toBe(120);
    expect(audioEngine.getSwing()).toBe(0);
    expect(audioEngine.getCurrentStep()).toBe(0);
  });

  it('sollte BPM korrekt setzen und abrufen', () => {
    audioEngine.setBpm(130);
    expect(audioEngine.getBpm()).toBe(130);

    // Sollte Werte begrenzen
    audioEngine.setBpm(300); // Über dem Maximum
    expect(audioEngine.getBpm()).toBe(240);

    audioEngine.setBpm(30); // Unter dem Minimum
    expect(audioEngine.getBpm()).toBe(60);
  });

  it('sollte Swing korrekt setzen und abrufen', () => {
    audioEngine.setSwing(50);
    expect(audioEngine.getSwing()).toBe(50);

    // Sollte Werte begrenzen
    audioEngine.setSwing(150); // Über dem Maximum
    expect(audioEngine.getSwing()).toBe(100);

    audioEngine.setSwing(-10); // Unter dem Minimum
    expect(audioEngine.getSwing()).toBe(0);
  });

  it('sollte playPart korrekt für Sample-Parts aufrufen', async () => {
    const mockSamplePart: Part = {
      id: 'test-sample',
      name: 'Test Sample',
      type: 'sample',
      samplePath: 'test.wav',
      params: { cutoff: 20000, resonance: 0 },
      mixer: { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 },
      motion: [],
      synth: undefined
    };

    const playSpy = vi.spyOn(audioEngine.sampleEngine, 'play');
    
    audioEngine.playPart(mockSamplePart, 0.5, 0.8);
    
    expect(playSpy).toHaveBeenCalledWith(mockSamplePart, 0.5, 0.8);
  });

  it('sollte playPart korrekt für Synth-Parts aufrufen', async () => {
    const mockSynthPart: Part = {
      id: 'test-synth',
      name: 'Test Synth',
      type: 'synth',
      samplePath: undefined,
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

    const playNoteSpy = vi.spyOn(audioEngine.synthEngine, 'playNote');
    
    audioEngine.playPart(mockSynthPart, 0.5, 0.8, 60);
    
    expect(playNoteSpy).toHaveBeenCalledWith(mockSynthPart, 60, 0.5, 0.8);
  });

  it('sollte den Status korrekt zurückgeben', () => {
    const status = audioEngine.getStatus();
    expect(status).toHaveProperty('isInitialized');
    expect(status).toHaveProperty('isRunning');
    expect(status).toHaveProperty('bpm');
    expect(status).toHaveProperty('swing');
    expect(status).toHaveProperty('activeSources');
    
    expect(status.bpm).toBe(120);
    expect(status.swing).toBe(0);
  });

  it('sollte destroy-Funktion korrekt ausführen', async () => {
    const sampleDestroySpy = vi.spyOn(audioEngine.sampleEngine, 'destroy');
    const synthDestroySpy = vi.spyOn(audioEngine.synthEngine, 'destroy');
    const effectDestroySpy = vi.spyOn(audioEngine.effectProcessor, 'destroy');
    const mixerDestroySpy = vi.spyOn(audioEngine.mixer, 'destroy');

    await audioEngine.destroy();

    expect(sampleDestroySpy).toHaveBeenCalled();
    expect(synthDestroySpy).toHaveBeenCalled();
    expect(effectDestroySpy).toHaveBeenCalled();
    expect(mixerDestroySpy).toHaveBeenCalled();
  });
});