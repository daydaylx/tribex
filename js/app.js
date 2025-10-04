import { Router } from './router.js';
import { ChatPage, ModelsPage, SettingsPage } from './pages.js';
import { Sequencer } from './sequencer.js';
import { Mixer } from './mixer.js';
import { SampleEngine, createDefaultParts } from './engine.js';
import { MotionEngine } from './motion.js';
import { exportProjectToWav } from './exporter.js';
import { uuid } from './utils.js';

const STORAGE_KEY = 'tribex-project-v1';
const PATTERNS_PER_BANK = 16;
const BANKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const state = {
  project: null,
  audioContext: null,
  mixer: null,
  engine: null,
  sequencer: null,
  motion: null,
  currentPatternId: null,
  currentBank: 'A',
  selectedStep: null,
  motionTarget: null,
  motionRecord: false,
  audioReady: false
};

const ui = {};

function createEmptyStep(index) {
  return {
    index,
    on: false,
    vel: 1,
    accent: false,
    prob: 1,
    ratchet: 1,
    microMs: 0,
    note: 60,
    detune: 0
  };
}

function createPattern(bank, slot, partsCount, length) {
  return {
    id: uuid(),
    bank,
    slot,
    name: `${bank}${slot + 1}`,
    steps: Array.from({ length: partsCount }, () => (
      Array.from({ length }, (_, index) => createEmptyStep(index))
    ))
  };
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiNoteName(value) {
  if (Number.isNaN(value) || value === undefined || value === null) {
    return '-';
  }
  const note = Math.max(0, Math.min(127, Math.round(value)));
  const octave = Math.floor(note / 12) - 1;
  const name = NOTE_NAMES[note % 12];
  return `${name}${octave}`;
}

function createInitialProject() {
  const parts = createDefaultParts();
  const lengthSteps = 16;
  const patterns = [];
  BANKS.forEach(bank => {
    for (let slot = 0; slot < PATTERNS_PER_BANK; slot += 1) {
      patterns.push(createPattern(bank, slot, parts.length, lengthSteps));
    }
  });
  return {
    id: uuid(),
    name: 'Neues Projekt',
    bpm: 170,
    swing: 0,
    lengthSteps,
    kit: 'tr909',
    parts,
    patterns,
    chain: [],
    version: '0.1-mvp',
    master: {
      tilt: 0,
      clip: -0.3
    }
  };
}

function ensurePatternSize(pattern, partsCount, length) {
  if (!pattern.steps) {
    pattern.steps = [];
  }
  while (pattern.steps.length < partsCount) {
    pattern.steps.push(Array.from({ length }, (_, index) => createEmptyStep(index)));
  }
  pattern.steps = pattern.steps.slice(0, partsCount);
  for (let row = 0; row < partsCount; row += 1) {
    const steps = pattern.steps[row] || [];
    if (steps.length < length) {
      for (let i = steps.length; i < length; i += 1) {
        steps.push(createEmptyStep(i));
      }
    } else if (steps.length > length) {
      pattern.steps[row] = steps.slice(0, length);
    }
  }
}

function hydrateProject(raw) {
  const project = { ...createInitialProject(), ...raw };
  const defaults = createDefaultParts();
  project.parts = (raw.parts || defaults).map((part, index) => {
    const base = defaults[index] || defaults[defaults.length - 1];
    return {
      ...base,
      ...part,
      mixer: { ...base.mixer, ...(part?.mixer || {}) },
      params: { ...base.params, ...(part?.params || {}) },
      synth: base.synth ? { ...base.synth, ...(part?.synth || {}) } : undefined,
      motion: part?.motion ? [...part.motion] : []
    };
  });
  project.patterns = raw.patterns?.map(pattern => ({
    ...pattern,
    steps: pattern.steps ? pattern.steps.map((row, rowIndex) => (
      row.map((step, stepIndex) => ({
        ...createEmptyStep(stepIndex),
        ...step,
        index: stepIndex
      }))
    )) : []
  })) || [];
  project.patterns.forEach(pattern => ensurePatternSize(pattern, project.parts.length, project.lengthSteps));
  return project;
}

function saveProjectToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project));
    setStatus('Projekt gespeichert.');
  } catch (error) {
    setStatus(`Speichern fehlgeschlagen: ${error.message}`);
  }
}

function loadProjectFromStorage() {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    const data = JSON.parse(json);
    return hydrateProject(data);
  } catch (error) {
    console.warn('Projekt konnte nicht geladen werden', error);
    return null;
  }
}

function getCurrentPattern() {
  return state.project.patterns.find(pattern => pattern.id === state.currentPatternId);
}

function setCurrentPattern(patternId) {
  state.currentPatternId = patternId;
  const pattern = getCurrentPattern();
  if (pattern && state.sequencer) {
    state.sequencer.setPattern(pattern);
  }
  renderPatternList();
  renderStepGrid();
  renderChain();
}

function setStatus(message) {
  if (!ui.exportStatus) return;
  ui.exportStatus.textContent = message;
}

