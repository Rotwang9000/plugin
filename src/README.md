# Cookie Consent Manager Code Structure

The extension code has been refactored to use a modular architecture for better maintainability. Here's an overview of the directory structure and main components:

## Directory Structure

```
src/
├── modules/         # Core functionality modules
│   ├── settings.js  # Configuration, settings and shared state
│   └── cloudDatabase.js # Cloud database and detection patterns
├── utils/           # Utility functions
│   ├── buttonFinders.js # Functions for finding cookie consent buttons
│   ├── elementInteraction.js # Element visibility/interaction logic
│   └── privacy.js   # Privacy and sanitization functions
├── handlers/        # Event and logic handlers
│   ├── dialogCapture.js # Dialog capturing functionality
│   └── smartFormula.js # Smart detection algorithm
└── index.js         # Main entry point
```

## Component Overview

### Core Modules

- **settings.js**: Central settings management and shared state variables
- **cloudDatabase.js**: Database of known consent patterns and cloud mode logic

### Utilities

- **buttonFinders.js**: Functions to find and identify consent buttons
- **elementInteraction.js**: Visibility checks and safe click handling
- **privacy.js**: Data sanitization and privacy protection functions

### Handlers

- **dialogCapture.js**: Captures consent dialogs for analysis/reporting
- **smartFormula.js**: Smart detection algorithm to identify consent banners

### Main Entry Point

- **index.js**: Initializes the extension, sets up message listeners, and orchestrates the detection process

## Build Process

The code uses webpack to bundle the modules into the final distribution files:

1. **Development**: Run `npm run dev` to watch files and rebuild during development
2. **Production**: Run `npm run build` to create optimized production bundles

The bundled files are placed in the `dist/` directory and referenced by the extension manifest.

## Testing

Unit tests can be run with `npm test`. The Jest configuration in package.json is set up to use jsdom for DOM manipulation testing.

## Maintenance Guidelines

1. Keep modules small and focused on a single responsibility
2. Add proper JSDoc comments for all exported functions
3. Use consistent error handling patterns
4. Avoid circular dependencies between modules
5. Maintain test coverage for critical functionality 