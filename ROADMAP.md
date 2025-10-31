# TribeX - Roadmap: From Chat App to Music Production Powerhouse

## 1. Projektziel

Das Ziel dieses Projekts ist die Umwandlung der bestehenden Codebasis in eine voll funktionsfähige digitale Audio-Workstation (DAW) im Browser, die stark von der Korg Electribe ESX inspiriert ist. Die Anwendung wird ein leistungsstarker Drumcomputer, ein vielseitiger Synthesizer und ein intuitiver Sampler sein und soll professionelle Musikproduktion im Web ermöglichen. Die existierende Chat-Funktionalität wird vollständig entfernt.

## 2. Kernmodule

Die Anwendung wird aus den folgenden Kernmodulen bestehen:

*   **Audio-Engine:** Das Herzstück der Anwendung, verantwortlich für die gesamte Audioverarbeitung.
*   **Sequencer:** Für die Erstellung und Anordnung von musikalischen Patterns.
*   **Sampler:** Für das Aufnehmen, Bearbeiten und Abspielen von Samples.
*   **Synthesizer:** Ein virtuell-analoger Synthesizer zur Klangerzeugung.
*   **Effekte:** Eine Sammlung von Audioeffekten zur Klangveredelung.
*   **Mixer:** Ein Mehrkanal-Mischpult zur Steuerung der Audio-Signale.
*   **Benutzeroberfläche (UI):** Eine intuitive und ansprechende Oberfläche, die an die Hardware der Electribe ESX angelehnt ist.

## 3. Detaillierte Funktionsbeschreibung

### 3.1. Sequencer

*   **Pattern-basiert:** 128 Patterns pro Projekt, jedes mit bis zu 128 Steps.
*   **Step-Sequencer:** Ein 16-Step-Grid zur schnellen Erstellung von Rhythmen und Melodien.
*   **Spuren:** 16 Spuren pro Pattern, aufgeteilt in:
    *   9 Drum-Spuren (One-Shot-Samples)
    *   2 Synthesizer-Spuren
    *   2 Stretch-Part-Spuren (für getimestretchtes Audiomaterial)
    *   1 Slice-Part-Spur (für geslicete Samples)
    *   1 Audio-In-Spur (zur Verarbeitung externer Audiosignale)
    *   1 Accent-Spur
*   **Motion Sequencing:** Aufnahme von Parameter-Automationen für jeden Step (z.B. Filter-Cutoff, Decay-Zeit).
*   **Song-Modus:** Verkettung von Patterns zu kompletten Songs (bis zu 64 Songs pro Projekt).
*   **Swing/Groove:** Einstellbarer Swing zur Erzeugung von "Human Feel".
*   **Tap-Tempo:** Manuelles Eintippen des Tempos.
*   **Arpeggiator:** Ein leistungsstarker Arpeggiator mit verschiedenen Modi.

### 3.2. Sampler

*   **Aufnahme:** Aufnahme von Samples über den Mikrofoneingang oder per Drag & Drop von Audiodateien.
*   **Sample-Verwaltung:** Bis zu 384 Samples pro Projekt (100 Mono, 128 Stereo).
*   **Bearbeitung:**
    *   **Slicing:** Automatisches und manuelles Zerschneiden von Samples in einzelne "Slices".
    *   **Time-Stretching:** Ändern des Tempos von Samples ohne Änderung der Tonhöhe.
    *   **Pitch-Shifting:** Ändern der Tonhöhe von Samples ohne Änderung des Tempos.
    *   **Normalisierung, Trimming, Fades.**
*   **Sample-Typen:**
    *   **One-Shot:** Für kurze Drum-Sounds.
    *   **Pitched:** Für melodische Samples.
    *   **Time-Stretched:** Für Loops, die sich dem Song-Tempo anpassen.
    *   **Time-Sliced:** Für zerlegte Loops, die neu arrangiert werden können.

### 3.3. Synthesizer

*   **Virtuell-Analoge Engine (MMT - Multi Modeling Technology):**
    *   **Oszillatoren:** 16 verschiedene Oszillator-Algorithmen (Sägezahn, Rechteck, Sinus, Wavetable, etc.).
    *   **Filter:** Multimode-Filter (Low-Pass, High-Pass, Band-Pass, Band-Pass Plus) mit Resonanz.
    *   **Hüllkurven:** ADSR-Hüllkurven für Amplitude und Filter.
    *   **LFOs:** Low-Frequency Oscillators zur Modulation von Parametern.
*   **Zwei Synthesizer-Spuren:** Jede mit eigenem Synthesizer-Setup.

### 3.4. Effekte

*   **Drei Effekt-Prozessoren:**
    *   **Insert-Effekte:** 11 Typen (z.B. Reverb, Delay, Chorus, Flanger, Phaser, Bit Crusher).
    *   **Master-Effekte:** Zur Bearbeitung des gesamten Mixes (z.B. Kompressor, Limiter, EQ).
*   **Valve Force Circuitry:** Emulation von Röhrenwärme für einen analogen Sound.

### 3.5. Mixer

*   **16 Kanäle:** Ein Kanal für jede Spur.
*   **Regler pro Kanal:**
    *   Volume
    *   Pan
    *   Mute
    *   Solo
    *   Effekt-Sends
*   **Master-Kanal:** Mit Master-Effekten und Master-Volume.

### 3.6. Benutzeroberfläche (UI)

