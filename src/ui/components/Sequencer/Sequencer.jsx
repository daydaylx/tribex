import React, { useState, useEffect } from 'react';
import Grid from '../Grid/Grid';
import PropTypes from 'prop-types';

const Sequencer = ({ 
  pattern, 
  parts, 
  onStepToggle, 
  onPlay, 
  onStop, 
  isPlaying = false,
  currentStep = -1,
  onBpmChange 
}) => {
  const [bpm, setBpm] = useState(120);

  const handleBpmChange = (e) => {
    const newBpm = parseInt(e.target.value);
    setBpm(newBpm);
    if (onBpmChange) {
      onBpmChange(newBpm);
    }
  };

  return (
    <div className="sequencer">
      <div className="sequencer-header">
        <h3>Sequencer</h3>
        <div className="sequencer-controls">
          <button 
            onClick={isPlaying ? onStop : onPlay}
            className={`transport-button ${isPlaying ? 'playing' : 'stopped'}`}
          >
            {isPlaying ? '⏹' : '▶'}
          </button>
          <div className="bpm-control">
            <label>BPM:</label>
            <input
              type="number"
              min="60"
              max="240"
              value={bpm}
              onChange={handleBpmChange}
              disabled={isPlaying} // BPM-Änderung während der Wiedergabe verhindern
            />
          </div>
        </div>
      </div>
      
      <div className="sequencer-content">
        {pattern && parts && (
          <Grid 
            pattern={pattern} 
            parts={parts} 
            onStepToggle={onStepToggle}
            currentStep={currentStep}
          />
        )}
      </div>
    </div>
  );
};

Sequencer.propTypes = {
  pattern: PropTypes.object,
  parts: PropTypes.array,
  onStepToggle: PropTypes.func.isRequired,
  onPlay: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  isPlaying: PropTypes.bool,
  currentStep: PropTypes.number,
  onBpmChange: PropTypes.func
};

export default Sequencer;