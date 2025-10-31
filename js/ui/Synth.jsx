import React from 'react';

function Synth({ part, onSynthChange }) {
  if (!part || !part.synth) {
    return null;
  }

  return (
    <div className="synth-controls">
      <h3>{part.name}</h3>
      <div>
        <label>Waveform</label>
        <select value={part.synth.waveform} onChange={(e) => onSynthChange('waveform', e.target.value)}>
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
          value={part.synth.cutoff}
          onChange={(e) => onSynthChange('cutoff', e.target.value)}
        />
      </div>
      <div>
        <label>Resonance</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={part.synth.resonance}
          onChange={(e) => onSynthChange('resonance', e.target.value)}
        />
      </div>
      <div>
        <label>Attack</label>
        <input
          type="range"
          min="0.001"
          max="0.8"
          step="0.001"
          value={part.synth.attack}
          onChange={(e) => onSynthChange('attack', e.target.value)}
        />
      </div>
      <div>
        <label>Decay</label>
        <input
          type="range"
          min="0.001"
          max="0.8"
          step="0.001"
          value={part.synth.decay}
          onChange={(e) => onSynthChange('decay', e.target.value)}
        />
      </div>
      <div>
        <label>Sustain</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={part.synth.sustain}
          onChange={(e) => onSynthChange('sustain', e.target.value)}
        />
      </div>
      <div>
        <label>Release</label>
        <input
          type="range"
          min="0.01"
          max="2"
          step="0.01"
          value={part.synth.release}
          onChange={(e) => onSynthChange('release', e.target.value)}
        />
      </div>
    </div>
  );
}

export default Synth;
