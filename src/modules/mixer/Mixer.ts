/**
 * Mixer.ts - 16-Kanal-Mischpult für TribeX
 * Teil des Core-Systems gemäß Roadmap
 */

import { MixerSettings } from '../../types';

export interface ChannelStrip {
  input: GainNode;
  output: GainNode;
  gain: GainNode;
  pan: StereoPannerNode;
  filters: {
    low: BiquadFilterNode;
    high: BiquadFilterNode;
  };
  sends: Map<string, GainNode>; // Effekt-Sends
  mute: boolean;
  solo: boolean;
  color: string; // Farbe für UI
}

export class Mixer {
  private context: AudioContext;
  private masterGain: GainNode;
  private masterFilter: BiquadFilterNode;
  private masterOutput: AudioNode;
  private channelStrips: Map<string, ChannelStrip> = new Map();
  private effectSends: Map<string, AudioNode> = new Map(); // Effekt-Busse
  private ducker: DynamicsCompressorNode;
  private masterTilt: number = 0;
  private masterClip: number = -0.3;
  private masterVolume: number = 1.0;

  constructor(context: AudioContext) {
    this.context = context;
    
    // Master-Setup
    this.masterGain = this.context.createGain();
    this.masterFilter = this.context.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 20000;
    
    // Ducker für Kick-Drum
    this.ducker = this.context.createDynamicsCompressor();
    this.ducker.threshold.value = -12;
    this.ducker.ratio.value = 8;
    this.ducker.attack.value = 0.001;
    this.ducker.release.value = 0.1;
    
    // Master-Effekte verbinden
    this.masterGain.connect(this.masterFilter);
    this.masterFilter.connect(this.ducker);
    this.ducker.connect(this.context.destination);
    
    this.masterOutput = this.ducker;
  }

  /**
   * Erstellt einen neuen 16-Kanal-Mischpulteintrag
   */
  createChannelStrip(partId: string, name: string): ChannelStrip {
    if (this.channelStrips.has(partId)) {
      return this.channelStrips.get(partId)!;
    }
    
    // Neue Audio-Nodes erstellen
    const input = this.context.createGain();
    const gain = this.context.createGain();
    const pan = this.context.createStereoPanner();
    const lowFilter = this.context.createBiquadFilter();
    lowFilter.type = 'lowpass';
    const highFilter = this.context.createBiquadFilter();
    highFilter.type = 'highpass';
    
    // Standardwerte
    gain.gain.value = 0.8;
    pan.pan.value = 0;
    lowFilter.frequency.value = 20000;
    highFilter.frequency.value = 20;
    
    // Verbindungen
    input.connect(gain);
    gain.connect(pan);
    pan.connect(lowFilter);
    lowFilter.connect(highFilter);
    
    // Verbinde mit Master
    highFilter.connect(this.masterGain);
    
    // Erstelle neuen Channel Strip
    const channelStrip: ChannelStrip = {
      input,
      output: this.masterGain,
      gain,
      pan,
      filters: {
        low: lowFilter,
        high: highFilter
      },
      sends: new Map(),
      mute: false,
      solo: false,
      color: this.getDefaultColorForPart(name)
    };
    
    this.channelStrips.set(partId, channelStrip);
    return channelStrip;
  }

  /**
   * Gibt einen Channel Strip frei
   */
  releaseChannelStrip(partId: string): void {
    const strip = this.channelStrips.get(partId);
    if (!strip) return;
    
    // Trenne alle Verbindungen
    strip.input.disconnect();
    strip.gain.disconnect();
    strip.pan.disconnect();
    strip.filters.low.disconnect();
    strip.filters.high.disconnect();
    
    // Entferne Sends
    strip.sends.forEach(send => {
      send.disconnect();
    });
    
    // Entferne aus der Map
    this.channelStrips.delete(partId);
  }

  /**
   * Aktualisiert die Einstellungen für einen bestimmten Part
   */
  updatePart(partId: string, settings: Partial<MixerSettings>): void {
    const strip = this.channelStrips.get(partId);
    if (!strip) {
      // Erstelle den Strip, falls er nicht existiert
      const partName = partId.split('-')[1] || partId; // Extrahiere Teilname
      this.createChannelStrip(partId, partName);
      return;
    }
    
    const now = this.context.currentTime;
    
    if (settings.gain !== undefined) {
      strip.gain.gain.setValueAtTime(settings.gain, now);
    }
    if (settings.pan !== undefined) {
      strip.pan.pan.setValueAtTime(settings.pan, now);
    }
    if (settings.lp !== undefined) {
      strip.filters.low.frequency.setValueAtTime(settings.lp, now);
    }
    if (settings.hp !== undefined) {
      strip.filters.high.frequency.setValueAtTime(settings.hp, now);
    }
    // Drive ist nicht direkt als Web Audio Node verfügbar, 
    // würde über WaveShaperNode implementiert
    if (settings.drive !== undefined) {
      // In einer vollständigen Implementierung würde hier 
      // eine WaveShaperNode eingesetzt
    }
  }

