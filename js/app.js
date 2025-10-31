import { AudioEngine } from './audio-engine.js';
import { Sampler } from './sampler.js';
import { Sequencer } from './sequencer.js';
import { createDefaultParts, KIT_PRESETS } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
  const audioEngine = new AudioEngine();
  await audioEngine.init();

  const sampler = new Sampler(audioEngine);
  await sampler.loadKit('tr909');

  const sequencer = new Sequencer(audioEngine);

  const parts = createDefaultParts();
  const pattern = {
    id: 'pattern-1',
    steps: parts.map(part => {
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

  sequencer.setPattern(pattern);

  sequencer.on('step', ({ events }) => {
    events.forEach(event => {
      const part = parts[event.partIndex];
      sampler.play(part, event.stepData, event.time);
    });
  });

  const playButton = document.createElement('button');
  playButton.textContent = 'Play';
  playButton.addEventListener('click', () => {
    audioEngine.start();
  });

  const stopButton = document.createElement('button');
  stopButton.textContent = 'Stop';
  stopButton.addEventListener('click', () => {
    audioEngine.stop();
  });

  document.body.appendChild(playButton);
  document.body.appendChild(stopButton);
});
