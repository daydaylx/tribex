export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function expoInterpolate(a, b, t) {
  const expA = Math.exp(a);
  const expB = Math.exp(b);
  return Math.log(lerp(expA, expB, t));
}

export function dbToGain(db) {
  return Math.pow(10, db / 20);
}

export function gainToDb(gain) {
  return 20 * Math.log10(gain);
}

export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function deepClone(data) {
  return structuredClone ? structuredClone(data) : JSON.parse(JSON.stringify(data));
}

export function stepDurationSeconds(bpm) {
  const beatsPerSecond = bpm / 60;
  return 1 / (beatsPerSecond * 4);
}

export function quantize(value, quantum) {
  return Math.round(value / quantum) * quantum;
}

export function formatTime(seconds) {
  return `${seconds.toFixed(2)}s`;
}