function updateStatusCards() {
  if (!ui.statusBpm) return;
  const project = state.project || {};
  ui.statusBpm.textContent = Math.round(project.bpm ?? 0);
  ui.statusSteps.textContent = project.lengthSteps ?? '-';
  ui.statusKit.textContent = (project.kit || '–').toUpperCase();
  const chainCount = project.chain ? project.chain.length : 0;
  ui.statusChain.textContent = chainCount;
}

async function setupAudio() {
  if (state.audioContext) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  state.audioContext = new AudioContextClass({ sampleRate: 48000 });
  state.mixer = new Mixer(state.audioContext);
  state.motion = new MotionEngine();
  state.engine = new SampleEngine(state.audioContext, state.mixer);
  state.sequencer = new Sequencer(state.audioContext, state.engine, state.mixer, state.motion);
  await state.sequencer.initClock();
  await state.engine.loadKit(state.project.kit, progress => {
    setStatus(`Kit lädt… ${(progress * 100).toFixed(0)}%`);
  });
  state.project.parts.forEach((part, index) => {
    state.project.parts[index].samplePath = part.samplePath;
    state.engine.mixer.updatePart(part.id, part.mixer);
  });
  updateStatusCards();
  state.sequencer.setProject(state.project);
  state.sequencer.on('step', handleSequencerStep);
  state.sequencer.on('start', time => setStatus(`Start @ ${(time - state.audioContext.currentTime).toFixed(2)}s`));
  state.sequencer.on('patternEnd', () => renderChainPosition());
  state.sequencer.on('stop', () => {
    ui.btnPlay.setAttribute('aria-pressed', 'false');
  });
  state.sequencer.on('resolvePattern', patternId => state.project.patterns.find(p => p.id === patternId));
  state.sequencer.on('patternChange', pattern => {
    if (pattern) {
      state.currentPatternId = pattern.id;
      renderPatternList();
      renderStepGrid();
      renderChainPosition();
    }
  });
  const currentPattern = getCurrentPattern();
  if (currentPattern) {
    state.sequencer.setPattern(currentPattern);
  }
  state.sequencer.setChain(state.project.chain);
  state.mixer.setMasterTilt(state.project.master.tilt);
  state.mixer.setMasterClip(state.project.master.clip);
  state.sequencer.setBpm(state.project.bpm);
  state.sequencer.setSwing(state.project.swing * 100);
}

function renderTransport() {
  ui.tempo.value = state.project.bpm;
  ui.swing.value = state.project.swing * 100;
  ui.swingValue.textContent = `${Math.round(state.project.swing * 100)}%`;
  ui.stepLength.value = state.project.lengthSteps;
  ui.kit.value = state.project.kit;
  ui.masterTilt.value = state.project.master.tilt;
  ui.masterClip.value = state.project.master.clip;
  updateStatusCards();
}

function renderPatternList() {
  if (ui.patternBank && ui.patternBank.value !== state.currentBank) {
    ui.patternBank.value = state.currentBank;
  }
  const patternList = ui.patternList;
  patternList.innerHTML = '';
  const template = document.getElementById('pattern-item-template');
  const patterns = state.project.patterns.filter(pattern => pattern.bank === state.currentBank);
  patterns.forEach(pattern => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.textContent = pattern.name;
    node.dataset.patternId = pattern.id;
    if (pattern.id === state.currentPatternId) {
      node.classList.add('active');
    }
    node.addEventListener('click', () => {
      setCurrentPattern(pattern.id);
    });
    node.addEventListener('dblclick', () => {
      const name = prompt('Pattern-Name', pattern.name);
      if (name) {
        pattern.name = name;
        renderPatternList();
      }
    });
    patternList.appendChild(node);
  });
}

function renderChain() {
  const chainContainer = ui.chainList;
  chainContainer.innerHTML = '';
  state.project.chain.forEach((entry, index) => {
    const pattern = state.project.patterns.find(p => p.id === entry.patternId);
    if (!pattern) return;
    const chip = document.createElement('div');
    chip.className = 'chain-pattern';
    chip.dataset.index = index;
    chip.textContent = pattern.name;
    const remove = document.createElement('button');
    remove.className = 'remove';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      state.project.chain.splice(index, 1);
      renderChain();
    });
    chip.appendChild(remove);
    chainContainer.appendChild(chip);
  });
  if (state.sequencer) {
    state.sequencer.setChain(state.project.chain);
  }
  renderChainPosition();
  updateStatusCards();
}

function renderChainPosition() {
  const chips = ui.chainList.querySelectorAll('.chain-pattern');
  chips.forEach(chip => chip.classList.remove('active'));
  if (!state.sequencer || state.project.chain.length === 0) return;
  const currentIndex = state.sequencer.chainIndex % state.project.chain.length;
  const chip = chips[currentIndex];
  if (chip) chip.classList.add('active');
}

