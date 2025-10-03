import { clamp, lerp } from './utils.js';

function findSegment(points, timeBeats) {
  if (points.length === 0) return null;
  if (timeBeats <= points[0].timeBeats) {
    return { a: points[0], b: points[0], t: 0 };
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (timeBeats >= a.timeBeats && timeBeats <= b.timeBeats) {
      const span = b.timeBeats - a.timeBeats;
      const t = span === 0 ? 0 : (timeBeats - a.timeBeats) / span;
      return { a, b, t };
    }
  }
  const last = points[points.length - 1];
  return { a: last, b: last, t: 0 };
}

function interpolate(segment) {
  const { a, b, t } = segment;
  if (!a || !b) return null;
  if (a.interp === 'expo' || b.interp === 'expo') {
    const expA = Math.max(a.value, 1e-4);
    const expB = Math.max(b.value, 1e-4);
    const value = Math.exp(Math.log(expA) + (Math.log(expB) - Math.log(expA)) * t);
    return clamp(value, 0, 1);
  }
  return clamp(lerp(a.value, b.value, t), 0, 1);
}

export class MotionEngine {
  constructor() {
    this.motion = new Map();
  }

  _key(partId, paramId) {
    return `${partId}::${paramId}`;
  }

  setMotion(partId, paramId, points) {
    const key = this._key(partId, paramId);
    this.motion.set(key, [...points].sort((a, b) => a.timeBeats - b.timeBeats));
  }

  getPoints(partId, paramId) {
    return this.motion.get(this._key(partId, paramId)) || [];
  }

  addPoint(partId, paramId, point) {
    const key = this._key(partId, paramId);
    const points = this.motion.get(key) || [];
    points.push(point);
    points.sort((a, b) => a.timeBeats - b.timeBeats);
    this.motion.set(key, points);
  }

  clearPart(partId) {
    [...this.motion.keys()].forEach(key => {
      if (key.startsWith(`${partId}::`)) {
        this.motion.delete(key);
      }
    });
  }

  valueAt(partId, paramId, timeBeats) {
    const points = this.getPoints(partId, paramId);
    if (points.length === 0) return null;
    const segment = findSegment(points, timeBeats);
    return interpolate(segment);
  }
}
