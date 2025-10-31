// Zentrale Utility-Funktionen für TribeX
// Diese Datei enthält wiederverwendbare Funktionen für das gesamte Projekt

// Allgemeine Hilfsfunktionen
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const dbToGain = (db: number): number => {
  return Math.pow(10, db / 20);
};

export const gainToDb = (gain: number): number => {
  return 20 * Math.log10(gain);
};

export const linearToExponential = (value: number, min: number, max: number): number => {
  return min * Math.pow(max / min, value);
};

export const exponentialToLinear = (value: number, min: number, max: number): number => {
  return Math.log(value / min) / Math.log(max / min);
};

// Audio-zeitliche Berechnungen
export const stepDurationSeconds = (bpm: number, stepDivision: number = 4): number => {
  const beatsPerSecond = bpm / 60;
  return 1 / beatsPerSecond / stepDivision;
};

// Zeitstreckung (Time-Stretching)
export const calculateStretchRatio = (originalBpm: number, targetBpm: number): number => {
  return originalBpm / targetBpm;
};

// MIDI-Noten zu Frequenz
export const midiNoteToFrequency = (note: number): number => {
  return 440 * Math.pow(2, (note - 69) / 12);
};

// Frequenz zu MIDI-Note
export const frequencyToMidiNote = (frequency: number): number => {
  return 69 + 12 * Math.log2(frequency / 440);
};

// Rundungsfunktionen
export const roundToStep = (value: number, step: number): number => {
  return Math.round(value / step) * step;
};

// Zufallsfunktionen
export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const weightedRandom = (items: {item: any, weight: number}[]): any => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item.item;
    }
  }
  
  return items[0].item; // Fallback
};

// Export aller Funktionen
export default {
  clamp,
  dbToGain,
  gainToDb,
  linearToExponential,
  exponentialToLinear,
  stepDurationSeconds,
  calculateStretchRatio,
  midiNoteToFrequency,
  frequencyToMidiNote,
  roundToStep,
  randomRange,
  weightedRandom
};