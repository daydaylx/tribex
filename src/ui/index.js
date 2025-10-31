// Zentrale Exportdatei für UI-Komponenten
// src/ui/index.js

export { default as App } from '../js/ui/App.jsx';
export { default as Transport } from './components/Transport/Transport.jsx';
export { default as Sequencer } from './components/Sequencer/Sequencer.jsx';
export { default as Grid } from './components/Grid/Grid.jsx';
export { default as Mixer } from './components/Mixer/Mixer.jsx';
export { default as Synth } from './components/Synth/Synth.jsx';

// Exportiere auch Hooks, falls implementiert
export * from './hooks';

// Exportiere auch Store-Komponenten, falls implementiert
export * from './store';