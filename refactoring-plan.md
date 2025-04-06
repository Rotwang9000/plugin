# Code Refactoring Plan

## Current Issues

1. **Large files exceeding recommended limits**:
   - popup.js (2844 lines)
   - content.js (1804 lines approaching limit)

2. **Code duplication**:
   - Duplicate functions like `formatHtmlWithLineNumbers` in popup.js
   - Similar UI rendering logic repeated in multiple places

3. **Complex monolithic structure** making maintenance difficult

## Proposed Module Structure

### Core Modules

1. **utils/**
   - `dom-utils.js` - DOM manipulation helpers
   - `html-utils.js` - HTML formatting functions (formatHtmlWithLineNumbers, escapeHtml)
   - `privacy-utils.js` - Data sanitization and privacy functions

2. **detection/**
   - `smart-detection.js` - Smart mode cookie banner detection
   - `cloud-detection.js` - Cloud pattern matching
   - `button-recognition.js` - Button identification

3. **ui/**
   - `dialog-display.js` - Dialog rendering functions
   - `settings-ui.js` - Settings interface
   - `history-ui.js` - History display
   - `stats-ui.js` - Statistics and counters

4. **api/**
   - `storage.js` - Storage operations
   - `cloud-api.js` - Cloud service interactions
   - `messaging.js` - Cross-script messaging

### Entry Points

1. **popup.js** - Simplified entry point that imports modules
2. **content.js** - Streamlined content script that imports modules
3. **background.js** - Core background service

## Implementation Plan

### Phase 1: Extract Utilities
- Create utils/ directory
- Move helper functions to appropriate utility modules
- Update references to these functions

### Phase 2: Split UI Components
- Create ui/ directory
- Extract dialog rendering, history, and settings UI code
- Implement proper imports

### Phase 3: Modularize Detection Logic
- Create detection/ directory
- Separate smart, cloud, and button recognition logic
- Ensure proper communication between modules

### Phase 4: API Abstractions
- Create api/ directory
- Abstract storage, messaging, and cloud operations
- Standardize API interfaces

### Phase 5: Update Entry Points
- Slim down main files to primarily import and initialize modules
- Ensure proper dependency management

## Benefits

- **Improved maintainability**: Smaller, focused files
- **Better testability**: Isolated components
- **Easier collaboration**: Clear boundaries between functionality
- **Performance improvements**: Potential for lazy-loading of features
- **Simplified debugging**: Isolated functionality

## Technical Requirements

- Update build system to handle module imports
- Ensure backward compatibility
- Add comprehensive documentation
- Implement proper testing for new modules

## Timeline

| Phase | Estimated Time | Dependencies |
|-------|----------------|--------------|
| 1     | 1-2 days       | None         |
| 2     | 2-3 days       | Phase 1      |
| 3     | 2-3 days       | Phase 1      |
| 4     | 1-2 days       | Phase 1-3    |
| 5     | 1-2 days       | Phase 1-4    | 