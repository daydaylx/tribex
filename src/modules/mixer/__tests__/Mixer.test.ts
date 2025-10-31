import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Mixer } from '../Mixer';

// Mock für AudioContext
const mockAudioContext = {
  createGain: vi.fn().mockReturnValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1, setValueAtTime: vi.fn() }
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
  destination: {}
};

describe('Mixer', () => {
  let mixer: Mixer;

  beforeEach(() => {
    mixer = new Mixer(mockAudioContext as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sollte korrekt initialisiert werden', () => {
    expect(mixer).toBeInstanceOf(Mixer);
  });

  it('sollte createChannelStrip korrekt ausführen', () => {
    expect(() => {
      mixer.createChannelStrip('part-1', 'Kick');
    }).not.toThrow();
    
    expect(mixer.createChannelStrip('part-1', 'Kick')).toBeDefined();
    expect(mixer.getActiveChannelCount()).toBe(1);
  });

  it('sollte updatePart korrekt ausführen', () => {
    // Zuerst einen Channel Strip erstellen
    mixer.createChannelStrip('part-1', 'Kick');
    
    const settings = { gain: 0.9, pan: 0.5, lp: 18000, hp: 100 };
    
    expect(() => {
      mixer.updatePart('part-1', settings);
    }).not.toThrow();
  });

  it('sollte setMasterTilt korrekt ausführen', () => {
    expect(() => {
      mixer.setMasterTilt(0.5);
    }).not.toThrow();
  });

  it('sollte setMasterClip korrekt ausführen', () => {
    expect(() => {
      mixer.setMasterClip(-0.5);
    }).not.toThrow();
  });

  it('sollte triggerDucking korrekt ausführen', () => {
    expect(() => {
      mixer.triggerDucking(0.5);
    }).not.toThrow();
  });

  it('sollte setSolo korrekt ausführen', () => {
    // Zuerst einen Channel Strip erstellen
    mixer.createChannelStrip('part-1', 'Kick');
    
    expect(() => {
      mixer.setSolo('part-1', true);
    }).not.toThrow();
  });

  it('sollte setMute korrekt ausführen', () => {
    // Zuerst einen Channel Strip erstellen
    mixer.createChannelStrip('part-1', 'Kick');
    
    expect(() => {
      mixer.setMute('part-1', true);
    }).not.toThrow();
  });

  it('sollte setSendLevel korrekt ausführen', () => {
    // Zuerst einen Channel Strip erstellen
    mixer.createChannelStrip('part-1', 'Kick');
    
    expect(() => {
      mixer.setSendLevel('part-1', 'reverb', 0.7);
    }).not.toThrow();
  });

  it('sollte getSendLevel korrekt ausführen', () => {
    // Zuerst einen Channel Strip erstellen und Send-Level setzen
    mixer.createChannelStrip('part-1', 'Kick');
    mixer.setSendLevel('part-1', 'reverb', 0.7);
    
    const level = mixer.getSendLevel('part-1', 'reverb');
    expect(level).toBe(0.7); // Oder den Default-Wert, wenn Send noch nicht existiert
  });

  it('sollte releaseChannelStrip korrekt ausführen', () => {
    // Zuerst einen Channel Strip erstellen
    mixer.createChannelStrip('part-1', 'Kick');
    expect(mixer.getActiveChannelCount()).toBe(1);
    
    mixer.releaseChannelStrip('part-1');
    expect(mixer.getActiveChannelCount()).toBe(0);
  });

  it('sollte Status korrekt zurückgeben', () => {
    const status = mixer.getStatus();
    expect(status).toHaveProperty('channelCount');
    expect(status).toHaveProperty('masterVolume');
    expect(status).toHaveProperty('masterTilt');
    expect(status).toHaveProperty('masterClip');
    
    expect(status.channelCount).toBe(0);
  });

  it('sollte destroy korrekt ausführen', async () => {
    // Zuerst einen Channel Strip erstellen
    mixer.createChannelStrip('part-1', 'Kick');
    
    await expect(mixer.destroy()).resolves.not.toThrow();
  });

  it('sollte getDefaultColorForPart korrekt ausführen', () => {
    // Da getDefaultColorForPart privat ist, testen wir die öffentlichen Methoden
    // Die Farbe wird automatisch bei createChannelStrip gesetzt
    const kickStrip = mixer.createChannelStrip('part-kick', 'Kick');
    expect(kickStrip.color).toBeDefined();
    
    const snareStrip = mixer.createChannelStrip('part-snare', 'Snare');
    expect(snareStrip.color).toBeDefined();
    
    const hihatStrip = mixer.createChannelStrip('part-hihat', 'Closed Hat');
    expect(hihatStrip.color).toBeDefined();
  });
});