/**
 * SampleEngine.ts - Optimierter Sampler für TribeX
 * Teil des Core-Systems gemäß Roadmap
 */

import { Part, ProjectState } from '../../types';
import { Mixer } from '../mixer/Mixer';
import { clamp } from '../../utils/index';

export interface SampleBuffer {
  id: string;
  buffer: AudioBuffer;
  name: string;
  duration: number;
  sampleRate: number;
  channels: number;
  isLoaded: boolean;
  originalPath: string;
}

export interface SamplePlaybackOptions {
  startTime?: number;
  duration?: number;
  pitch?: number; // In halben Tönen
  playbackRate?: number;
  gain?: number;
  pan?: number;
  loop?: boolean;
  loopStart?: number;
  loopEnd?: number;
}

export class SampleEngine {
  private context: AudioContext;
  private mixer: Mixer;
  private buffers: Map<string, AudioBuffer> = new Map();
  private sampleBuffers: Map<string, SampleBuffer> = new Map();
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private loadingPromises: Map<string, Promise<AudioBuffer>> = new Map();

  constructor(context: AudioContext, mixer: Mixer) {
    this.context = context;
    this.mixer = mixer;
  }

  /**
   * Lädt ein Sample aus einer URL
   */
  async loadSample(url: string, id?: string): Promise<AudioBuffer> {
    const sampleId = id || url;
    
    // Wenn das Sample bereits geladen ist, gib es zurück
    if (this.buffers.has(sampleId)) {
      return this.buffers.get(sampleId)!;
    }
    
    // Wenn das Sample gerade geladen wird, warte auf das Promise
    if (this.loadingPromises.has(sampleId)) {
      return this.loadingPromises.get(sampleId)!;
    }
    
    // Starte das Laden
    const loadingPromise = this._decodeSample(url);
    this.loadingPromises.set(sampleId, loadingPromise);
    
    try {
      const buffer = await loadingPromise;
      this.buffers.set(sampleId, buffer);
      
      // Füge das Sample auch zur detaillierten Liste hinzu
      const sampleBuffer: SampleBuffer = {
        id: sampleId,
        buffer,
        name: id || url.split('/').pop() || 'unknown',
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        isLoaded: true,
        originalPath: url
      };
      
      this.sampleBuffers.set(sampleId, sampleBuffer);
      
      return buffer;
    } catch (error) {
      console.error(`Fehler beim Laden des Samples ${url}:`, error);
      throw error;
    } finally {
      this.loadingPromises.delete(sampleId);
    }
  }

  /**
   * Dekodiert ein Sample aus einer URL
   */
  private async _decodeSample(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} für ${url}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    
    return audioBuffer;
  }

  /**
   * Lädt alle Samples für ein Projekt
   */
  async loadProject(project: ProjectState): Promise<void> {
    const sampleLoads: Promise<any>[] = [];
    
    for (const part of project.parts) {
      if (part.type === 'sample' && part.samplePath) {
        // Lade das Sample für diesen Part
        sampleLoads.push(this.loadSample(part.samplePath, part.id));
      }
    }
    
    // Warte auf alle Ladevorgänge
    await Promise.all(sampleLoads);
    
    console.log(`SampleEngine: ${sampleLoads.length} Samples für Projekt geladen`);
  }

  /**
   * Spielt ein Sample ab
   */
  play(part: Part, time: number = this.context.currentTime, velocity: number = 1.0, options: SamplePlaybackOptions = {}): void {
    if (part.type !== 'sample' || !part.samplePath) {
      return;
    }
    
    const buffer = this.buffers.get(part.id);
    if (!buffer) {
      console.warn(`Sample für Part ${part.id} nicht gefunden`);
      return;
    }
    
    // Hole oder erstelle einen Channel Strip für diesen Part
    this.mixer.createChannelStrip(part.id, part.name);
    
    // Erstelle eine neue AudioBufferSource
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    
    // Setze Playback-Optionen
    source.playbackRate.value = options.playbackRate || 1.0;
    
    // Setze Loop-Optionen
    if (options.loop) {
      source.loop = true;
      source.loopStart = options.loopStart || 0;
      source.loopEnd = options.loopEnd || buffer.duration;
    }
    
    // Erstelle Gain-Node für Lautstärke
    const gainNode = this.context.createGain();
    const gain = clamp(velocity * (options.gain || 1.0), 0, 2);
    gainNode.gain.setValueAtTime(gain, time);
    
    // Erstelle Panner-Node für Panorama
    const panNode = this.context.createStereoPanner();
    panNode.pan.setValueAtTime(options.pan !== undefined ? options.pan : 0, time);
    
    // Verbinde die Nodes: Source -> Gain -> Pan -> Channel Strip Input
    source.connect(gainNode).connect(panNode);
    
    // Verbinde mit dem Mixer-Channel
    const channelStrip = this.mixer.createChannelStrip(part.id, part.name);
    panNode.connect(channelStrip.input);
    
    // Bestimme Start- und Endzeit
    const startTime = options.startTime !== undefined ? options.startTime : time;
    const duration = options.duration || buffer.duration;
    
    // Starte die Wiedergabe
    if (source.loop) {
      source.start(startTime);
    } else {
      source.start(startTime, 0, duration);
    }
    
    // Füge zur Liste aktiver Quellen hinzu
    this.activeSources.add(source);
    
    // Entferne aus aktiven Quellen, wenn die Wiedergabe beendet ist
    source.onended = () => {
      this.activeSources.delete(source);
    };
  }

  /**
   * Spielt ein Sample mit Offset ab (für Microtiming)
   */
  playWithOffset(part: Part, time: number, offsetSeconds: number, velocity: number = 1.0): void {
    const adjustedTime = time + offsetSeconds;
    this.play(part, adjustedTime, velocity);
  }

  /**
   * Spielt ein Sample mit Ratchet-Effekt ab
   */
  playRatchet(part: Part, time: number, velocity: number = 1.0, ratchet: number = 1, interval: number = 0.05): void {
    for (let i = 0; i < ratchet; i++) {
      const ratchetTime = time + (i * interval);
      // Verringere leicht die Velocity für spätere Ratchet-Sounds
      const ratchetVelocity = velocity * (1 - (i * 0.1));
      this.play(part, ratchetTime, ratchetVelocity);
    }
  }

  /**
   * Gibt alle Samples frei
   */
  async destroy(): Promise<void> {
    // Stoppe alle aktiven Quellen
    for (const source of this.activeSources) {
      try {
        if (source.playbackState !== 3) { // 3 = finished
          source.stop();
        }
      } catch (e) {
        // Quelle war möglicherweise bereits gestoppt
      }
    }
    
    this.activeSources.clear();
    this.buffers.clear();
    this.sampleBuffers.clear();
    this.loadingPromises.clear();
    
    console.log('SampleEngine zerstört');
  }

  /**
   * Gibt die Anzahl geladener Samples zurück
   */
  getLoadedSampleCount(): number {
    return this.buffers.size;
  }

  /**
   * Gibt ein SampleBuffer zurück
   */
  getSampleBuffer(id: string): SampleBuffer | undefined {
    return this.sampleBuffers.get(id);
  }

  /**
   * Prüft, ob ein Sample geladen ist
   */
  isSampleLoaded(id: string): boolean {
    return this.buffers.has(id);
  }

  /**
   * Gibt den Status der SampleEngine zurück
   */
  getStatus(): {
    loadedSamples: number;
    activeSources: number;
    loadingPromises: number;
  } {
    return {
      loadedSamples: this.getLoadedSampleCount(),
      activeSources: this.activeSources.size,
      loadingPromises: this.loadingPromises.size
    };
  }
}