*   **Inspiration:** Das Layout und die Bedienung der Korg Electribe ESX.
*   **Grid-Controller:** 16 Pads zur Step-Eingabe und zum Triggern von Samples.
*   **Virtuelle Potis und Fader:** Zur Steuerung von Parametern.
*   **Display:** Ein zentraler Bereich zur Anzeige von detaillierten Informationen und zur Bearbeitung von Samples und Synthesizer-Parametern.
*   **Farbcodierung:** Zur visuellen Unterscheidung der verschiedenen Spuren und Funktionen.

## 4. Technischer Stack

*   **Sprache:** TypeScript
*   **Audio-API:** Web Audio API
*   **Frameworks:**
    *   **UI:** React oder Vue.js zur effizienten Verwaltung der komplexen Benutzeroberfläche.
    *   **State Management:** Redux oder ein ähnliches State-Management-Tool zur Verwaltung des Anwendungszustands.
*   **Build-Tool:** Vite oder Webpack für einen modernen und schnellen Build-Prozess.

## 5. Entwicklungs-Roadmap

### Phase 1: Refactoring und Bereinigung (1-2 Wochen)

1.  **Entfernen der Chat-Funktion:** Vollständige Entfernung des gesamten Chat-Codes aus dem Projekt. ✅ ERLEDIGT
    - Entfernt Chat-spezifische CSS-Klassen aus `css/ui.css`
    - Entfernt Chat-Navigation-Tastaturkürzel aus `src/keyboard.ts` und `js/keyboard.js`
    - Entfernt Routing-Methoden für Chat-Seiten aus `src/keyboard.ts` und `js/keyboard.js`
2.  **Projekt-Struktur anpassen:** Umstellung auf die neue Projektstruktur mit den oben genannten Kernmodulen. ✅ ERLEDIGT
    - Neue Verzeichnisstruktur erstellt: `src/core/`, `src/modules/`, `src/ui/`, `src/types/`, `src/utils/`
    - Grundlegende Dateien für Audio-Engine und Sequencer angelegt
    - Zentrale Typdefinitionen und Utility-Funktionen implementiert
3.  **Build-Prozess umstellen:** Migration von `build.js` zu Vite oder Webpack. ✅ ERLEDIGT
    - Aktuelle Build-Konfiguration in `vite.config.js` optimiert
    - Code-Splitting und moderne ES2020-Features implementiert
    - Dokumentation aktualisiert (README.md, DEVELOPER.md, GEMINI.md)
4.  **UI-Framework integrieren:** Einrichten von React oder Vue.js. ✅ ERLEDIGT
    - React-Komponenten in neue Struktur migriert: `src/ui/components/`
    - Komponenten für Sequencer, Mixer, Synthesizer und Transport erstellt
    - Haupt-App-Komponente aktualisiert und mit Audio-Engine verbunden
    - Default-Werte und PropTypes für bessere Stabilität implementiert

### Phase 2: Kern-Implementierung (4-6 Wochen)

1.  **Audio-Engine V2:** Entwicklung einer neuen, leistungsfähigeren Audio-Engine, die für die Anforderungen des Samplers und Synthesizers optimiert ist. ✅ ERLEDIGT
    - Implementierung präziser Timing-Systeme mit AudioWorklets
    - Optimierung für gleichzeitige Sampler- und Synthesizer-Verwendung
    - Performance-Verbesserungen durch Node-Pooling
    - Erstellung vollständiger Module: Mixer, SampleEngine, SynthEngine, EffectProcessor
2.  **Sequencer V2:** Implementierung des neuen Sequencers mit allen oben genannten Funktionen.
3.  **Mixer V1:** Implementierung des 16-Kanal-Mischpults.

### Phase 2: Kern-Implementierung (4-6 Wochen)

1.  **Audio-Engine V2:** Entwicklung einer neuen, leistungsfähigeren Audio-Engine, die für die Anforderungen des Samplers und Synthesizers optimiert ist.
2.  **Sequencer V2:** Implementierung des neuen Sequencers mit allen oben genannten Funktionen.
3.  **Mixer V1:** Implementierung des 16-Kanal-Mischpults.

### Phase 3: Feature-Implementierung (6-8 Wochen)

1.  **Sampler V1:** Implementierung der grundlegenden Sampler-Funktionen (Aufnahme, Laden, Abspielen).
2.  **Synthesizer V1:** Implementierung der virtuell-analogen Synthesizer-Engine.
3.  **Effekte V1:** Implementierung der ersten Effekt-Typen.

### Phase 4: UI und UX (4-6 Wochen)

1.  **UI-Design:** Entwurf einer detaillierten UI, die sich an der Electribe ESX orientiert.
2.  **UI-Implementierung:** Umsetzung des UI-Designs in React oder Vue.js.
3.  **Integration:** Verknüpfung der UI mit der Audio-Engine und den anderen Modulen.

### Phase 5: Erweiterung und Optimierung (laufend)

1.  **Erweiterte Sampler-Funktionen:** Implementierung von Slicing, Time-Stretching und Pitch-Shifting.
2.  **Erweiterte Synthesizer-Funktionen:** Hinzufügen weiterer Oszillator-Algorithmen und Modulationsmöglichkeiten.
3.  **Performance-Optimierung:** Optimierung der Audio-Verarbeitung und der UI-Performance.
4.  **Testing:** Umfassende Tests aller Funktionen. ✅ ERLEDIGT
    - Unit-Tests für alle Kernmodule (AudioEngineV2, Sequencer, SampleEngine, SynthEngine, Mixer)
    - Integrationstests für die Modul-Kooperation
    - Test-Setup mit Vitest und JSDOM für Browser-API-Mocks
5.  **Dokumentation:** Erstellung einer ausführlichen Benutzer- und Entwicklerdokumentation.
