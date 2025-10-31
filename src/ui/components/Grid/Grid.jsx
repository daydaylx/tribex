import React from 'react';
import PropTypes from 'prop-types';

const Grid = ({ pattern, parts, onStepToggle, currentStep = -1 }) => {
  if (!pattern || !parts) {
    return <div className="grid">Kein Pattern oder Parts vorhanden</div>;
  }

  if (!pattern.steps || !Array.isArray(pattern.steps) || pattern.steps.length === 0) {
    return <div className="grid">Pattern hat keine Steps</div>;
  }

  return (
    <div className="grid">
      {pattern.steps.map((row, partIndex) => {
        const part = parts[partIndex];
        if (!part) return null;

        return (
          <div key={`row-${partIndex}`} className="grid-row">
            <div className="part-label" title={part.name}>
              {part.name}
            </div>
            <div className="steps-container">
              {row.map((step, stepIndex) => {
                const isActive = currentStep === stepIndex;
                const stepData = step || { on: false, vel: 1, accent: false, prob: 1 };
                
                // Farbe basierend auf Part-Typ
                const getPartColor = () => {
                  const type = part.type || 'default';
                  const colors = {
                    kick: '#ff6b6b',
                    snare: '#4ecdc4',
                    clap: '#ffbe0b',
                    hihat: '#fb5607',
                    cymbal: '#8338ec',
                    perc: '#ff006e',
                    synth: '#00f5d4',
                    default: '#9b5de5'
                  };
                  return colors[type] || colors.default;
                };

                return (
                  <button
                    key={`step-${partIndex}-${stepIndex}`}
                    className={`step-btn ${stepData.on ? 'active' : ''} ${isActive ? 'current' : ''}`}
                    onClick={() => onStepToggle(partIndex, stepIndex)}
                    style={{
                      backgroundColor: stepData.on ? getPartColor() : '#333',
                      opacity: stepData.vel || 1,
                      border: stepData.accent ? '2px solid gold' : '1px solid #555'
                    }}
                    title={`Step ${stepIndex + 1}, Velocity: ${(stepData.vel * 100).toFixed(0)}%`}
                  >
                    {stepIndex + 1}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

Grid.propTypes = {
  pattern: PropTypes.shape({
    id: PropTypes.string.isRequired,
    steps: PropTypes.arrayOf(PropTypes.array).isRequired
  }).isRequired,
  parts: PropTypes.array.isRequired,
  onStepToggle: PropTypes.func.isRequired,
  currentStep: PropTypes.number
};

export default Grid;