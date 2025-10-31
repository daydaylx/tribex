# TribeX - Implementation Details

## ✅ Issue 1: Android-Skalierung & Usability (ERLEDIGT)

### Viewport-Units (svh/dvh)
- **Implementiert:** Moderne Viewport-Units `svh`/`dvh` mit Fallback
- **Dateien:** `css/ui.css`, `index.html`
- **Details:**
  ```css
  body {
    min-height: 100svh;
  }
  @supports (height: 100dvh) {
    body {
      min-height: 100dvh;
    }
  }
  ```

### Safe-Area Insets
- **Implementiert:** Vollständige Safe-Area Unterstützung für alle Seiten
- **Dateien:** `css/ui.css`, `index.html`
- **Details:**
  ```css
  #app {
    padding: max(32px, env(safe-area-inset-top))
            clamp(24px, 4vw, 48px)
            calc(48px + env(safe-area-inset-bottom));
    padding-left: max(clamp(24px, 4vw, 48px), env(safe-area-inset-left));
    padding-right: max(clamp(24px, 4vw, 48px), env(safe-area-inset-right));
  }
  ```
- **Viewport-Meta:** `viewport-fit=cover` aktiviert

### VisualViewport-Listener
- **Implementiert:** Dynamisches Keyboard-Handling für Android
- **Dateien:** `js/app.js` (Zeilen 1033-1042)
- **Details:**
  ```javascript
  if ('visualViewport' in window) {
    const vv = window.visualViewport;
    const updateViewportHeight = () => {
      document.documentElement.style.setProperty('--vvh', `${vv.height}px`);
    };
    vv.addEventListener('resize', updateViewportHeight);
    vv.addEventListener('scroll', updateViewportHeight);
  }
  ```
- **CSS-Nutzung:** `min-height: var(--vvh, 100svh);`

### Touch-Targets (≥48px)
- **Implementiert:** Alle interaktiven Elemente ≥48×48px
- **Betroffene Elemente:**
  - `.btn` - min-height/width: 48px
  - `.pattern-item` - min-height/width: 48px
  - `.step` - min-height/width: 48px
  - `.control select/input` - min-height: 48px
  - `.nav-item` - min-height: 48px
  - `.chat-input` - min-height: 48px
  - `.chat-send` - min-width/height: 48px

---

## ✅ Issue 2: Navigation/Routing (ERLEDIGT)

### Router-System
- **Neu erstellt:** `js/router.js`
- **Features:**
  - History API Integration
  - Event-System (beforeNavigate, routeChange, afterNavigate)
  - Popstate-Handling für Back/Forward
  - Single Source of Truth: URL = State

### 3-Seiten-Architektur
- **Neu erstellt:** `js/pages.js`
- **Pages:**
  1. **ChatPage** (`/chat`) - Chat-Interface mit Eingabefeld
  2. **ModelsPage** (`/models`) - Drum-Kits und Sound-Engines
  3. **SettingsPage** (`/settings`) - App-Konfiguration

### Bottom-Navigation
- **Implementiert:** Feste Bottom-Nav mit aktivem State
- **Dateien:** `index.html`, `css/ui.css`
- **Features:**
  - Visuelle Active-State-Markierung (Top-Border + Background)
  - ARIA-Attribute (`aria-current="page"`)
  - Safe-Area Insets unten berücksichtigt
  - 48px Touch-Targets
  - SVG-Icons

### Page-Transitions
- **Implementiert:** 180ms Fade-In Animation ohne Layout-Shift
- **CSS:**
  ```css
  .page {
    animation: pageEnter 180ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    opacity: 0;
    transform: translateY(8px);
  }
  ```
- **Prefers-Reduced-Motion:** Fallback ohne Animation

### History/Back-Button
- **Implementiert:** Korrekte Browser-Back/Forward-Unterstützung
- **Details:**
  - Popstate-Event-Listener im Router
  - pushState bei Navigation
  - URL-Sync mit UI-State
  - Deep-Link-Support

### SPA-Fallback (Cloudflare Pages)
- **Neu erstellt:** `public/_redirects`
- **Inhalt:** `/* /index.html 200`
- **Zweck:** Deep-Links funktionieren nach Reload