function ensureSelectedStep() {
  if (!state.selectedStep) {
    state.selectedStep = { partIndex: 0, stepIndex: 0 };
  }
  const pattern = getCurrentPattern();
  if (pattern) {
    const maxPart = Math.max(pattern.steps.length - 1, 0);
    state.selectedStep.partIndex = Math.min(state.selectedStep.partIndex, maxPart);
    const row = pattern.steps[state.selectedStep.partIndex] || [];
    const maxStep = Math.max(row.length - 1, 0);
    state.selectedStep.stepIndex = Math.min(state.selectedStep.stepIndex, maxStep);
  }
}

function renderStepGrid() {
  const grid = ui.stepGrid;
  grid.innerHTML = '';
  ensureSelectedStep();
  const templateRow = document.getElementById('step-row-template');
  const templateButton = document.getElementById('step-button-template');
  const pattern = getCurrentPattern();
  if (!pattern) return;
  pattern.steps.forEach((row, partIndex) => {
    const part = state.project.parts[partIndex];
    const rowNode = templateRow.content.cloneNode(true);
    const label = rowNode.querySelector('.part-label');
    label.textContent = part.name;
    const stepsContainer = rowNode.querySelector('.steps');
    stepsContainer.classList.toggle('extended', state.project.lengthSteps === 32);
    row.forEach((step, stepIndex) => {
      const button = templateButton.content.firstElementChild.cloneNode(true);
      button.dataset.partIndex = partIndex;
      button.dataset.stepIndex = stepIndex;
      button.dataset.step = stepIndex;
      button.dataset.partType = part.type;
      button.textContent = stepIndex + 1;
      updateStepButton(button, step);
      if (state.selectedStep.partIndex === partIndex && state.selectedStep.stepIndex === stepIndex) {
        button.classList.add('selected');
      }
      button.addEventListener('click', event => {
        event.preventDefault();
        if (event.shiftKey) {
          step.accent = !step.accent;
        } else {
          step.on = !step.on;
          if (step.on && step.vel === undefined) {
            step.vel = 1;
          }
        }
        ui.stepGrid.querySelectorAll('.step').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        state.selectedStep = { partIndex, stepIndex };
        updateStepButton(button, step);
        renderStepDetail();
      });
      button.addEventListener('contextmenu', event => {
        event.preventDefault();
        step.prob = step.prob === 1 ? 0.5 : 1;
        updateStepButton(button, step);
        renderStepDetail();
      });
      button.addEventListener('focus', () => {
        ui.stepGrid.querySelectorAll('.step').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        state.selectedStep = { partIndex, stepIndex };
        renderStepDetail();
      });
      stepsContainer.appendChild(button);
    });
    grid.appendChild(rowNode);
  });
  renderStepDetail();
}

function updateStepButton(button, step) {
  button.setAttribute('aria-pressed', step.on);
  button.classList.toggle('accent', !!step.accent);
  button.classList.toggle('prob', step.prob !== undefined && step.prob < 1);
  button.dataset.prob = step.prob ? `${Math.round(step.prob * 100)}%` : '';
  button.classList.toggle('ratchet', step.ratchet && step.ratchet > 1);
  button.classList.toggle('micro-positive', (step.microMs ?? 0) > 0);
  button.classList.toggle('micro-negative', (step.microMs ?? 0) < 0);
  if (button.dataset.partType === 'synth' && step.note !== undefined) {
    const noteName = midiNoteName(step.note);
    button.dataset.note = noteName;
    button.title = `${button.textContent} · ${noteName}`;
  } else {
    button.dataset.note = '';
    button.removeAttribute('title');
  }
}

function refreshSelectedStepButton() {
  const pattern = getCurrentPattern();
  if (!pattern || !state.selectedStep) return;
  const { partIndex, stepIndex } = state.selectedStep;
  const step = pattern.steps[partIndex][stepIndex];
  const selector = `.step[data-part-index="${partIndex}"][data-step-index="${stepIndex}"]`;
  const button = ui.stepGrid.querySelector(selector);
  if (button) {
    updateStepButton(button, step);
  }
}

