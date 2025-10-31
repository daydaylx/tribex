import React from 'react';
import Grid from './Grid.jsx';

function Sequencer({ pattern, parts, onStepToggle, onPlay, onStop }) {
  return (
    <div>
      <div className="controls">
        <button onClick={onPlay}>Play</button>
        <button onClick={onStop}>Stop</button>
      </div>
      <Grid pattern={pattern} parts={parts} onStepToggle={onStepToggle} />
    </div>
  );
}

export default Sequencer;
