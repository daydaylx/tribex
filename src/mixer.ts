/**
 * mixer.ts - Optimierter Mixer für TribeX
 * Implementiert Performance-Verbesserungen für Audio-Mischung
 */

interface MixerSettings {
  gain: number;
  pan: number;
  hp: number;
  lp: number;
  drive: number;
}

interface VoiceChannel {
  input: GainNode;
  output: GainNode;
  gain: GainNode;
  pan: StereoPannerNode;
  filter: BiquadFilterNode;
  drive: WaveShaperNode;
}

class Mixer {
  private context: AudioContext;
  private masterGain: GainNode;
  private masterFilter: BiquadFilterNode;
  private masterOutput: AudioNode;
  private channels: Map<string, VoiceChannel> = new Map();
  private ducker: DynamicsCompressorNode;
  private masterTilt: number = 0;
  private masterClip: number = -0.3;

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
   * Erstellt einen wiederverwendbaren Voice-Channel
   */
  createVoiceChannel(partId: string): VoiceChannel {
    let channel = this.channels.get(partId);
    
    if (channel) {
      // Kanal bereits vorhanden, setze zurück
      channel.input.gain.value = 1;
      channel.gain.gain.value = 1;
      channel.pan.pan.value = 0;
      channel.filter.frequency.value = 20000;
      return channel;
    }
    
    // Neuer Kanal
    const input = this.context.createGain();
    const gain = this.context.createGain();
    const pan = this.context.createStereoPanner();
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    const drive = this.context.createWaveShaper();
    
    // Verbindungen
    input.connect(gain);
    gain.connect(pan);
    pan.connect(filter);
    filter.connect(drive);
    drive.connect(this.masterGain);
    
    // Initiale Werte
    gain.gain.value = 1;
    pan.pan.value = 0;
    filter.frequency.value = 20000;
    
    channel = {
      input,
      output: this.masterGain,
      gain,
      pan,
      filter,
      drive
    };
    
    this.channels.set(partId, channel);
    return channel;
  }

  /**
   * Gibt einen Voice-Channel frei (optional für Leistungsverbesserung)
   */
  releaseVoiceChannel(partId: string): void {
    const channel = this.channels.get(partId);
    if (channel) {
      // Verbindung trennen
      channel.input.disconnect();
      channel.gain.disconnect();
      channel.pan.disconnect();
      channel.filter.disconnect();
      channel.drive.disconnect();
      
      // Nodes entsorgen (nicht zwingend notwendig in JavaScript, aber für Klarheit)
      this.channels.delete(partId);
    }
  }

  /**
   * Aktualisiert die Einstellungen für einen bestimmten Part
   */
  updatePart(partId: string, settings: MixerSettings): void {
    const channel = this.channels.get(partId);
    if (!channel) return;
    
    // Sanfte Anpassung der Werte
    const now = this.context.currentTime;
    channel.gain.gain.setValueAtTime(settings.gain, now);
    channel.pan.pan.setValueAtTime(settings.pan, now);
    channel.filter.frequency.setValueAtTime(settings.lp, now);
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
    // In einer vollständigen Implementierung würde dies 
    // die Kompressor-Einstellungen anpassen
    this.ducker.threshold.value = clipValue;
  }

  /**
   * Löst die Ducker-Funktion für Kick-Drum aus
   */
  triggerDucking(time: number): void {
    // Kurze Ducker-Aktion
    const releaseTime = time + 0.2; // 200ms Dauer
    this.ducker.ratio.setValueAtTime(8, time);
    this.ducker.ratio.setValueAtTime(1, releaseTime);
  }

  /**
   * Gibt alle Ressourcen frei
   */
  destroy(): void {
    // Alle Kanäle freigeben
    this.channels.forEach((channel, partId) => {
      this.releaseVoiceChannel(partId);
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
    return this.channels.size;
  }

  /**
   * Mischt alle aktiven Kanäle
   */
  processMix(): void {
    // In einer vollständigen Implementierung würden hier
    // eventuelle Mischmatrix-Operationen durchgeführt
  }
}

export { Mixer };