function renderStepDetail() {
  const container = ui.stepDetail;
  container.innerHTML = '';
  const pattern = getCurrentPattern();
  if (!pattern) return;
  const { partIndex, stepIndex } = state.selectedStep;
  const part = state.project.parts[partIndex];
  const step = pattern.steps[partIndex][stepIndex];
  const title = document.createElement('div');
  const noteSuffix = part.type === 'synth' ? ` · ${midiNoteName(step.note ?? 60)}` : '';
  title.innerHTML = `<strong>${part.name}</strong> · Step ${stepIndex + 1}${noteSuffix}`;
  container.appendChild(title);

  const fields = document.createElement('div');
  fields.className = 'step-fields';

  const velocity = createLabeledSlider('Velocity', 0, 1, 0.01, step.vel ?? 1, value => {
    step.vel = parseFloat(value);
    captureMotion(part, 'gain', step.vel);
  });
  const accent = createToggle('Accent', step.accent, value => {
    step.accent = value;
  });
  const probability = createLabeledSlider('Probability', 0, 1, 0.01, step.prob ?? 1, value => {
    step.prob = parseFloat(value);
  }, val => `${Math.round(val * 100)}%`);
  const ratchet = createSelect('Ratchet', [1, 2, 3, 4], step.ratchet ?? 1, value => {
    step.ratchet = parseInt(value, 10);
  });
  const micro = createLabeledSlider('Micro (ms)', -10, 10, 0.5, step.microMs ?? 0, value => {
    step.microMs = parseFloat(value);
  }, val => `${val.toFixed(1)} ms`);

  [velocity.element, accent, probability.element, ratchet, micro.element].forEach(el => fields.appendChild(el));

  if (part.type === 'synth') {
    const noteControl = createLabeledSlider('Note', 36, 84, 1, step.note ?? 60, value => {
      step.note = parseInt(value, 10);
    }, val => `${midiNoteName(val)} (${Math.round(val)})`);
    const detuneControl = createLabeledSlider('Detune', -100, 100, 1, step.detune ?? 0, value => {
      step.detune = parseFloat(value);
    }, val => `${Math.round(val)}¢`);
    fields.appendChild(noteControl.element);
    fields.appendChild(detuneControl.element);
  }

  container.appendChild(fields);
}

function createLabeledSlider(labelText, min, max, step, value, onInput, formatter = (val) => Number(val).toFixed(2)) {
  const wrapper = document.createElement('label');
  wrapper.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  const valueSpan = document.createElement('span');
  valueSpan.className = 'value';
  valueSpan.textContent = formatter(Number(value));
  input.addEventListener('input', event => {
    const numericValue = Number(event.target.value);
    valueSpan.textContent = formatter(numericValue);
    onInput(event.target.value);
    refreshSelectedStepButton();
  });
  wrapper.appendChild(input);
  wrapper.appendChild(valueSpan);
  return { element: wrapper, input };
}

function createToggle(labelText, checked, onChange) {
  const wrapper = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = checked;
  checkbox.addEventListener('change', () => {
    onChange(checkbox.checked);
    refreshSelectedStepButton();
  });
  wrapper.appendChild(checkbox);
  wrapper.append(labelText);
  return wrapper;
}

function createSelect(labelText, values, selected, onChange) {
  const wrapper = document.createElement('label');
  wrapper.textContent = labelText;
  const select = document.createElement('select');
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    if (value === selected) option.selected = true;
    select.appendChild(option);
  });
  select.addEventListener('change', event => {
    onChange(event.target.value);
    refreshSelectedStepButton();
  });
  wrapper.appendChild(select);
  return wrapper;
}