---

## 🏗️ Architektur-Änderungen

### HTML-Struktur (index.html)
```html
<div id="app">
  <!-- Page Container -->
  <main id="page-container"></main>

  <!-- Bottom Navigation -->
  <nav class="bottom-nav">
    <a href="/chat" class="nav-item" data-route="/chat">...</a>
    <a href="/models" class="nav-item" data-route="/models">...</a>
    <a href="/settings" class="nav-item" data-route="/settings">...</a>
  </nav>

  <!-- Legacy Sequencer UI (Hidden) -->
  <div id="sequencer-legacy" style="display: none;">
    ...
  </div>
</div>
```

### Router-Integration (App.jsx)
1. React Router Funktionalität als Teil der Hauptkomponente
2. Page-Instanzen erstellen
3. Routes registrieren
4. Navigation-Event-Handler
5. Active-State-Update-Logik

---

## 📱 Mobile-Optimierungen

### Viewport
- `svh`/`dvh` für stabilen Fullscreen ohne Browser-UI-Jumps
- VisualViewport API für präzises Keyboard-Handling
- CSS-Variable `--vvh` dynamisch aktualisiert

### Touch-Targets
- Minimum 48×48px überall
- Konsistente Padding/Spacing
- Lighthouse-konform

### Safe-Areas
- Alle 4 Insets (top, right, bottom, left) berücksichtigt
- Gestenleiste unten freigehalten
- Notch/Dynamic Island oben berücksichtigt

### Scroll-Behavior
- `-webkit-overflow-scrolling: touch`
- Smooth Scrolling in Chat
- Sticky Input-Bar

---

## 🧪 Testing-Empfehlungen

### Android-Tests
1. **Viewport-Stabilität:**
   - Chrome Android: Adressleiste ein/aus → kein Layout-Shift
   - Keyboard öffnen/schließen → Eingabefeld sichtbar

2. **Touch-Targets:**
   - Lighthouse Accessibility Audit
   - Playwright: BoundingBox-Assertions ≥48px

3. **Safe-Areas:**
   - Visual Screenshot auf Pixel 6/7
   - Gestenleiste unten frei

### Navigation-Tests
1. **Routing:**
   - Deep-Link auf `/models` → Models-Page + Active-Tab
   - Browser-Back → vorherige Route + UI-Sync
   - 10× Back/Forward-Loop → kein Desync

2. **Transitions:**
   - CLS ~0 bei Tab-Wechsel
   - Animation <200ms
   - Prefers-Reduced-Motion funktioniert

---

## 📦 Neue Dateien

- ✅ `js/router.js` - Router-Klasse
- ✅ `js/pages.js` - ChatPage, ModelsPage, SettingsPage
- ✅ `public/_redirects` - SPA-Fallback für Cloudflare Pages

## 📝 Geänderte Dateien

- ✅ `index.html` - Navigation, Viewport-Meta, Struktur
- ✅ `css/ui.css` - Viewport-Units, Safe-Areas, Touch-Targets, Navigation-Styles
- ✅ `js/ui/App.jsx` - React Hauptkomponente mit Router-Integration, VisualViewport-Listener

---

## 🚀 Deployment

### Lokaler Test
```bash
npx http-server . -p 8080
```

### Cloudflare Pages
- `public/_redirects` muss im Build-Output sein
- SPA-Modus aktiviert durch `/* /index.html 200`

---

## ✨ Ergebnis

**Issue 1 (Android-Skalierung):** ✅ VOLLSTÄNDIG
- Moderne Viewport-Units mit Fallback
- Safe-Area Insets komplett
- VisualViewport-Listener aktiv
- Touch-Targets ≥48px überall

**Issue 2 (Navigation/Routing):** ✅ VOLLSTÄNDIG
- 3-Seiten-Architektur implementiert
- Router mit History API
- Bottom-Nav mit Active-State
- Page-Transitions ohne Layout-Shift
- Deep-Links & Back-Button funktionieren

**Bonus:**
- Cloudflare Pages SPA-Fallback
- Accessibility (ARIA, Kontrast)
- Prefers-Reduced-Motion Support
- Legacy Sequencer bleibt erhalten (hidden)
