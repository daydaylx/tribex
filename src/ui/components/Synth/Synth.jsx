import React from 'react';
import PropTypes from 'prop-types';

const Synth = ({ part, onSynthChange }) => {
  if (!part) {
    return (
      <div className="synth-controls">
        <h3>Synthesizer</h3>
        <p>Kein Synthesizer-Part ausgewählt</p>
      </div>
    );
  }

  // Stelle Default-Werte sicher
  const synth = part.synth || {
    waveform: 'sawtooth',
    cutoff: 10000,
    resonance: 0.2,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.7,
    release: 0.4,
    lfoRate: 3,
    lfoDepth: 0.1,
    glide: 0
  };

  // Hilfsfunktion zum Aktualisieren einzelner Parameter
  const handleChange = (param, value) => {
    if (onSynthChange) {
      onSynthChange(param, value);
    }
  };

  return (
    <div className="synth-controls">
      <h3>{part.name || 'Synthesizer'}</h3>
      <div className="synth-section">
        <h4>Oszillator</h4>
        <div className="control-group">
          <div className="control-item">
            <label>Waveform</label>
            <select 
              value={synth.waveform || 'sawtooth'} 
              onChange={(e) => handleChange('waveform', e.target.value)}
            >
              <option value="sine">Sine</option>
              <option value="triangle">Triangle</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="square">Square</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="synth-section">
        <h4>Filter</h4>
        <div className="control-group">
          <div className="control-item">
            <label>Cutoff</label>
            <input
              type="range"
              min="120"
              max="18000"
              step="10"
              value={synth.cutoff || 10000}
              onChange={(e) => handleChange('cutoff', parseFloat(e.target.value))}
            />
            <span className="value-display">{synth.cutoff || 10000} Hz</span>
          </div>
          <div className="control-item">
            <label>Resonance</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={synth.resonance || 0.2}
              onChange={(e) => handleChange('resonance', parseFloat(e.target.value))}
            />
            <span className="value-display">{(synth.resonance || 0.2).toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="synth-section">
        <h4>ADSR</h4>
        <div className="control-group">
          <div className="control-item">
            <label>Attack</label>
            <input
              type="range"
              min="0.001"
              max="0.8"
              step="0.001"
              value={synth.attack || 0.01}
              onChange={(e) => handleChange('attack', parseFloat(e.target.value))}
            />
            <span className="value-display">{(synth.attack || 0.01).toFixed(3)}s</span>
          </div>
          <div className="control-item">
            <label>Decay</label>
            <input
              type="range"
              min="0.001"
              max="0.8"
              step="0.001"
              value={synth.decay || 0.3}
              onChange={(e) => handleChange('decay', parseFloat(e.target.value))}
            />
            <span className="value-display">{(synth.decay || 0.3).toFixed(3)}s</span>
          </div>
          <div className="control-item">
            <label>Sustain</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={synth.sustain || 0.7}
              onChange={(e) => handleChange('sustain', parseFloat(e.target.value))}
            />
            <span className="value-display">{(synth.sustain || 0.7).toFixed(2)}</span>
          </div>
          <div className="control-item">
            <label>Release</label>
            <input
              type="range"
              min="0.01"
              max="2"
              step="0.01"
              value={synth.release || 0.4}
              onChange={(e) => handleChange('release', parseFloat(e.target.value))}
            />
            <span className="value-display">{(synth.release || 0.4).toFixed(2)}s</span>
          </div>
        </div>
      </div>
      
      <div className="synth-section">
        <h4>LFO</h4>
        <div className="control-group">
          <div className="control-item">
            <label>Rate</label>
            <input
              type="range"
              min="0.1"
              max="20"
              step="0.1"
              value={synth.lfoRate || 3}
              onChange={(e) => handleChange('lfoRate', parseFloat(e.target.value))}
            />
            <span className="value-display">{(synth.lfoRate || 3).toFixed(1)} Hz</span>
          </div>
          <div className="control-item">
            <label>Depth</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={synth.lfoDepth || 0.1}
              onChange={(e) => handleChange('lfoDepth', parseFloat(e.target.value))}
            />
            <span className="value-display">{(synth.lfoDepth || 0.1).toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="synth-section">
        <h4>Weitere</h4>
        <div className="control-group">
          <div className="control-item">
            <label>Glide</label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.001"
              value={synth.glide || 0}
              onChange={(e) => handleChange('glide', parseFloat(e.target.value))}
            />
            <span className="value-display">{(synth.glide || 0).toFixed(3)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

Synth.propTypes = {
  part: PropTypes.object,
  onSynthChange: PropTypes.func
};

export default Synth;