function renderMixer() {
  const mixerContainer = ui.mixer;
  mixerContainer.innerHTML = '';
  state.project.parts.forEach((part, index) => {
    const row = document.createElement('div');
    row.className = 'mixer-row';
    const name = document.createElement('div');
    name.textContent = part.name;
    row.appendChild(name);

    const gain = createFader('Gain', 0, 1.5, 0.01, part.mixer.gain, value => {
      part.mixer.gain = parseFloat(value);
      state.mixer.updatePart(part.id, part.mixer);
      captureMotion(part, 'gain', part.mixer.gain);
    });
    const pan = createFader('Pan', -1, 1, 0.01, part.mixer.pan, value => {
      part.mixer.pan = parseFloat(value);
      state.mixer.updatePart(part.id, part.mixer);
      captureMotion(part, 'pan', (part.mixer.pan + 1) / 2);
    });
    const hp = createFader('HP Hz', 20, 1000, 1, part.mixer.hp, value => {
      part.mixer.hp = parseFloat(value);
      state.mixer.updatePart(part.id, part.mixer);
      captureMotion(part, 'hp', part.mixer.hp / 1000);
    });
    const lp = createFader('LP Hz', 200, 20000, 10, part.mixer.lp, value => {
      part.mixer.lp = parseFloat(value);
      state.mixer.updatePart(part.id, part.mixer);
      captureMotion(part, 'lp', part.mixer.lp / 20000);
    });
    const drive = createFader('Drive', 0, 1, 0.01, part.mixer.drive, value => {
      part.mixer.drive = parseFloat(value);
      state.mixer.updatePart(part.id, part.mixer);
      captureMotion(part, 'drive', part.mixer.drive);
    });
    [gain, pan, hp, lp, drive].forEach(control => row.appendChild(control));

    if (part.type === 'synth') {
      row.classList.add('synth-row');
      const synthControls = document.createElement('div');
      synthControls.className = 'synth-controls';
      synthControls.style.gridColumn = '1 / -1';

      const waveLabel = createSelect('Waveform', ['sine', 'triangle', 'sawtooth', 'square'], part.synth?.waveform || 'sawtooth', value => {
        part.synth.waveform = value;
      });
      const filterType = createSelect('Filter', ['lowpass', 'bandpass', 'highpass'], part.synth?.filterType || 'lowpass', value => {
        part.synth.filterType = value;
      });
      const lfoWave = createSelect('LFO Wave', ['sine', 'triangle', 'sawtooth', 'square'], part.synth?.lfoWaveform || 'sine', value => {
        part.synth.lfoWaveform = value;
      });
      [waveLabel, filterType, lfoWave].forEach(control => synthControls.appendChild(control));

      const attack = createLabeledSlider('Attack (s)', 0.001, 0.8, 0.001, part.synth?.attack ?? 0.01, value => {
        part.synth.attack = parseFloat(value);
        captureMotion(part, 'attack', Math.max(0, Math.min(1, part.synth.attack / 0.8)));
      }, val => `${val.toFixed(3)} s`);
      const decay = createLabeledSlider('Decay (s)', 0.001, 0.8, 0.001, part.synth?.decay ?? 0.18, value => {
        part.synth.decay = parseFloat(value);
        captureMotion(part, 'decay', Math.max(0, Math.min(1, part.synth.decay / 0.8)));
      }, val => `${val.toFixed(3)} s`);
      const sustain = createLabeledSlider('Sustain', 0, 1, 0.01, part.synth?.sustain ?? 0.75, value => {
        part.synth.sustain = parseFloat(value);
        captureMotion(part, 'sustain', Math.max(0, Math.min(1, part.synth.sustain)));
      }, val => val.toFixed(2));
      const release = createLabeledSlider('Release (s)', 0.01, 2, 0.01, part.synth?.release ?? 0.35, value => {
        part.synth.release = parseFloat(value);
        captureMotion(part, 'release', Math.max(0, Math.min(1, part.synth.release / 2)));
      }, val => `${val.toFixed(2)} s`);
      const cutoff = createLabeledSlider('Cutoff (Hz)', 200, 12000, 10, part.synth?.cutoff ?? 2200, value => {
        part.synth.cutoff = parseFloat(value);
        const normalized = (part.synth.cutoff - 200) / (12000 - 200);
        captureMotion(part, 'cutoff', Math.max(0, Math.min(1, normalized)));
      }, val => `${Math.round(val)} Hz`);
      const resonance = createLabeledSlider('Resonanz', 0, 1, 0.01, part.synth?.resonance ?? 0.2, value => {
        part.synth.resonance = parseFloat(value);
        captureMotion(part, 'resonance', Math.max(0, Math.min(1, part.synth.resonance)));
      }, val => val.toFixed(2));
      const glide = createLabeledSlider('Glide (s)', 0, 0.5, 0.005, part.synth?.glide ?? 0, value => {
        part.synth.glide = parseFloat(value);
        captureMotion(part, 'glide', Math.max(0, Math.min(1, part.synth.glide / 0.5)));
      }, val => `${val.toFixed(3)} s`);
      const lfoRate = createLabeledSlider('LFO Rate (Hz)', 0, 10, 0.01, part.synth?.lfoRate ?? 0, value => {
        part.synth.lfoRate = parseFloat(value);
        captureMotion(part, 'lfoRate', Math.max(0, Math.min(1, part.synth.lfoRate / 10)));
      }, val => `${val.toFixed(2)} Hz`);
      const lfoDepth = createLabeledSlider('LFO Depth (st)', 0, 12, 0.1, part.synth?.lfoDepth ?? 0, value => {
        part.synth.lfoDepth = parseFloat(value);
        captureMotion(part, 'lfoDepth', Math.max(0, Math.min(1, part.synth.lfoDepth / 12)));
      }, val => `${val.toFixed(1)} st`);
      [attack.element, decay.element, sustain.element, release.element, cutoff.element, resonance.element, glide.element, lfoRate.element, lfoDepth.element].forEach(control => synthControls.appendChild(control));
      row.appendChild(synthControls);
    }

    mixerContainer.appendChild(row);
  });
}

function createFader(labelText, min, max, step, value, onInput) {
  const wrapper = document.createElement('label');
  wrapper.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  input.addEventListener('input', event => {
    onInput(event.target.value);
    refreshSelectedStepButton();
  });
  wrapper.appendChild(input);
  return wrapper;
}

function renderMotionTargets() {
  const select = ui.motionTarget;
  select.innerHTML = '';
  state.project.parts.forEach(part => {
    const params = ['cutoff', 'resonance', 'start', 'end', 'gain', 'pan'];
    if (part.type === 'synth') {
      params.push('attack', 'decay', 'sustain', 'release', 'glide', 'lfoRate', 'lfoDepth');
    }
    params.forEach(paramId => {
      const option = document.createElement('option');
      option.value = `${part.id}:${paramId}`;
      option.textContent = `${part.name} · ${paramId}`;
      select.appendChild(option);
    });
  });
  if (!state.motionTarget) {
    const first = select.options[0];
    if (first) {
      select.value = first.value;
      const [partId, paramId] = first.value.split(':');
      state.motionTarget = { partId, paramId };
    }
  } else {
    select.value = `${state.motionTarget.partId}:${state.motionTarget.paramId}`;
  }
  renderMotionLanes();
}

