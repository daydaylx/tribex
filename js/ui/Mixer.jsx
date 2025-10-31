import React from 'react';

function Mixer({ parts, onMixerChange, onSolo, onMute }) {
  if (!parts) {
    return null;
  }

  return (
    <div className="mixer">
      {parts.map((part, index) => (
        <div key={part.id} className="mixer-channel">
          <label>{part.name}</label>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.01"
            value={part.mixer.gain}
            onChange={(e) => onMixerChange(index, 'gain', e.target.value)}
          />
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={part.mixer.pan}
            onChange={(e) => onMixerChange(index, 'pan', e.target.value)}
          />
          <button onClick={() => onSolo(index)} className={part.solo ? 'on' : ''}>S</button>
          <button onClick={() => onMute(index)} className={part.mute ? 'on' : ''}>M</button>
        </div>
      ))}
    </div>
  );
}

export default Mixer;
