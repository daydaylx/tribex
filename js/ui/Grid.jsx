import React from 'react';

function Grid({ pattern, parts, onStepToggle }) {
  if (!pattern) {
    return null;
  }

  return (
    <div className="grid">
      {pattern.steps.map((row, rowIndex) => (
        <div key={rowIndex} className="row">
          <div className="part-label">{parts[rowIndex].name}</div>
          <div className="steps">
            {row.map((step, stepIndex) => (
              <button
                key={stepIndex}
                className={`step ${step?.on ? 'on' : ''}`}
                onClick={() => onStepToggle(rowIndex, stepIndex)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Grid;