function renderMotionLanes() {
  const container = ui.motionLanes;
  container.innerHTML = '';
  if (!state.motionTarget) return;
  const { partId, paramId } = state.motionTarget;
  const part = state.project.parts.find(p => p.id === partId);
  if (!part) return;
  const lane = document.createElement('div');
  lane.className = 'motion-lane';
  const title = document.createElement('strong');
  title.textContent = `${part.name} · ${paramId}`;
  lane.appendChild(title);
  const pointsWrapper = document.createElement('div');
  pointsWrapper.className = 'motion-points';
  const points = part.motion.filter(point => point.paramId === paramId);
  points.forEach((point, index) => {
    const chip = document.createElement('div');
    chip.className = 'motion-point';
    chip.textContent = `${point.timeBeats.toFixed(2)}b · ${(point.value).toFixed(2)} (${point.interp})`;
    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      part.motion.splice(part.motion.indexOf(point), 1);
      syncMotionEngine(part.id, paramId);
      renderMotionLanes();
    });
    chip.appendChild(remove);
    pointsWrapper.appendChild(chip);
  });
  lane.appendChild(pointsWrapper);
  container.appendChild(lane);
}

function syncMotionEngine(partId, paramId) {
  const part = state.project.parts.find(p => p.id === partId);
  if (!part) return;
  const points = part.motion.filter(point => point.paramId === paramId);
  state.motion.setMotion(partId, paramId, points);
}

function captureMotion(part, paramId, value) {
  if (!state.motionRecord) return;
  const beat = state.sequencer ? state.sequencer.getCurrentStep() / 4 : 0;
  const point = {
    id: uuid(),
    paramId,
    timeBeats: Number(beat.toFixed(3)),
    value: Number(value),
    interp: 'linear'
  };
  part.motion.push(point);
  syncMotionEngine(part.id, paramId);
  renderMotionLanes();
}

function handleSequencerStep({ stepIndex, events }) {
  ui.stepGrid.querySelectorAll('.step').forEach(button => button.classList.remove('playing'));
  ui.stepGrid.querySelectorAll('.accent-hit').forEach(button => button.classList.remove('accent-hit'));
  const columnButtons = ui.stepGrid.querySelectorAll(`.step[data-step-index="${stepIndex}"]`);
  columnButtons.forEach(button => button.classList.add('playing'));
  events.forEach(event => {
    const partIndex = state.project.parts.findIndex(part => part.id === event.partId);
    const selector = `.step[data-part-index="${partIndex}"][data-step-index="${stepIndex}"]`;
    const button = ui.stepGrid.querySelector(selector);
    if (button) {
      button.classList.add('accent-hit');
    }
  });
}

