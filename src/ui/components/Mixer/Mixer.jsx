import React from 'react';
import PropTypes from 'prop-types';

const Mixer = ({ parts, onMixerChange, onSolo, onMute }) => {
  if (!parts || !Array.isArray(parts)) {
    return <div className="mixer">Keine Parts vorhanden</div>;
  }

  return (
    <div className="mixer">
      <h3>Mixer</h3>
      <div className="mixer-channels">
        {parts.map((part, index) => {
          // Stelle sicher, dass Mixer-Einstellungen vorhanden sind
          const mixer = part.mixer || { gain: 0.8, pan: 0, hp: 20, lp: 20000, drive: 0 };
          const isSolo = part.solo || false;
          const isMute = part.mute || false;
          
          return (
            <div key={part.id || `part-${index}`} className="mixer-channel">
              <div className="channel-header">
                <span className="channel-name">{part.name}</span>
                <div className="channel-status">
                  <span className={`solo-indicator ${isSolo ? 'active' : ''}`}>S</span>
                  <span className={`mute-indicator ${isMute ? 'active' : ''}`}>M</span>
                </div>
              </div>
              
              <div className="channel-controls">
                <div className="fader-group">
                  <div className="control-item">
                    <label>Gain</label>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.01"
                      value={mixer.gain || 0.8}
                      onChange={(e) => onMixerChange(index, 'gain', e.target.value)}
                    />
                    <span className="value-display">{(mixer.gain || 0.8).toFixed(2)}</span>
                  </div>
                  
                  <div className="control-item">
                    <label>Pan</label>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={mixer.pan || 0}
                      onChange={(e) => onMixerChange(index, 'pan', e.target.value)}
                    />
                    <span className="value-display">{(mixer.pan || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="control-item">
                    <label>LP</label>
                    <input
                      type="range"
                      min="20"
                      max="20000"
                      step="10"
                      value={mixer.lp || 20000}
                      onChange={(e) => onMixerChange(index, 'lp', e.target.value)}
                    />
                    <span className="value-display">{mixer.lp || 20000}Hz</span>
                  </div>
                  
                  <div className="control-item">
                    <label>HP</label>
                    <input
                      type="range"
                      min="20"
                      max="20000"
                      step="10"
                      value={mixer.hp || 20}
                      onChange={(e) => onMixerChange(index, 'hp', e.target.value)}
                    />
                    <span className="value-display">{mixer.hp || 20}Hz</span>
                  </div>
                </div>
                
                <div className="channel-buttons">
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

Mixer.propTypes = {
  parts: PropTypes.array.isRequired,
  onMixerChange: PropTypes.func.isRequired,
  onSolo: PropTypes.func.isRequired,
  onMute: PropTypes.func.isRequired
};

export default Mixer;