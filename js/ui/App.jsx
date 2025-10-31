import React, { useState, useEffect } from 'react';

// Importiere die neuen Komponenten aus der src Struktur
import Sequencer from '../../src/ui/components/Sequencer/Sequencer';
import Mixer from '../../src/ui/components/Mixer/Mixer';
import Synth from '../../src/ui/components/Synth/Synth';
import Transport from '../../src/ui/components/Transport/Transport';

// Importiere die benötigten Module aus dem neuen src-Verzeichnis
import { AudioEngineV2 as AudioEngine } from '../../src/core/audio-engine/AudioEngineV2';
import { Sequencer as SequencerClass } from '../../src/core/sequencer/Sequencer';
// createDefaultParts ist bereits in tribeX-types.ts verfügbar
import { createDefaultParts } from '../../src/tribeX-types';

function App() {
  const [audioEngine, setAudioEngine] = useState(null);
  const [sequencer, setSequencer] = useState(null);
  const [pattern, setPattern] = useState(null);
  const [parts, setParts] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(120);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialisiere die AudioEngine
        const engine = new AudioEngine({});
        await engine.initialize();

        // Initialisiere den Sequencer
        const seq = new SequencerClass(engine, {
          onStep: (stepIndex, time) => {
            // Aktualisiere den aktuellen Step für UI-Feedback
            setCurrentStep(stepIndex);
          },
          onPlay: () => {
            setIsPlaying(true);
          },
          onStop: () => {
            setIsPlaying(false);
            setCurrentStep(-1); // Zurücksetzen des aktuellen Steps
          },
          onTempoChange: (newBpm) => {
            setBpm(newBpm);
          }
        });

        // Setze die BPM im Sequencer
        seq.setBpm(bpm);

        // Erstelle Standard-Parts
        const initialParts = createDefaultParts();
        setParts(initialParts);

        // Erstelle ein Standard-Pattern
        const initialPattern = {
          id: 'pattern-1',
          steps: initialParts.map(part => {
            const steps = new Array(16).fill(null);
            if (part.type === 'kick') {
              steps[0] = { on: true, vel: 1 };
              steps[4] = { on: true, vel: 1 };
              steps[8] = { on: true, vel: 1 };
              steps[12] = { on: true, vel: 1 };
            }
            return steps;
          })
        };

        // Setze Projekt und Pattern im Sequencer
        seq.setProject({
          id: 'demo-project',
          name: 'Demo Projekt',
          bpm: bpm,
          swing: 0,
          lengthSteps: 16,
          kit: 'tr909',
          parts: initialParts,
          patterns: [initialPattern],
          chain: [],
          version: '1.0',
          master: { tilt: 0, clip: -0.3 }
        });
        
        seq.setPattern(initialPattern.id);
        setPattern(initialPattern);

        setAudioEngine(engine);
        setSequencer(seq);

        console.log('TribeX App initialisiert');
      } catch (error) {
        console.error('Fehler bei der Initialisierung:', error);
      }
    };

    init();

    // Cleanup-Funktion
    return () => {
      if (audioEngine) {
        audioEngine.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (audioEngine && parts) {
      // Aktualisiere den Mixer mit den Parts
      // In einer vollständigen Implementierung würden wir den Mixer mit aktuellen Parts aktualisieren
    }
  }, [parts, audioEngine]);

  const handlePlay = () => {
    if (sequencer) {
      sequencer.start();
    }
  };

  const handleStop = () => {
    if (sequencer) {
      sequencer.stop();
    }
  };

  const handleRecord = () => {
    // Funktion für Aufnahme/Recording
    console.log('Recording function would start here');
  };

  const handleBpmChange = (newBpm) => {
    setBpm(newBpm);
    if (sequencer) {
      sequencer.setBpm(newBpm);
    }
  };

  const handleStepToggle = (rowIndex, stepIndex) => {
    if (!pattern || !sequencer) return;
    
    const newPattern = JSON.parse(JSON.stringify(pattern));
    const currentStep = newPattern.steps[rowIndex][stepIndex];
    
    // Toggle Step on/off
    if (currentStep && currentStep.on) {
      newPattern.steps[rowIndex][stepIndex] = { ...currentStep, on: false };
    } else {
      newPattern.steps[rowIndex][stepIndex] = { on: true, vel: 1, accent: false, prob: 1 };
    }
    
    setPattern(newPattern);
    // In einer vollständigen Implementierung würde dies das aktuelle Pattern im Sequencer aktualisieren
  };

  const handleMixerChange = (partIndex, param, value) => {
    if (!parts) return;
    
    const newParts = [...parts];
    if (!newParts[partIndex].mixer) {
      newParts[partIndex].mixer = { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 };
    }
    
    newParts[partIndex].mixer[param] = parseFloat(value);
    setParts(newParts);
    
    // Aktualisiere das Audio-Modul entsprechend
    if (audioEngine && audioEngine.mixer) {
      audioEngine.mixer.updatePart(newParts[partIndex].id, newParts[partIndex].mixer);
    }
  };

  const handleSolo = (partIndex) => {
    if (!parts) return;
    
    const newParts = [...parts];
    newParts[partIndex].solo = !newParts[partIndex].solo;
    setParts(newParts);
  };

  const handleMute = (partIndex) => {
    if (!parts) return;
    
    const newParts = [...parts];
    newParts[partIndex].mute = !newParts[partIndex].mute;
    setParts(newParts);
  };

  const handleSynthChange = (param, value) => {
    if (!parts) return;
    
    const newParts = [...parts];
    const synthPart = newParts.find(p => p.type === 'synth' || p.id.includes('synth'));
    if (synthPart && synthPart.synth) {
      synthPart.synth[param] = value;
      setParts(newParts);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>TribeX Sequencer</h1>
        <Transport
          isPlaying={isPlaying}
          onPlay={handlePlay}
          onStop={handleStop}
          onRecord={handleRecord}
          bpm={bpm}
          onBpmChange={handleBpmChange}
        />
      </header>
      
      {pattern && parts && (
        <main className="app-main">
          <Sequencer
            pattern={pattern}
            parts={parts}
            onStepToggle={handleStepToggle}
            onPlay={handlePlay}
            onStop={handleStop}
            isPlaying={isPlaying}
            currentStep={currentStep}
            onBpmChange={handleBpmChange}
          />
          <Mixer 
            parts={parts} 
            onMixerChange={handleMixerChange} 
            onSolo={handleSolo} 
            onMute={handleMute} 
          />
          <Synth 
            part={parts.find(p => p.type === 'synth' || p.id.includes('synth'))} 
            onSynthChange={handleSynthChange} 
          />
        </main>
      )}
    </div>
  );
}

export default App;