function bindEvents() {
  ui.btnPlay.addEventListener('click', async () => {
    if (!state.audioContext) {
      await setupAudio();
    }
    await state.audioContext.resume();
    state.sequencer.start();
    ui.btnPlay.setAttribute('aria-pressed', 'true');
  });

  ui.btnStop.addEventListener('click', () => {
    state.sequencer.stop();
    ui.btnPlay.setAttribute('aria-pressed', 'false');
  });

  ui.tempo.addEventListener('input', event => {
    const bpm = parseFloat(event.target.value);
    state.project.bpm = bpm;
    updateStatusCards();
    if (state.sequencer) state.sequencer.setBpm(bpm);
  });

  ui.swing.addEventListener('input', event => {
    const value = parseInt(event.target.value, 10);
    ui.swingValue.textContent = `${value}%`;
    state.project.swing = value / 100;
    if (state.sequencer) state.sequencer.setSwing(value);
  });

  ui.stepLength.addEventListener('change', event => {
    const length = parseInt(event.target.value, 10);
    state.project.lengthSteps = length;
    state.project.patterns.forEach(pattern => ensurePatternSize(pattern, state.project.parts.length, length));
    updateStatusCards();
    if (state.sequencer) state.sequencer.setStepLength(length);
    renderStepGrid();
  });

  ui.kit.addEventListener('change', async event => {
    const kit = event.target.value;
    state.project.kit = kit;
    updateStatusCards();
    await state.engine.loadKit(kit, progress => setStatus(`Kit lädt… ${(progress * 100).toFixed(0)}%`));
    setStatus('Kit geladen.');
  });

  ui.btnSaveProject.addEventListener('click', saveProjectToStorage);
  ui.btnLoadProject.addEventListener('click', () => {
    const loaded = loadProjectFromStorage();
    if (loaded) {
      state.project = loaded;
      state.sequencer.setProject(state.project);
      setCurrentPattern(state.project.patterns[0].id);
      renderAll();
      setStatus('Projekt geladen.');
    } else {
      setStatus('Kein gespeichertes Projekt gefunden.');
    }
  });

  ui.btnNewProject.addEventListener('click', () => {
    state.project = createInitialProject();
    state.sequencer.setProject(state.project);
    setCurrentPattern(state.project.patterns[0].id);
    renderAll();
    setStatus('Neues Projekt erstellt.');
  });

  ui.patternBank.addEventListener('change', event => {
    state.currentBank = event.target.value;
    const pattern = state.project.patterns.find(p => p.bank === state.currentBank);
    if (pattern) {
      setCurrentPattern(pattern.id);
    }
  });

  ui.btnPatternSave.addEventListener('click', () => {
    const pattern = getCurrentPattern();
    if (!pattern) return;
    const name = prompt('Pattern-Name', pattern.name);
    if (name) {
      pattern.name = name;
      renderPatternList();
    }
  });

  ui.btnPatternClear.addEventListener('click', () => {
    const pattern = getCurrentPattern();
    if (!pattern) return;
    pattern.steps.forEach(row => row.forEach((step, index) => Object.assign(step, createEmptyStep(index))));
    renderStepGrid();
  });

  ui.btnChainAdd.addEventListener('click', () => {
    if (!state.currentPatternId) return;
    state.project.chain.push({ patternId: state.currentPatternId });
    renderChain();
  });

  ui.btnChainClear.addEventListener('click', () => {
    state.project.chain = [];
    renderChain();
  });

  ui.btnMotionRecord.addEventListener('click', () => {
    state.motionRecord = !state.motionRecord;
    ui.btnMotionRecord.classList.toggle('active', state.motionRecord);
    ui.btnMotionRecord.setAttribute('aria-pressed', String(state.motionRecord));
  });

  ui.btnMotionClear.addEventListener('click', () => {
    if (!state.motionTarget) return;
    const { partId, paramId } = state.motionTarget;
    const part = state.project.parts.find(p => p.id === partId);
    if (!part) return;
    part.motion = part.motion.filter(point => point.paramId !== paramId);
    syncMotionEngine(partId, paramId);
    renderMotionLanes();
  });

  ui.motionTarget.addEventListener('change', event => {
    const [partId, paramId] = event.target.value.split(':');
    state.motionTarget = { partId, paramId };
    renderMotionLanes();
  });

  ui.btnMotionAdd.addEventListener('click', () => {
    if (!state.motionTarget) return;
    const { partId, paramId } = state.motionTarget;
    const part = state.project.parts.find(p => p.id === partId);
    if (!part) return;
    const time = parseFloat(ui.motionTime.value);
    const value = parseFloat(ui.motionValue.value);
    const interp = ui.motionInterp.value;
    part.motion.push({
      id: uuid(),
      paramId,
      timeBeats: time,
      value,
      interp
    });
    syncMotionEngine(partId, paramId);
    renderMotionLanes();
  });

  ui.masterTilt.addEventListener('input', event => {
    const value = parseFloat(event.target.value);
    state.project.master.tilt = value;
    state.mixer.setMasterTilt(value);
  });

  ui.masterClip.addEventListener('input', event => {
    const value = parseFloat(event.target.value);
    state.project.master.clip = value;
    state.mixer.setMasterClip(value);
  });

  ui.btnExport.addEventListener('click', async () => {
    if (!state.engine) {
      setStatus('Engine nicht bereit.');
      return;
    }
    setStatus('Render läuft…');
    try {
      const bars = parseInt(ui.exportBars.value, 10) || 4;
      const result = await exportProjectToWav(state.project, state.engine, bars);
      const blob = new Blob([result.arrayBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${state.project.name.replace(/\s+/g, '_')}_${bars}bars.wav`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus(`Export fertig · Peak ${result.peakDb.toFixed(2)} dBFS`);
    } catch (error) {
      setStatus(`Export fehlgeschlagen: ${error.message}`);
    }
  });

  const applyToggle = (checkbox, className) => {
    if (!checkbox) return;
    const update = () => document.body.classList.toggle(className, checkbox.checked);
    checkbox.addEventListener('change', update);
    update();
  };
  applyToggle(ui.accentToggle, 'show-accent');
  applyToggle(ui.probToggle, 'show-prob');
  applyToggle(ui.ratchetToggle, 'show-ratchet');
  applyToggle(ui.microToggle, 'show-micro');

  document.addEventListener('keydown', event => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (state.sequencer?.isRunning) {
        state.sequencer.stop();
      } else {
        ui.btnPlay.click();
      }
    }
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveProjectToStorage();
    }
  });
}

function renderAll() {
  renderTransport();
  renderPatternList();
  renderStepGrid();
  renderMixer();
  renderMotionTargets();
  renderChain();
  updateStatusCards();
}

function syncMotionFromProject() {
  state.project.parts.forEach(part => {
    const params = ['cutoff', 'resonance', 'start', 'end', 'gain', 'pan'];
    if (part.type === 'synth') {
      params.push('attack', 'decay', 'sustain', 'release', 'glide', 'lfoRate', 'lfoDepth');
    }
    params.forEach(paramId => {
      const points = part.motion.filter(point => point.paramId === paramId);
      state.motion.setMotion(part.id, paramId, points);
    });
  });
}

// ============================================
// ROUTER & NAVIGATION SETUP
// ============================================

const router = new Router();
const pages = {
  chat: new ChatPage(),
  models: new ModelsPage(),
  settings: new SettingsPage()
};

let currentPage = null;

// Page-Rendering
function renderPage(page) {
  const container = document.getElementById('page-container');
  if (!container) return;

  // Cleanup previous page
  if (currentPage) {
    currentPage.unmount?.();
  }

  // Render new page
  container.innerHTML = page.render();
  page.mount?.();
  currentPage = page;

  // Update active nav item
  updateActiveNav();
}

// Update Bottom Navigation Active State
function updateActiveNav() {
  const currentPath = router.getCurrentPath();
  document.querySelectorAll('.nav-item').forEach(item => {
    const route = item.dataset.route;
    if (route === currentPath) {
      item.classList.add('active');
      item.setAttribute('aria-current', 'page');
    } else {
      item.classList.remove('active');
      item.removeAttribute('aria-current');
    }
  });
}

// Register Routes
router.register('/chat', () => renderPage(pages.chat));
router.register('/models', () => renderPage(pages.models));
router.register('/settings', () => renderPage(pages.settings));

// Navigation Click Handler
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const route = item.dataset.route;
      if (route) {
        router.navigate(route);
      }
    });
  });
}

// VisualViewport Listener für korrektes Keyboard-Handling auf Android
if ('visualViewport' in window) {
  const vv = window.visualViewport;
  const updateViewportHeight = () => {
    document.documentElement.style.setProperty('--vvh', `${vv.height}px`);
  };
  vv.addEventListener('resize', updateViewportHeight);
  vv.addEventListener('scroll', updateViewportHeight);
  updateViewportHeight();
}

document.addEventListener('DOMContentLoaded', async () => {
  ui.btnPlay = document.getElementById('btn-play');
  ui.btnStop = document.getElementById('btn-stop');
  ui.tempo = document.getElementById('tempo');
  ui.swing = document.getElementById('swing');
  ui.swingValue = document.getElementById('swing-value');
  ui.stepLength = document.getElementById('step-length');
  ui.kit = document.getElementById('kit');
  ui.btnSaveProject = document.getElementById('btn-save');
  ui.btnLoadProject = document.getElementById('btn-load');
  ui.btnNewProject = document.getElementById('btn-new');
  ui.patternList = document.getElementById('pattern-list');
  ui.patternBank = document.getElementById('pattern-bank');
  ui.btnPatternSave = document.getElementById('btn-pattern-save');
  ui.btnPatternClear = document.getElementById('btn-pattern-clear');
  ui.chainList = document.getElementById('chain-list');
  ui.btnChainAdd = document.getElementById('btn-chain-add');
  ui.btnChainClear = document.getElementById('btn-chain-clear');
  ui.stepGrid = document.getElementById('step-grid');
  ui.stepDetail = document.getElementById('step-detail');
  ui.accentToggle = document.getElementById('accent-toggle');
  ui.probToggle = document.getElementById('prob-toggle');
  ui.ratchetToggle = document.getElementById('ratchet-toggle');
  ui.microToggle = document.getElementById('micro-toggle');
  ui.mixer = document.getElementById('mixer');
  ui.masterTilt = document.getElementById('master-tilt');
  ui.masterClip = document.getElementById('master-clip');
  ui.motionTarget = document.getElementById('motion-target');
  ui.motionLanes = document.getElementById('motion-lanes');
  ui.btnMotionRecord = document.getElementById('btn-motion-record');
  ui.btnMotionClear = document.getElementById('btn-motion-clear');
  ui.btnMotionAdd = document.getElementById('btn-motion-add');
  ui.motionTime = document.getElementById('motion-time');
  ui.motionValue = document.getElementById('motion-value');
  ui.motionInterp = document.getElementById('motion-interp');
  ui.btnExport = document.getElementById('btn-export');
  ui.exportBars = document.getElementById('export-bars');
  ui.exportStatus = document.getElementById('export-status');
  ui.statusBpm = document.getElementById('status-bpm-value');
  ui.statusSteps = document.getElementById('status-steps-value');
  ui.statusKit = document.getElementById('status-kit-value');
  ui.statusChain = document.getElementById('status-chain-value');
  [ui.accentToggle, ui.probToggle, ui.ratchetToggle, ui.microToggle].forEach(toggle => {
    if (toggle) toggle.checked = true;
  });

  // Initialize Router & Navigation
  setupNavigation();
  router.init();

  // Legacy Sequencer (hidden)
  state.project = loadProjectFromStorage() || createInitialProject();
  setCurrentPattern(state.project.patterns[0].id);
  renderAll();
  bindEvents();
  await setupAudio();
  syncMotionFromProject();
  setStatus('Bereit.');
});
