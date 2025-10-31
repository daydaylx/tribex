import Sequencer from './Sequencer.jsx';
import Mixer from './Mixer.jsx';
import Synth from './Synth.jsx';

function App() {
  const [audioEngine, setAudioEngine] = useState(null);
  const [sequencer, setSequencer] = useState(null);
  const [pattern, setPattern] = useState(null);
  const [parts, setParts] = useState(null);

  useEffect(() => {
    const init = async () => {
      const engine = new AudioEngine();
      await engine.init();

      const sampler = new Sampler(engine, engine.mixer);
      await sampler.loadKit('tr909');

      const synth = new Synth(engine.context, engine.mixer);

      const seq = new SequencerEngine(engine);

      const initialParts = createDefaultParts();
      setParts(initialParts);

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

      seq.setPattern(initialPattern);
      setPattern(initialPattern);

      seq.on('step', ({ events }) => {
        events.forEach(event => {
          const part = initialParts[event.partIndex];
          if (part.type === 'synth') {
            synth.trigger(part, event.stepData, event.time);
          } else {
            sampler.play(part, event.stepData, event.time);
          }
        });
      });

      setAudioEngine(engine);
      setSequencer(seq);
    };

    init();
  }, []);

  useEffect(() => {
    if (audioEngine && parts) {
      audioEngine.mixer.update(parts);
    }
  }, [parts]);

  const handlePlay = () => {
    if (audioEngine) {
      audioEngine.start();
    }
  };

  const handleStop = () => {
    if (audioEngine) {
      audioEngine.stop();
    }
  };

  const handleStepToggle = (rowIndex, stepIndex) => {
    const newPattern = { ...pattern };
    const step = newPattern.steps[rowIndex][stepIndex];
    newPattern.steps[rowIndex][stepIndex] = step ? null : { on: true, vel: 1 };
    setPattern(newPattern);
    sequencer.setPattern(newPattern);
  };

  const handleMixerChange = (partIndex, param, value) => {
    const newParts = [...parts];
    newParts[partIndex].mixer[param] = parseFloat(value);
    setParts(newParts);
  };

  const handleSolo = (partIndex) => {
    const newParts = [...parts];
    newParts[partIndex].solo = !newParts[partIndex].solo;
    setParts(newParts);
  };

  const handleMute = (partIndex) => {
    const newParts = [...parts];
    newParts[partIndex].mute = !newParts[partIndex].mute;
    setParts(newParts);
  };

  const handleSynthChange = (param, value) => {
    const newParts = [...parts];
    const synthPart = newParts.find(p => p.type === 'synth');
    if (synthPart) {
      synthPart.synth[param] = value;
      setParts(newParts);
    }
  };

  return (
    <div>
      <h1>TribeX</h1>
      <Sequencer
        pattern={pattern}
        parts={parts}
        onStepToggle={handleStepToggle}
        onPlay={handlePlay}
        onStop={handleStop}
      />
      <Mixer parts={parts} onMixerChange={handleMixerChange} onSolo={handleSolo} onMute={handleMute} />
      {parts && <Synth part={parts.find(p => p.type === 'synth')} onSynthChange={handleSynthChange} />}
    </div>
  );
}

export default App;
