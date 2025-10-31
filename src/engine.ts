/**
 * engine.ts - Optimierte Audio-Engine für TribeX
 * Implementiert Performance-Verbesserungen für Audio-Verarbeitung
 */

import { clamp, dbToGain } from './utils.js';
import { SynthezicSynth, createDefaultSynthSettings } from './synth.js';
import { Part, ProjectState } from './tribeX-types';

// Erweiterte Kit-Definitionen mit Typisierung
interface KitPreset {
  name: string;
  root: string;
  samples: Record<string, string>;
}

interface KitPresets {
  [key: string]: KitPreset;
}

const KIT_PRESETS: KitPresets = {
  tr909: {
    name: 'Roland TR-909',
    root: 'assets/kits/909/',
    samples: {
      kick: 'kick.wav',
      snare: 'snare.wav',
      clap: 'clap.wav',
      rim: 'rim.wav',
      tomLow: 'tom-low.wav',
      tomMid: 'tom-mid.wav',
      tomHigh: 'tom-high.wav',
      clhh: 'closed-hat.wav',
      ophh: 'open-hat.wav',
      crash: 'crash.wav',
      bass: 'bass.wav'
    }
  }
};

// Optimierter Part-Typ
interface OptimizedPart extends Part {
  mixerNode?: AudioNode;
  gainNode?: GainNode;
  lastPlaybackTime?: number;
}

const DEFAULT_PARTS = [
  { id: 'part-kick', name: 'Kick', type: 'kick', sampleKey: 'kick' },
  { id: 'part-snare', name: 'Snare', type: 'snare', sampleKey: 'snare' },
  { id: 'part-clap', name: 'Clap', type: 'perc', sampleKey: 'clap' },
  { id: 'part-rim', name: 'Rim', type: 'perc', sampleKey: 'rim' },
  { id: 'part-tom-low', name: 'Tom Low', type: 'perc', sampleKey: 'tomLow' },
  { id: 'part-tom-mid', name: 'Tom Mid', type: 'perc', sampleKey: 'tomMid' },
  { id: 'part-tom-high', name: 'Tom High', type: 'perc', sampleKey: 'tomHigh' },
  { id: 'part-clhh', name: 'Closed Hat', type: 'clhh', sampleKey: 'clhh' },
  { id: 'part-ophh', name: 'Open Hat', type: 'ophh', sampleKey: 'ophh' },
  { id: 'part-crash', name: 'Crash', type: 'perc', sampleKey: 'crash' },
  { id: 'part-bass', name: 'Bass', type: 'bass', sampleKey: 'bass' },
  { id: 'part-synth', name: 'Synthezic', type: 'synth', sampleKey: null }
];

function defaultMixerSettings() {
  return {
    gain: 0.8,
    pan: 0,
    hp: 20,
    lp: 20000,
    drive: 0
  };
}

function defaultParams() {
  return {
    cutoff: 20000,
    resonance: 0,
    start: 0,
    end: 1
  };
}

function emptyMotion() {
  return [];
}

export function createDefaultParts(): Part[] {
  const kit = KIT_PRESETS.tr909;
  return DEFAULT_PARTS.map((part, index) => {
    const sampleKey = part.sampleKey;
    const sampleFile = sampleKey ? kit.samples[sampleKey] : null;
    return {
      id: part.id,
      name: part.name,
      type: part.type as any,
      sampleKey: sampleKey || undefined,
      samplePath: sampleFile ? `${kit.root}${sampleFile}` : null,
      mixer: { ...defaultMixerSettings(), gain: part.type === 'bass' ? 0.7 : part.type === 'synth' ? 0.6 : 0.8 },
      params: defaultParams(),
      motion: emptyMotion(),
      synth: part.type === 'synth' ? createDefaultSynthSettings() : undefined
    };
  });
}

export class SampleEngine {
  private context: AudioContext;
  private mixer: any; // Mixer-Interface noch zu definieren
  private currentKitId: string = 'tr909';
  private buffers: Map<string, AudioBuffer> = new Map();
  private synth: SynthezicSynth;
  private activeSources: Map<string, AudioBufferSourceNode[]> = new Map(); // Track aktiver Quellen
  private sampleCache: Map<string, AudioBuffer> = new Map(); // Für Wiederverwendung
  private gainNodes: Map<string, GainNode> = new Map(); // Wiederverwendbare Gain-Nodes

