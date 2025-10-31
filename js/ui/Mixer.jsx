import React from 'react';

function Mixer({ parts, onMixerChange, onSolo, onMute }) {
  if (!parts) {
    return null;
  }

  return (
    <div className="mixer">
      {parts.map((part, index) => {
        // Stelle sicher, dass Mixer-Einstellungen vorhanden sind
        const mixer = part.mixer || { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 };
        const isSolo = part.solo || false;
        const isMute = part.mute || false;
        
        return (
          <div key={part.id} className="mixer-channel">
            <label>{part.name}</label>
            <div className="mixer-controls">
              <div className="gain-control">
                <label>Gain</label>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  value={mixer.gain}
                  onChange={(e) => onMixerChange(index, 'gain', e.target.value)}
                />
              </div>
              <div className="pan-control">
                <label>Pan</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={mixer.pan}
                  onChange={(e) => onMixerChange(index, 'pan', e.target.value)}
                />
              </div>
            </div>
            <div className="aux-controls">
              <button 
                onClick={() => onSolo(index)} 
                className={`solo-button ${isSolo ? 'active' : ''}`}
                title="Toggle Solo"
              >
                S
              </button>
              <button 
                onClick={() => onMute(index)} 
                className={`mute-button ${isMute ? 'active' : ''}`}
                title="Toggle Mute"
              >
                M
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Mixer;
