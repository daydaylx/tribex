/**
 * TribeX Pages - Chat, Models, Settings
 */

export class ChatPage {
  render() {
    return `
      <div class="page chat-page" data-page="chat">
        <header class="page-header">
          <h1>Chat</h1>
          <p class="subtitle">TribeX Sequencer Chat-Interface</p>
        </header>

        <div class="chat-container">
          <div class="chat-messages" id="chat-messages">
            <div class="chat-message system">
              <div class="message-content">
                <strong>System:</strong> Willkommen bei TribeX! Hier kannst du mit dem Sequencer chatten.
              </div>
            </div>
          </div>

          <div class="chat-input-wrapper">
            <input
              type="text"
              id="chat-input"
              class="chat-input"
              placeholder="Nachricht eingeben..."
              aria-label="Chat-Nachricht"
            >
            <button class="btn accent chat-send" id="chat-send" aria-label="Senden">
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  mount() {
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');

    const sendMessage = () => {
      const text = input.value.trim();
      if (!text) return;

      const messageEl = document.createElement('div');
      messageEl.className = 'chat-message user';
      messageEl.innerHTML = `<div class="message-content"><strong>Du:</strong> ${text}</div>`;
      messages.appendChild(messageEl);

      input.value = '';
      messages.scrollTop = messages.scrollHeight;
    };

    sendBtn?.addEventListener('click', sendMessage);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  unmount() {
    // Cleanup if needed
  }
}

export class ModelsPage {
  render() {
    return `
      <div class="page models-page" data-page="models">
        <header class="page-header">
          <h1>Models</h1>
          <p class="subtitle">Verfügbare Drum-Kits und Sound-Engines</p>
        </header>

        <div class="models-grid">
          <div class="model-card active">
            <div class="model-icon">🥁</div>
            <h3>TR-909</h3>
            <p>Classic Roland TR-909 Drum Machine</p>
            <div class="pill-group">
              <span class="pill">11 Parts</span>
              <span class="pill">Active</span>
            </div>
          </div>

          <div class="model-card">
            <div class="model-icon">🎹</div>
            <h3>Synth Engine</h3>
            <p>Polyphonic Synthesizer mit ADSR</p>
            <div class="pill-group">
              <span class="pill">Coming Soon</span>
            </div>
          </div>

          <div class="model-card">
            <div class="model-icon">🔊</div>
            <h3>Sample Kit</h3>
            <p>Custom Sample-basiertes Kit</p>
            <div class="pill-group">
              <span class="pill">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  mount() {
    // Model selection logic
  }

  unmount() {
    // Cleanup
  }
}

export class SettingsPage {
  render() {
    return `
      <div class="page settings-page" data-page="settings">
        <header class="page-header">
          <h1>Settings</h1>
          <p class="subtitle">App-Einstellungen und Konfiguration</p>
        </header>

        <div class="settings-sections">
          <section class="settings-section">
            <h2>Audio</h2>
            <div class="settings-grid">
              <label class="setting-item">
                <span>Sample Rate</span>
                <select class="setting-select">
                  <option value="44100">44.1 kHz</option>
                  <option value="48000" selected>48 kHz</option>
                  <option value="96000">96 kHz</option>
                </select>
              </label>

              <label class="setting-item">
                <span>Buffer Size</span>
                <select class="setting-select">
                  <option value="128">128</option>
                  <option value="256" selected>256</option>
                  <option value="512">512</option>
                </select>
              </label>
            </div>
          </section>

          <section class="settings-section">
            <h2>Display</h2>
            <div class="settings-grid">
              <label class="setting-item toggle-item">
                <span>Dark Mode</span>
                <input type="checkbox" checked disabled>
              </label>

              <label class="setting-item toggle-item">
                <span>Animationen</span>
                <input type="checkbox" id="animations-toggle" checked>
              </label>
            </div>
          </section>

          <section class="settings-section">
            <h2>Info</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>Version</strong>
                <span>v0.1-mvp</span>
              </div>
              <div class="info-item">
                <strong>Build</strong>
                <span>2025-10-04</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  mount() {
    const animToggle = document.getElementById('animations-toggle');
    animToggle?.addEventListener('change', (e) => {
      document.body.classList.toggle('no-animations', !e.target.checked);
    });
  }

  unmount() {
    // Cleanup
  }
}
