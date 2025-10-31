# TribeX - Entwickler-Dokumentation

## Inhaltsverzeichnis
1. [Überblick](#überblick)
2. [Projektstruktur](#projektstruktur)
3. [Architektur](#architektur)
4. [Typdefinitionen](#typdefinitionen)
5. [Komponenten](#komponenten)
6. [Erweiterte Funktionen](#erweiterte-funktionen)
7. [Entwicklung](#entwicklung)
8. [Tests](#tests)
9. [Deployment](#deployment)

## Überblick

TribeX ist ein Web-basierter Drum-Sequenzer, der moderne Web-Technologien nutzt, um professionelle Audio-Sequenzierung im Browser zu ermöglichen. Das Projekt verwendet Web Audio API für die Audiowiedergabe und bietet eine Vielzahl von Funktionen zur Mustererstellung und -verkettung.

### Hauptfunktionen
- 11-Part Drum-Sequenzer mit TR-909 Kit
- Pattern- und Chain-System
- Motion-Sequencing (Parametrische Automation)
- Web MIDI Unterstützung
- Visuelle Feedback für aktive Steps
- Farbcodierung für verschiedene Drum-Parts
- Tastaturkürzel
- Undo/Redo-Funktionalität
- Metronom

## Projektstruktur

```
tribex/
├── src/                    # TypeScript-Quelldateien
│   ├── tribeX-types.ts    # Globale Typdefinitionen
│   ├── interfaces.ts      # TypeScript-Interfaces
│   ├── history.ts         # Basis-History-Manager
│   ├── advanced-history.ts # Erweiterter History-Manager mit Command-Pattern
│   ├── command-pattern.ts # Command-Pattern Implementierung
│   ├── keyboard.ts        # Tastaturkürzel-Handler
│   ├── timeline.ts        # Timeline-Komponente
│   ├── engine.ts          # Optimierte Audio-Engine
│   ├── mixer.ts           # Optimierter Audio-Mixer
│   └── ...
├── js/                    # Bestehende JavaScript-Dateien
├── css/                   # Styling-Dateien
├── assets/                # Audio-Samples und andere Assets
├── public/                # Öffentliche Dateien für Deployment
├── index.html             # Hauptseite
├── tsconfig.json          # TypeScript-Konfiguration
└── IMPLEMENTATION.md      # Detaillierte Implementationshinweise
```

## Architektur

Das Projekt ist modular aufgebaut mit klaren Verantwortlichkeiten für jede Komponente.

### Hauptmodule

- **App.jsx**: Haupt-React-Komponente mit Zustandsmanagement
- **sequencer.js**: Timing und Step-Verarbeitung
- **engine.js**: Audio-Verarbeitung und Sample-Management
- **mixer.js**: Audio-Mischung und Effekt-Verwaltung
- **router.js**: Client-seitiges Routing
- **pages.js**: UI-Komponenten für verschiedene Ansichten
- **motion.js**: Motion-Sequencing-Logik
- **history.js/advanced-history.js**: Zustandsrückgängigmachung
- **keyboard.js**: Tastaturkürzel-Verwaltung
- **timeline.js**: Visuelle Darstellung der Chain-Sequenz

### Zustandsmanagement

Der Anwendungszustand wird in einem zentralen `state`-Objekt verwaltet:

```typescript
interface AppState {
  project: ProjectState | null;
  audioContext: AudioContext | null;
  mixer: Mixer | null;
  engine: SampleEngine | null;
  sequencer: Sequencer | null;
  motion: MotionEngine | null;
  currentPatternId: string | null;
  currentBank: string;
  selectedStep: { partIndex: number; stepIndex: number } | null;
  motionTarget: { partId: string; paramId: string } | null;
  motionRecord: boolean;
  audioReady: boolean;
}
```

## Typdefinitionen

Alle wichtigen Datentypen sind in `src/tribeX-types.ts` definiert:

### Projektstruktur
- `ProjectState`: Vollständiger Projektzustand
- `Pattern`: Ein Schlagzeugmuster mit Steps
- `Step`: Ein einzelner Step in einem Pattern
- `Part`: Ein Schlagzeug-Teil (Kick, Snare, etc.)

### UI-Elemente
- `UIElements`: Referenzen auf DOM-Elemente
- `MixerSettings`: Einstellungen für einen einzelnen Kanal

## Komponenten

### Audio-Engine
Die optimierte Audio-Engine (`src/engine.ts`) bietet:

- Sample-Caching für reduzierte Speicherzugriffe
- Wiederverwendbare Audio-Nodes zur Garbage-Reduzierung
- Parallele Sample-Ladung zur Verbesserung der Ladezeit
- Ratchet-Unterstützung mit optimierten Verbindungen

### Mixer
Der optimierte Mixer (`src/mixer.ts`) bietet:

- Wiederverwendbare Voice-Channels
- Effiziente Parameter-Steuerung
- Master-Ducker für Kick-Drum
- Sanfte Parameter-Übergänge

### History-Management
Das erweiterte History-System (`src/advanced-history.ts`) nutzt das Command-Pattern:

- Spezifische Befehle für verschiedene Operationen
- Batch-Unterstützung für zusammenhängende Änderungen
- Präzise Undo/Redo-Funktionalität

## Erweiterte Funktionen

### Tastaturkürzel
- Leertaste: Play/Pause
- Pfeiltasten: Tempoanpassung
- Ziffern 1-3: Navigation
- Strg+Z: Undo, Strg+Shift+Z: Redo
- M: Metronom umschalten

### Visuelle Feedbacks
- Hervorhebung aktiver Steps
- Farbcodierung nach Part-Typ
- Timeline-Ansicht für Chain-Sequenzen
- Metronom mit visuellen und akustischen Cues

### Motion-Sequencing
- Parametrische Automation für alle Synth-Parameter
- Interpolation zwischen Punkten
- Quantisierungsoptionen

## Entwicklung

### Voraussetzungen
- Node.js (empfohlen: LTS-Version)
- Web Browser mit Web Audio API und ES2020-Unterstützung

### Setup
1. Repository klonen: `git clone ...`
2. Abhängigkeiten installieren (falls vorhanden): `npm install`
3. Entwicklungs-Server starten: `npm run dev` oder lokal über HTTP-Server

### TypeScript-Integration
Das Projekt wurde mit TypeScript-Typdefinitionen versehen:
- `tsconfig.json` für Compiler-Optionen
- `*.ts` Dateien mit Typisierung
- Interfaces für alle wichtigen Klassen

### Build-Prozess
Der Build-Prozess verwendet Vite und umfasst:
1. TypeScript-Kompilierung mit ES2020 Target
2. Code-Splitting für bessere Ladeleistung
3. Minifizierung mit Terser
4. Asset-Bündelung
5. Optimierung für Produktion

## Tests

### Unit-Tests
Unit-Tests sollten für alle kritischen Funktionen vorhanden sein:
- Audio-Engine-Operationen
- Step-Manipulation
- History-Operationen
- Tastaturkürzel-Verarbeitung

### Integrationstests
Integrationstests stellen sicher, dass die verschiedenen Komponenten korrekt zusammenarbeiten:
- Sequencer-Engine-Kopplung
- UI- und Audio-Konsistenz
- History-Integration

## Deployment

### Lokale Entwicklung
Für die lokale Entwicklung:
1. HTTP-Server im Projektstamm starten
2. Browser öffnen unter http://localhost:8080 (oder entsprechend)

### Produktion
Für Produktion:
1. Build-Prozess ausführen
2. Dateien in `/public` für Server bereitstellen
3. Statische Datei-Server-Konfiguration sicherstellen

### Cloudflare Pages
Das Projekt ist für Cloudflare Pages vorbereitet:
- `_redirects` Datei für SPA-Fallback
- Optimierter Build-Process

## Troubleshooting

### Audio-Probleme
- Stellen Sie sicher, dass die Seite über HTTPS läuft
- Prüfen Sie die Sample-Pfade in `/assets/kits/`
- Verifizieren Sie die Web Audio API-Unterstützung im Browser

### Performance
- Bei Audio-Unterläufen: Puffergröße anpassen
- Bei UI-Lag: Optimierte Rendering-Methoden verwenden
- Bei Speicherproblemen: Unnötige Audio-Nodes freigeben

## Weiterführende Entwicklung

### Geplante Erweiterungen
- MIDI Import/Export
- WebAssembly für Performance-kritische Funktionen
- Plugin-System für benutzerdefinierte Synthesizer
- DAW-Integration via Web MIDI

### Verbesserungsvorschläge
- TypeScript-Konvertierung des gesamten Codebases
- Komponenten-basierte Architektur
- State-Management mit Redux oder ähnlichem
- Ausbau der Testabdeckung