  constructor(context: AudioContext, mixer: any) {
    this.context = context;
    this.mixer = mixer;
    this.synth = new SynthezicSynth(context, mixer);
  }

  async loadKit(kitId: string, progressCallback: ((progress: number) => void) | null = null): Promise<void> {
    const kit = KIT_PRESETS[kitId];
    if (!kit) {
      throw new Error(`Unbekanntes Kit: ${kitId}`);
    }
    
    const entries = Object.entries(kit.samples);
    let loaded = 0;
    
    // Optimierung: Alle Samples parallel laden
    const loadPromises = entries.map(async ([key, filename]) => {
      const url = `${kit.root}${filename}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await this.context.decodeAudioData(arrayBuffer);
        this.buffers.set(key, buffer);
        // In Cache speichern für Wiederverwendung
        this.sampleCache.set(`${kitId}:${key}`, buffer);
      } catch (error) {
        console.warn(`Sample ${url} konnte nicht geladen werden (${error.message}). Erstelle Ersatz-Click.`);
        const buffer = this._createFallbackBuffer();
        this.buffers.set(key, buffer);
        // Fallback auch im Cache speichern
        this.sampleCache.set(`${kitId}:fallback:${key}`, buffer);
      }
    });

    // Warte auf alle Ladevorgänge
    await Promise.all(loadPromises);
    
    // Fortschritt aktualisieren, nachdem alle geladen sind
    if (progressCallback) {
      progressCallback(1);
    }
    
    this.currentKitId = kitId;
  }

  hasSample(key: string): boolean {
    return this.buffers.has(key);
  }

  /**
   * Optimisierte Play-Methode mit geringerer Garbage-Generierung
   */
  play(part: Part, step: any, time: number, velocity: number = 1): void {
    if (part.type === 'synth') {
      this._playSynth(part, step, time, velocity);
      return;
    }

    const buffer = this.buffers.get(part.sampleKey || part.type);
    if (!buffer) {
      return;
    }

    // Optimierung: Wiederverwendbare Gain-Nodes
    const gainNodeId = `${part.id}-playback`;
    let playbackGain = this.gainNodes.get(gainNodeId);
    if (!playbackGain) {
      playbackGain = this.context.createGain();
      this.gainNodes.set(gainNodeId, playbackGain);
    }

    const channel = this.mixer.createVoiceChannel(part.id);
    const velocityFactor = clamp(step?.vel ?? velocity, 0, 1);
    const accentBoost = step?.accent ? 1.2 : 1;
    const finalVelocity = clamp(velocityFactor * accentBoost, 0, 1.4);
    
    // Setze den Wert mit einer Exponential-Rampe für glatteren Übergang
    const currentTime = this.context.currentTime;
    if (time > currentTime) {
      playbackGain.gain.setValueAtTime(playbackGain.gain.value || 0, currentTime);
      playbackGain.gain.exponentialRampToValueAtTime(finalVelocity, time);
    } else {
      playbackGain.gain.setValueAtTime(finalVelocity, time);
    }

    // Behandle Ratchet-Steps
    if (step?.ratchet && step.ratchet > 1) {
      this._handleRatchet(part, buffer, step, time, playbackGain, channel);
      return;
    }

    // Einzelner Step
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    
    // Sammle aktive Quellen für das Part
    if (!this.activeSources.has(part.id)) {
      this.activeSources.set(part.id, []);
    }
    this.activeSources.get(part.id)?.push(source);
    
    // Verbinde und spiele
    source.connect(playbackGain).connect(channel.input);
    const micro = (step?.microMs || 0) / 1000;
    const startOffset = (step?.params?.start ?? part.params.start) * buffer.duration;
    const endOffset = (step?.params?.end ?? part.params.end) * buffer.duration;
    const duration = Math.max(endOffset - startOffset, 0.011);
    
    source.start(time + micro, startOffset, duration);
    
    // Bereinige die Quelle nach Ablauf
    source.onended = () => {
      const sources = this.activeSources.get(part.id);
      if (sources) {
        const index = sources.indexOf(source);
        if (index !== -1) {
          sources.splice(index, 1);
        }
      }
    };

    if (part.type === 'kick') {
      this.mixer.triggerDucking(time);
    }
  }

  private _playSynth(part: Part, step: any, time: number, velocity: number): void {
    const micro = (step?.microMs || 0) / 1000;
    const startTime = time + micro;
    const duration = step?.duration ?? 0.25;
    const ratchet = step?.ratchet ?? 1;
    const accentBoost = step?.accent ? 1.2 : 1;
    const synthVelocity = clamp((step?.vel ?? velocity) * accentBoost, 0, 1.5);
    
    if (ratchet > 1) {
      const interval = duration / ratchet;
      for (let i = 0; i < ratchet; i += 1) {
        const subStep = { ...step, duration: interval, microMs: 0 };
        this.synth.trigger(part, subStep, startTime + i * interval, synthVelocity);
      }
    } else {
      this.synth.trigger(part, step, startTime, synthVelocity);
    }
  }

  private _handleRatchet(part: Part, buffer: AudioBuffer, step: any, time: number, playbackGain: GainNode, channel: any): void {
    const interval = (step.duration ?? 0.125) / step.ratchet;
    const sources: AudioBufferSourceNode[] = [];

    for (let i = 0; i < step.ratchet; i += 1) {
      const t = time + i * interval;
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      
      // Sammle aktive Quellen für das Part
      sources.push(source);
      if (!this.activeSources.has(part.id)) {
        this.activeSources.set(part.id, []);
      }
      this.activeSources.get(part.id)?.push(source);
      
      source.connect(playbackGain).connect(channel.input);
      source.start(t + ((step?.microMs || 0) / 1000));
      
      // Bereinige die Quellen nach Ablauf
      source.onended = () => {
        const partSources = this.activeSources.get(part.id);
        if (partSources) {
          const index = partSources.indexOf(source);
          if (index !== -1) {
            partSources.splice(index, 1);
          }
        }
      };
    }
  }

  /**
   * Methode zum vorherigen Laden und Zwischenspeichern von Samples
   */
  async preloadSample(kitId: string, sampleKey: string): Promise<void> {
    const kit = KIT_PRESETS[kitId];
    if (!kit) {
      throw new Error(`Unbekanntes Kit: ${kitId}`);
    }
    
    const filename = kit.samples[sampleKey];
    if (!filename) {
      throw new Error(`Unbekannter Sample-Key: ${sampleKey}`);
    }
    
    const cacheKey = `${kitId}:${sampleKey}`;
    if (this.sampleCache.has(cacheKey)) {
      // Bereits zwischengespeichert
      return;
    }
    
    const url = `${kit.root}${filename}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.context.decodeAudioData(arrayBuffer);
      this.sampleCache.set(cacheKey, buffer);
    } catch (error) {
      console.warn(`Sample ${url} konnte nicht vorgeladen werden (${error.message}).`);
    }
  }

  /**
   * Methode zum Abrufen eines zwischengespeicherten Samples
   */
  getCachedBuffer(kitId: string, sampleKey: string): AudioBuffer | undefined {
    const cacheKey = `${kitId}:${sampleKey}`;
    return this.sampleCache.get(cacheKey);
  }

  /**
   * Bereinigungsmethode, um Speicher freizugeben
   */
  cleanup(): void {
    // Stoppe alle aktiven Quellen
    this.activeSources.forEach((sources, partId) => {
      sources.forEach(source => {
        try {
          if (source.playbackState !== 3) { // 3 = finished
            source.stop();
          }
        } catch (e) {
          // Quelle war möglicherweise bereits gestoppt
        }
      });
      sources.length = 0; // Leere das Array
    });
    
    // Leere die Map
    this.activeSources.clear();

    // Entferne alle Event-Listener
    this.activeSources.forEach((sources) => {
      sources.forEach(source => source.onended = null);
    });
  }

  private _createFallbackBuffer(): AudioBuffer {
    const length = Math.floor(this.context.sampleRate * 0.05);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const env = Math.exp(-6 * (i / length));
      data[i] = (Math.random() * 2 - 1) * env * 0.6;
    }
    return buffer;
  }
}

export { KIT_PRESETS };