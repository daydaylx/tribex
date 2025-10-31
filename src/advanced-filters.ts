/**
 * advanced-filters.ts - Erweiterte Filter für TribeX Synthesizer
 * Implementiert verschiedene Filtertypen für erweiterte Klanggestaltung
 */

import { clamp } from './utils.js';

// Filter-Typen
export type FilterType = 
  | 'lowpass' 
  | 'highpass' 
  | 'bandpass' 
  | 'notch' 
  | 'allpass' 
  | 'peaking' 
  | 'lowshelf' 
  | 'highshelf'
  | 'formant'
  | 'stateVariable'
  | 'moog'
  | 'diode';

interface FilterParams {
  frequency: number;
  Q: number;
  gain?: number; // Für peaking und shelf Filter
}

export interface AdvancedFilterParams extends FilterParams {
  filterType: FilterType;
  resonance?: number;
  drive?: number;
  saturation?: number;
}

/**
 * Biquad-Filter mit erweiterten Funktionen
 */
export class BiquadFilter {
  static createFilter(context: AudioContext, params: AdvancedFilterParams): BiquadFilterNode {
    const filter = context.createBiquadFilter();
    
    // Setze grundlegende Parameter
    filter.type = params.filterType as BiquadFilterType;
    filter.frequency.value = clamp(params.frequency, 20, context.sampleRate / 2);
    filter.Q.value = clamp(params.Q, 0.0001, 100);
    
    if (params.gain !== undefined) {
      filter.gain.value = clamp(params.gain, -40, 40);
    }
    
    return filter;
  }
}

/**
 * State Variable Filter - ermöglicht mehrere Filtertypen gleichzeitig
 */
export class StateVariableFilter {
  private lowpass: AudioNode;
  private highpass: AudioNode;
  private bandpass: AudioNode;
  private notch: AudioNode;
  
  constructor(private context: AudioContext) {
    // In einer Web Audio API Umgebung würde man
    // AudioWorkletNodes oder andere benutzerdefinierte Logik verwenden
    // Da native State-Variable-Filter nicht direkt verfügbar sind,
    // erstellen wir ein simuliertes Verhalten
  }
  
  static createFilter(context: AudioContext, params: AdvancedFilterParams): AudioNode {
    // Für eine echte Implementierung würde man einen AudioWorklet verwenden
    // oder eine benutzerdefinierte Implementierung erstellen
    // Hier verwenden wir als Simulation einen einfachen Ansatz
    
    // Erstelle einen Standard-Biquad-Filter als Basis
    const filter = context.createBiquadFilter();
    
    // Setze Parameter basierend auf gewünschtem Filtertyp
    switch (params.filterType) {
      case 'lowpass':
        filter.type = 'lowpass';
        break;
      case 'highpass':
        filter.type = 'highpass';
        break;
      case 'bandpass':
        filter.type = 'bandpass';
        break;
      case 'notch':
        filter.type = 'notch';
        break;
      default:
        filter.type = params.filterType as BiquadFilterType;
        break;
    }
    
    filter.frequency.value = clamp(params.frequency, 20, context.sampleRate / 2);
    filter.Q.value = clamp(params.Q, 0.0001, 100);
    
    return filter;
  }
}

/**
 * Moog-Filter-Simulation (ladder-Filter)
 */
export class MoogFilter {
  static createFilter(context: AudioContext, params: AdvancedFilterParams): AudioNode {
    // Da es keinen nativen Moog-Filter in Web Audio API gibt,
    // erstellen wir eine Simulation mit mehreren Biquad-Filtern
    // in Kaskade oder verwenden einen AudioWorklet in einer vollständigen Implementierung
    
    // Für die Simulation verwenden wir einen Tiefpassfilter als Basis
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    
    // Setze die Basiseigenschaften
    filter.frequency.value = clamp(params.frequency, 20, context.sampleRate / 2);
    
    // Berücksichtige Resonanz
    let resonance = clamp(params.resonance || params.Q, 0, 1);
    // Konvertiere Resonanz in Q-Faktor
    filter.Q.value = 0.5 + resonance * 20;
    
    // Füge Sättigung hinzu, um Moog-ähnlichen Charakter zu simulieren
    if (params.drive && params.drive > 0) {
      const saturation = context.createWaveShaper();
      const driveAmount = clamp(params.drive, 0, 1);
      
      // Setze eine Kurve für die Verzerrung
      const curve = new Float32Array(4096);
      for (let i = 0; i < 4096; i++) {
        const x = (i - 2048) / 2048;
        const k = 10 * driveAmount;
        curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
      }
      
      saturation.curve = curve;
      saturation.oversample = '4x';
      
      // Verketten: Filter -> Sättigung
      // Hinweis: In der Praxis müssten wir einen zusätzlichen Graph-Aufbau implementieren
      // Dies ist eine vereinfachte Simulation
    }
    
    return filter;
  }
}