  /**
   * Setzt den Master-Tilt (Hoch/Tief-Anhebung)
   */
  setMasterTilt(adjustment: number): void {
    this.masterTilt = adjustment;
    // In einer vollständigen Implementierung würde dies 
    // einen parametrischen Equalizer anpassen
  }

  /**
   * Setzt den Master-Clip (Begrenzung)
   */
  setMasterClip(clipValue: number): void {
    this.masterClip = clipValue;
    this.ducker.threshold.value = clipValue;
  }

  /**
   * Setzt die Master-Lautstärke
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(2, volume)); // Begrenze auf 0-2
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.context.currentTime);
  }

  /**
   * Löst die Ducker-Funktion für Kick-Drum aus
   */
  triggerDucking(time: number): void {
    // Kurze Ducker-Aktion
    const releaseTime = Math.max(time, this.context.currentTime) + 0.2; // 200ms Dauer
    this.ducker.ratio.setValueAtTime(8, time);
    this.ducker.ratio.setValueAtTime(1, releaseTime);
  }

  /**
   * Gibt alle Ressourcen frei
   */
  async destroy(): Promise<void> {
    // Alle Kanäle freigeben
    this.channelStrips.forEach((_, partId) => {
      this.releaseChannelStrip(partId);
    });
    
    // Effekt-Sends freigeben
    this.effectSends.forEach(node => {
      if ('disconnect' in node) {
        (node as any).disconnect();
      }
    });
    
    // Master-Verbindungen trennen
    this.masterGain.disconnect();
    this.masterFilter.disconnect();
    this.ducker.disconnect();
  }

  /**
   * Gibt die Anzahl der aktiven Kanäle zurück
   */
  getActiveChannelCount(): number {
    return this.channelStrips.size;
  }

  /**
   * Setzt den Solo-Status für einen Kanal
   */
  setSolo(partId: string, solo: boolean): void {
    const strip = this.channelStrips.get(partId);
    if (strip) {
      strip.solo = solo;
      // In einer vollständigen Implementierung würde dies
      // andere Kanäle beeinflussen
    }
  }

  /**
   * Setzt den Mute-Status für einen Kanal
   */
  setMute(partId: string, mute: boolean): void {
    const strip = this.channelStrips.get(partId);
    if (strip) {
      strip.mute = mute;
      strip.input.gain.setValueAtTime(mute ? 0 : 1, this.context.currentTime);
    }
  }

  /**
   * Gibt die Send-Ebene für einen Effekt zurück
   */
  getSendLevel(partId: string, effectId: string): number {
    const strip = this.channelStrips.get(partId);
    if (!strip) return 0;
    
    const send = strip.sends.get(effectId);
    return send ? send.gain.value : 0;
  }

  /**
   * Setzt die Send-Ebene für einen Effekt
   */
  setSendLevel(partId: string, effectId: string, level: number): void {
    const strip = this.channelStrips.get(partId);
    if (!strip) {
      // Erstelle den Strip, falls er nicht existiert
      const partName = partId.split('-')[1] || partId; // Extrahiere Teilname
      this.createChannelStrip(partId, partName);
      return;
    }
    
    let send = strip.sends.get(effectId);
    if (!send) {
      // Erstelle neuen Send
      send = this.context.createGain();
      // Verbinde mit entsprechendem Effekt-Bus
      // (In einer vollständigen Implementierung würde der Effekt-Bus existieren)
      strip.sends.set(effectId, send);
      
      // Verbinde den Kanal-Ausgang mit dem Send
      strip.input.connect(send);
    }
    
    send.gain.setValueAtTime(level, this.context.currentTime);
  }

  /**
   * Gibt Standardfarbe für Part-Typ zurück
   */
  private getDefaultColorForPart(partName: string): string {
    const colors: Record<string, string> = {
      kick: '#FF6B6B',
      snare: '#4ECDC4',
      hihat: '#FFE66D',
      clap: '#FF9F1C',
      crash: '#A663CC',
      tom: '#2A9D8F',
      synth: '#9B5DE5',
      default: '#7209B7'
    };
    
    const lowerName = partName.toLowerCase();
    if (lowerName.includes('kick')) return colors.kick;
    if (lowerName.includes('snare')) return colors.snare;
    if (lowerName.includes('hat') || lowerName.includes('hihat')) return colors.hihat;
    if (lowerName.includes('clap')) return colors.clap;
    if (lowerName.includes('crash')) return colors.crash;
    if (lowerName.includes('tom')) return colors.tom;
    if (lowerName.includes('synth')) return colors.synth;
    return colors.default;
  }

  /**
   * Gibt den aktuellen Status des Mixers zurück
   */
  getStatus(): {
    channelCount: number;
    masterVolume: number;
    masterTilt: number;
    masterClip: number;
  } {
    return {
      channelCount: this.getActiveChannelCount(),
      masterVolume: this.masterVolume,
      masterTilt: this.masterTilt,
      masterClip: this.masterClip
    };
  }
}