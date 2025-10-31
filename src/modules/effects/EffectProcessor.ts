/**
 * EffectProcessor.ts - Effekt-System für TribeX
 * Teil des Core-Systems gemäß Roadmap
 */

import { ProjectState, Effect, EffectType } from '../../types';
import { Mixer } from '../mixer/Mixer';

export interface EffectChain {
  id: string;
  type: EffectType;
  nodes: AudioNode[];
  input: GainNode;
  output: GainNode;
  enabled: boolean;
  params: Record<string, number>;
}

export class EffectProcessor {
  private context: AudioContext;
  private mixer: Mixer;
  private effects: Map<string, EffectChain> = new Map();
  private masterEffects: Map<string, EffectChain> = new Map();
  private effectBuses: Map<string, GainNode> = new Map(); // Effekt-Busse

  constructor(context: AudioContext, mixer: Mixer) {
    this.context = context;
    this.mixer = mixer;
    
    // Erstelle Standard-Effekt-Busse
    this.createEffectBus('reverb');
    this.createEffectBus('delay');
    this.createEffectBus('compressor');
  }

  /**
   * Erstellt einen Effekt-Bus
   */
  private createEffectBus(busId: string): void {
    const bus = this.context.createGain();
    bus.gain.value = 0; // Standardmäßig aus
    this.effectBuses.set(busId, bus);
    
    // Verbinde den Bus mit dem Master-Ausgang
    bus.connect(this.mixer['masterOutput'] || this.context.destination);
  }

