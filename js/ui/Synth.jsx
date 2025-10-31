import React from 'react';

function Synth({ part, onSynthChange }) {
  if (!part) {
    return <div className="synth-controls">Kein Synthesizer-Part ausgewählt</div>;
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

  return (
    <div className="synth-controls">
      <h3>{part.name}</h3>
      <div className="control-group">
        <div>
          <label>Waveform</label>
          <select 
            value={synth.waveform} 
            onChange={(e) => onSynthChange('waveform', e.target.value)}
          >
            <option value="sine">Sine</option>
            <option value="triangle">Triangle</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="square">Square</option>
          </select>
        </div>
        <div>
          <label>Cutoff</label>
          <input
            type="range"
            min="120"
            max="18000"
            step="1"
            value={synth.cutoff}
            onChange={(e) => onSynthChange('cutoff', e.target.value)}
          />
          <span>{synth.cutoff} Hz</span>
        </div>
        <div>
          <label>Resonance</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={synth.resonance}
            onChange={(e) => onSynthChange('resonance', e.target.value)}
          />
          <span>{(synth.resonance * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div className="control-group">
        <div>
          <label>Attack</label>
          <input
            type="range"
            min="0.001"
            max="0.8"
            step="0.001"
            value={synth.attack}
            onChange={(e) => onSynthChange('attack', e.target.value)}
          />
          <span>{(synth.attack * 1000).toFixed(0)}ms</span>
        </div>
        <div>
          <label>Decay</label>
          <input
            type="range"
            min="0.001"
            max="0.8"
            step="0.001"
            value={synth.decay}
            onChange={(e) => onSynthChange('decay', e.target.value)}
          />
          <span>{(synth.decay * 1000).toFixed(0)}ms</span>
        </div>
        <div>
          <label>Sustain</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={synth.sustain}
            onChange={(e) => onSynthChange('sustain', e.target.value)}
          />
          <span>{(synth.sustain * 100).toFixed(0)}%</span>
        </div>
        <div>
          <label>Release</label>
          <input
            type="range"
            min="0.01"
            max="2"
            step="0.01"
            value={synth.release}
            onChange={(e) => onSynthChange('release', e.target.value)}
          />
          <span>{synth.release.toFixed(2)}s</span>
        </div>
      </div>
    </div>
  );
}

export default Synth;
