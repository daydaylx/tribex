# GEMINI.md

## Project Overview

TribeX is a web-based drum sequencer that utilizes the Web Audio API to provide in-browser audio sequencing. The application is built with a mix of JavaScript and TypeScript, and is designed for deployment on Cloudflare Pages.

The core functionalities include an 11-part drum sequencer, a pattern and chain system, motion sequencing for parameter automation, and Web MIDI support. The user interface provides visual feedback for active steps and color-coded drum parts.

## Building and Running

### Development

To run the application in a development environment, use the following command:

```bash
npm run dev
```

This will start a local development server.

### Building

To build the application for production, use the following command:

```bash
npm run build
```

This command uses Vite to build the application, which compiles the TypeScript code, performs code splitting for better performance, and copies all necessary assets to the `dist` directory.

### Deployment

To deploy the application to Cloudflare Pages, use the following command:

```bash
npm run deploy
```

This command first builds the project, and then deploys the contents of the `dist` directory to Cloudflare Pages.

## Development Conventions

The project is in a transitional state from JavaScript to TypeScript. New development should be done in TypeScript. The project has a modular architecture with a clear separation of concerns.

- **State Management:** A central `state` object manages the application's state.
- **Typing:** TypeScript types are defined in `src/tribeX-types.ts`.
- **History:** An advanced history management system using the Command Pattern is implemented for undo/redo functionality.
- **Code Style:** The existing code style should be followed.