  /**
   * Erstellt einen neuen Effekt
   */
  createEffect(id: string, type: EffectType): EffectChain | null {
    // Prüfe, ob der Effekt bereits existiert
    if (this.effects.has(id)) {
      console.warn(`Effekt ${id} existiert bereits`);
      return this.effects.get(id)!;
    }
    
    // Erstelle die benötigten Audio-Nodes basierend auf dem Effekt-Typ
    const nodes: AudioNode[] = [];
    let input: GainNode, output: GainNode;
    
    // Input- und Output-Nodes
    input = this.context.createGain();
    output = this.context.createGain();
    
    switch (type) {
      case 'reverb':
        // Einfache Reverb-Implementierung mit ConvolverNode
        const convolver = this.context.createConvolver();
        
        // Erzeuge einen einfachen Impuls für den Reverb
        this.createSimpleReverbImpulse(convolver);
        
        // Verbindung: Input -> Convolver -> Output
        input.connect(convolver);
        convolver.connect(output);
        
        nodes.push(input, convolver, output);
        break;
        
      case 'delay':
        // Delay-Effekt mit Feedback
        const delayNode = this.context.createDelay(1.0);
        const feedback = this.context.createGain();
        const dryWet = this.context.createGain();
        
        // Verbindung: Input -> Delay -> Feedback -> Delay (Feedback Loop)
        // Input -> Dry/Wet -> Output
        input.connect(delayNode);
        delayNode.connect(feedback);
        feedback.connect(delayNode); // Feedback
        input.connect(dryWet); // Dry Signal
        delayNode.connect(dryWet); // Wett Signal
        
        dryWet.connect(output);
        
        // Setze Standard-Parameter
        delayNode.delayTime.value = 0.3; // 300ms Delay
        feedback.gain.value = 0.3; // 30% Feedback
        
        nodes.push(input, delayNode, feedback, dryWet, output);
        break;
        
      case 'compressor':
        const compressor = this.context.createDynamicsCompressor();
        
        // Setze Standard-Parameter
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        
        input.connect(compressor);
        compressor.connect(output);
        
        nodes.push(input, compressor, output);
        break;
        
      case 'chorus':
        // Chorus-Effekt mit LFO-gesteuertem Delay
        const chorusDelay = this.context.createDelay(0.1);
        const chorusLFO = this.context.createOscillator();
        const chorusLFOGain = this.context.createGain();
        
        // LFO konfigurieren (für Modulation)
        chorusLFO.type = 'sine';
        chorusLFO.frequency.value = 1.5; // 1.5 Hz
        chorusLFOGain.gain.value = 0.005; // 5ms Modulationstiefe
        
        // Verbindungen
        input.connect(chorusDelay);
        chorusLFO.connect(chorusLFOGain);
        chorusLFOGain.connect(chorusDelay.delayTime);
        chorusDelay.connect(output);
        
        chorusLFO.start();
        
        nodes.push(input, chorusDelay, chorusLFO, chorusLFOGain, output);
        break;
        
      case 'flanger':
        // Flanger-Effekt (ähnlich wie Chorus, aber mit kürzerem Delay)
        const flangerDelay = this.context.createDelay(0.005);
        const flangerLFO = this.context.createOscillator();
        const flangerLFOGain = this.context.createGain();
        const flangerFeedback = this.context.createGain();
        
        // LFO konfigurieren
        flangerLFO.type = 'triangle';
        flangerLFO.frequency.value = 0.5; // 0.5 Hz
        flangerLFOGain.gain.value = 0.001; // 1ms Modulationstiefe
        
        // Verbindungen
        input.connect(flangerDelay);
        input.connect(output); // Add original signal
        flangerDelay.connect(output);
        flangerLFO.connect(flangerLFOGain);
        flangerLFOGain.connect(flangerDelay.delayTime);
        
        // Feedback
        flangerDelay.connect(flangerFeedback);
        flangerFeedback.connect(flangerDelay);
        flangerFeedback.gain.value = 0.5;
        
        flangerLFO.start();
        
        nodes.push(input, flangerDelay, flangerLFO, flangerLFOGain, flangerFeedback, output);
        break;
        
      case 'phaser':
        // Phaser mit mehreren Allpass-Filtern
        const phaserInputGain = this.context.createGain();
        const phaserOutputGain = this.context.createGain();
        const allpassFilters: BiquadFilterNode[] = [];
        
        // Erstelle 6 Allpass-Filter für die Phaser-Implementierung
        for (let i = 0; i < 6; i++) {
          const filter = this.context.createBiquadFilter();
          filter.type = 'allpass';
          filter.frequency.value = 100 * Math.pow(2, i);
          allpassFilters.push(filter);
        }
        
        // Verbinde alle Filter in Reihe
        phaserInputGain.connect(allpassFilters[0]);
        for (let i = 0; i < allpassFilters.length - 1; i++) {
          allpassFilters[i].connect(allpassFilters[i + 1]);
        }
        
        // LFO für die Frequenzmodulation
        const phaserLFO = this.context.createOscillator();
        const phaserLFOGain = this.context.createGain();
        
        phaserLFO.type = 'sine';
        phaserLFO.frequency.value = 0.5;
        phaserLFOGain.gain.value = 1000; // Frequenzänderung
        
        // Verbinde LFO zu jedem Filter
        phaserLFO.connect(phaserLFOGain);
        allpassFilters.forEach(filter => {
          phaserLFOGain.connect(filter.frequency);
        });
        
        // Verbinde Signalwege
        phaserInputGain.connect(phaserOutputGain); // Dry-Signal
        allpassFilters[allpassFilters.length - 1].connect(phaserOutputGain); // Wet-Signal
        
        phaserLFO.start();
        
        nodes.push(phaserInputGain, phaserOutputGain, ...allpassFilters, phaserLFO, phaserLFOGain);
        input = phaserInputGain;
        output = phaserOutputGain;
        break;
        
      case 'eq':
        // Einfaches 3-Band EQ
        const lowShelf = this.context.createBiquadFilter();
        const peak = this.context.createBiquadFilter();
        const highShelf = this.context.createBiquadFilter();
        
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = 300;
        lowShelf.gain.value = 0;
        
        peak.type = 'peaking';
        peak.frequency.value = 1000;
        peak.Q.value = 1;
        peak.gain.value = 0;
        
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 3000;
        highShelf.gain.value = 0;
        
        input.connect(lowShelf);
        lowShelf.connect(peak);
        peak.connect(highShelf);
        highShelf.connect(output);
        
        nodes.push(input, lowShelf, peak, highShelf, output);
        break;
        
      case 'distortion':
        // Waveshaper-Distortion
        const waveShaper = this.context.createWaveShaper();
        const distortionCurve = this.createDistortionCurve(50);
        waveShaper.curve = distortionCurve;
        waveShaper.oversample = '4x';
        
        input.connect(waveShaper);
        waveShaper.connect(output);
        
        nodes.push(input, waveShaper, output);
        break;
        
      case 'bitcrusher':
        // Bitcrusher (würde eigentlich einen ScriptProcessorNode benötigen)
        // Einfache Implementierung mit Gain für den Effekt
        const crushGain = this.context.createGain();
        
        input.connect(crushGain);
        crushGain.connect(output);
        
        nodes.push(input, crushGain, output);
        break;
        
      case 'valve':
        // Valve-Simulation (vereinfacht als Waveshaper)
        const valveShaper = this.context.createWaveShaper();
        const valveCurve = this.createValveCurve();
        valveShaper.curve = valveCurve;
        valveShaper.oversample = '2x';
        
        input.connect(valveShaper);
        valveShaper.connect(output);
        
        nodes.push(input, valveShaper, output);
        break;
        
      default:
        // Bei unbekanntem Effekt-Typ, verbinde Input direkt mit Output
        input.connect(output);
        nodes.push(input, output);
        break;
    }
    
    // Erstelle den Effekt-Chain
    const effectChain: EffectChain = {
      id,
      type,
      nodes,
      input,
      output,
      enabled: true,
      params: this.getDefaultParams(type)
    };
    
    this.effects.set(id, effectChain);
    return effectChain;
  }