/**
 * Formant-Filter - simuliert Vokalformanten
 */
export class FormantFilter {
  static createFilter(context: AudioContext, params: AdvancedFilterParams): AudioNode {
    // Formant-Filter simulieren Vokalformanten durch Kombination mehrerer Bandpass-Filter
    // mit spezifischen Frequenzen für verschiedene Vokale
    
    // Für die Simulation verwenden wir einen Bandpass-Filter mit variabler Frequenz
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    
    // Setze die Frequenz mit leichter Variation basierend auf Formant-Charakteristik
    const frequency = clamp(params.frequency, 20, context.sampleRate / 2);
    filter.frequency.value = frequency;
    
    // Setze eine höhere Q für schärfere Formanten
    const q = clamp(params.Q, 1, 20);
    filter.Q.value = q;
    
    return filter;
  }
}

/**
 * Diode-Filter Simulation
 */
export class DiodeFilter {
  static createFilter(context: AudioContext, params: AdvancedFilterParams): AudioNode {
    // Da es keinen nativen Diode-Filter in Web Audio API gibt,
    // simulieren wir das Verhalten mit einem Tiefpassfilter
    // mit spezifischen Charakteristiken
    
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    
    // Setze Parameter
    filter.frequency.value = clamp(params.frequency, 20, context.sampleRate / 2);
    filter.Q.value = clamp(params.Q, 0.5, 20);
    
    return filter;
  }
}

/**
 * Multimode Filter - kombiniert verschiedene Filtertypen
 */
export class MultiModeFilter {
  private filters: BiquadFilterNode[] = [];
  private mixGain: GainNode;
  
  constructor(
    private context: AudioContext,
    private filterChain: FilterType[] = ['lowpass', 'highpass', 'bandpass']
  ) {
    // Erstelle einen Gain-Knoten für die Mischung
    this.mixGain = context.createGain();
  }
  
  createFilter(params: AdvancedFilterParams): AudioNode {
    // Erstelle alle Filter in der Kette
    const inputs: AudioNode[] = [];
    
    for (const type of this.filterChain) {
      const filterParams = { ...params, filterType: type };
      const filterNode = BiquadFilter.createFilter(this.context, filterParams);
      this.filters.push(filterNode);
    }
    
    // In einer vollständigen Implementierung würden wir die Filter
    // in verschiedenen Konfigurationen (in Serie, parallel, etc.) verbinden
    // und eine Mischung ermöglichen
    
    return this.mixGain;
  }
  
  setMix(ratios: number[]): void {
    // Setze die Mischverhältnisse für jeden Filter
    // In einer vollständigen Implementierung
  }
  
  connect(destination: AudioNode): void {
    this.mixGain.connect(destination);
  }
}

/**
 * Filter-Factory für alle unterstützten Filtertypen
 */
export class FilterFactory {
  static createFilter(context: AudioContext, params: AdvancedFilterParams): AudioNode {
    switch (params.filterType) {
      case 'formant':
        return FormantFilter.createFilter(context, params);
      case 'stateVariable':
        return StateVariableFilter.createFilter(context, params);
      case 'moog':
        return MoogFilter.createFilter(context, params);
      case 'diode':
        return DiodeFilter.createFilter(context, params);
      case 'lowpass':
      case 'highpass':
      case 'bandpass':
      case 'notch':
      case 'allpass':
      case 'peaking':
      case 'lowshelf':
      case 'highshelf':
      default:
        return BiquadFilter.createFilter(context, params);
    }
  }
}

/**
 * Mehrband-Filter für komplexere Klanggestaltung
 */
export class MultiBandFilter {
  private lowBand: AudioNode;
  private midBand: AudioNode;
  private highBand: AudioNode;
  private crossoverFilters: AudioNode[];
  
  constructor(private context: AudioContext, private crossoverFrequencies: [number, number] = [300, 3000]) {
    // Erstelle Crossover für Low/Mid/High
    this.crossoverFilters = [];
    // In einer vollständigen Implementierung würden wir
    // mehrere Filter für das Crossover und die Bearbeitung jedes Bands erstellen
  }
  
  process(input: AudioNode, output: AudioNode, bandParams: [AdvancedFilterParams, AdvancedFilterParams, AdvancedFilterParams]): void {
    // Verarbeite jeden Frequenzbereich separat
    // In einer vollständigen Implementierung
  }
}