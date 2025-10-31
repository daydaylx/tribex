# TribeX Sequencer

Web Audio Performance Sequencer v0.1

## Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Build erstellen
npm run build

# Build-Vorschau lokal testen
npm run preview
```

## Deployment auf Cloudflare Pages

### Option 1: Git Integration (Empfohlen)

1. Pushe dein Repository zu GitHub/GitLab/Bitbucket
2. Gehe zu [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
3. Klicke auf "Create a project" → "Connect to Git"
4. Wähle dein Repository aus
5. Konfiguriere das Build:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: `18` oder höher
6. Klicke auf "Save and Deploy"

### Option 2: CLI Deployment (Wrangler)

```bash
# Wrangler installieren (falls noch nicht vorhanden)
npm install -g wrangler

# Bei Cloudflare anmelden
wrangler login

# Projekt deployen
npm run deploy
```

### Option 3: Direktes Deployment

```bash
# Build erstellen
npm run build

# Mit Wrangler deployen
wrangler pages deploy dist
```

## Projektstruktur

```
tribex/
├── src/              # TypeScript Source-Dateien
├── js/               # Legacy JavaScript-Dateien
├── css/              # Stylesheets
├── assets/           # Statische Assets
├── public/           # Öffentliche Dateien (_redirects, etc.)
├── dist/             # Build-Output (wird generiert)
├── vite.config.js    # Build- und Entwicklungsserver Konfiguration
├── wrangler.toml     # Cloudflare Pages Konfiguration
└── tsconfig.json     # TypeScript Konfiguration
```

## Build-Prozess

Der Build-Prozess verwendet Vite und führt folgende Schritte aus:

1. **Clean**: Löscht und erstellt das `dist/` Verzeichnis neu
2. **TypeScript**: Kompiliert TypeScript-Dateien aus `src/` mit modernen ES2020 Features
3. **Code-Splitting**: Trennt Code in logische Blöcke für bessere Ladeleistung
4. **Minifizierung**: Minifiziert den Output mit Terser
5. **Output**: Erstellt ein deploymentfähiges `dist` Verzeichnis

## Cloudflare Pages Konfiguration

Die `wrangler.toml` enthält die Cloudflare Pages Konfiguration:
- Output-Verzeichnis: `dist`
- Build-Command: `npm run build`

## Lizenz

Siehe LICENSE Datei
