import React from 'react';
import PropTypes from 'prop-types';

const Transport = ({ isPlaying, onPlay, onStop, onRecord, bpm, onBpmChange }) => {
  return (
    <div className="transport">
      <div className="transport-controls">
        <button 
          onClick={onStop}
          className="transport-button stop"
          title="Stop"
        >
          ⏹
        </button>
        <button 
          onClick={onPlay}
          className={`transport-button play ${isPlaying ? 'active' : ''}`}
          title={isPlaying ? "Stop" : "Play"}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button 
          onClick={onRecord}
          className="transport-button record"
          title="Record"
        >
          ●
        </button>
      </div>
      
      <div className="bpm-control">
        <label htmlFor="bpm-input">BPM:</label>
        <input
          id="bpm-input"
          type="number"
          min="60"
          max="240"
          value={bpm}
          onChange={(e) => onBpmChange && onBpmChange(parseInt(e.target.value))}
          disabled={isPlaying}
        />
      </div>
      
      <div className="status-indicators">
        <div className={`status-indicator ${isPlaying ? 'active' : ''}`}>
          <span className="status-dot"></span>
          <span>{isPlaying ? 'PLAY' : 'STOP'}</span>
        </div>
      </div>
    </div>
  );
};

Transport.propTypes = {
  isPlaying: PropTypes.bool.isRequired,
  onPlay: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  onRecord: PropTypes.func,
  bpm: PropTypes.number,
  onBpmChange: PropTypes.func
};

Transport.defaultProps = {
  onRecord: () => {},
  bpm: 120
};

export default Transport;