  /**
   * Erzeugt eine Verzerrungskurve für Distortion-Effekte
   */
  private createDistortionCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = i * 2 / samples - 1;
      curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
    }
    
    return curve;
  }

  /**
   * Erzeugt eine Röhrenverzerrungskurve
   */
  private createValveCurve(): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      let x = i * 2 / samples - 1;
      const k = 50;
      const curveValue = ((1 + k) * x) / (1 + k * Math.abs(x));
      
      // Asymmetrische Verzerrung für Röhreneffekt
      curve[i] = curveValue > 0 ? curveValue * 1.1 : curveValue * 0.9;
    }
    
    return curve;
  }

  /**
   * Erzeugt einen einfachen Reverb-Impuls
   */
  private createSimpleReverbImpulse(convolver: ConvolverNode): void {
    const length = this.context.sampleRate * 2; // 2 Sekunden
    const impulse = this.context.createBuffer(2, length, this.context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        // Erzeuge einen exponentiell abklingenden Zufallsrauschen-Impuls
        channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.8));
      }
    }
    
    convolver.buffer = impulse;
  }

  /**
   * Gibt Standardparameter für einen Effekt-Typ zurück
   */
  private getDefaultParams(type: EffectType): Record<string, number> {
    switch (type) {
      case 'reverb':
        return { 
          mix: 0.5, 
          time: 2.0, 
          decay: 0.5,
          preDelay: 0.01
        };
      case 'delay':
        return { 
          mix: 0.5, 
          time: 0.3, 
          feedback: 0.3,
          rate: 1.0
        };
      case 'compressor':
        return { 
          threshold: -50, 
          ratio: 12, 
          attack: 0.003,
          release: 0.25
        };
      case 'chorus':
        return { 
          mix: 0.5, 
          rate: 1.5, 
          depth: 0.005,
          feedback: 0.2
        };
      case 'flanger':
        return { 
          mix: 0.5, 
          rate: 0.5, 
          depth: 0.001,
          feedback: 0.5
        };
      case 'phaser':
        return { 
          mix: 0.5, 
          rate: 0.5, 
          depth: 1000,
          feedback: 0.5,
          stages: 6
        };
      case 'eq':
        return { 
          low: 0, 
          mid: 0, 
          high: 0,
          lowFreq: 300,
          midFreq: 1000,
          highFreq: 3000
        };
      case 'distortion':
        return { 
          drive: 50,
          mix: 0.5
        };
      case 'bitcrusher':
        return { 
          bits: 8,
          mix: 0.5
        };
      case 'valve':
        return { 
          drive: 25,
          mix: 0.5
        };
      default:
        return {};
    }
  }

  /**
   * Lädt alle Effekte für ein Projekt
   */
  async loadProject(project: ProjectState): Promise<void> {
    // In einer vollständigen Implementierung würden hier
    // Projektspezifische Effekteinstellungen geladen
    console.log('EffectProcessor: Projekt geladen');
  }

  /**
   * Setzt einen Effekt-Parameter
   */
  setParameter(effectId: string, paramName: string, value: number): void {
    const effect = this.effects.get(effectId);
    if (!effect) {
      console.warn(`Effekt ${effectId} nicht gefunden`);
      return;
    }
    
    // Aktualisiere den Parameter
    effect.params[paramName] = value;
    
    // Wende den Parameter an (abhängig vom Effekt-Typ und Parameter)
    this.applyParameter(effect, paramName, value);
  }

  /**
   * Wendet einen Parameter auf einen Effekt an
   */
  private applyParameter(effect: EffectChain, paramName: string, value: number): void {
    switch (effect.type) {
      case 'reverb':
        if (paramName === 'mix') {
          // Mische zwischen Dry und Wet Signal
          // In einer vollständigen Implementierung würde dies
          // die Gain-Nodes entsprechend anpassen
        }
        break;
      case 'delay':
        if (paramName === 'time' && effect.nodes[1] instanceof DelayNode) {
          (effect.nodes[1] as DelayNode).delayTime.value = value;
        }
        break;
      case 'compressor':
        if (paramName === 'threshold' && effect.nodes[1] instanceof DynamicsCompressorNode) {
          (effect.nodes[1] as DynamicsCompressorNode).threshold.value = value;
        }
        break;
      // Weitere Effekt-Typen würden hier hinzugefügt
    }
  }

  /**
   * Aktiviert oder deaktiviert einen Effekt
   */
  setEnabled(effectId: string, enabled: boolean): void {
    const effect = this.effects.get(effectId);
    if (!effect) {
      console.warn(`Effekt ${effectId} nicht gefunden`);
      return;
    }
    
    effect.enabled = enabled;
    
    // In einer vollständigen Implementierung würde dies
    // die Verbindungen entsprechend anpassen
  }

  /**
   * Gibt alle Ressourcen frei
   */
  async destroy(): Promise<void> {
    // Trenne alle Effekt-Verbindungen
    for (const [id, effect] of this.effects) {
      for (const node of effect.nodes) {
        try {
          if ('disconnect' in node) {
            (node as any).disconnect();
          }
        } catch (e) {
          // Node war möglicherweise bereits getrennt
        }
      }
    }
    
    this.effects.clear();
    this.masterEffects.clear();
    
    console.log('EffectProcessor zerstört');
  }

  /**
   * Gibt den Status des EffectProcessors zurück
   */
  getStatus(): {
    activeEffects: number;
    effectTypes: EffectType[];
  } {
    return {
      activeEffects: this.effects.size,
      effectTypes: Array.from(this.effects.values()).map(e => e.type)
    };
  }
}