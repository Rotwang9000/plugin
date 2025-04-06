# Module System Documentation

## Overview

This document describes the modular architecture being implemented in the Cookie Consent Manager. The goal is to improve code organization, reduce duplication, and make the codebase more maintainable.

## Module Structure

```
src/
  ├── modules/
  │   ├── utils/
  │   │   ├── html-utils.js
  │   │   ├── dom-utils.js
  │   │   └── privacy-utils.js
  │   ├── api/
  │   │   ├── storage.js
  │   │   └── cloud-api.js
  │   ├── ui/
  │   │   ├── dialog-display.js
  │   │   └── settings-ui.js
  │   └── detection/
  │       ├── smart-detection.js
  │       └── button-recognition.js
  ├── popup.js
  ├── content.js
  └── background.js
```

## Using Modules

### HTML Utilities (html-utils.js)

```javascript
import { formatHtmlWithLineNumbers, escapeHtml } from '../modules/utils/html-utils.js';

// Format HTML with line numbers for display
const formattedHtml = formatHtmlWithLineNumbers(myHtmlContent);

// Escape HTML to prevent XSS
const safeHtml = escapeHtml(userProvidedContent);
```

### DOM Utilities (dom-utils.js)

```javascript
import { createElement, clearElement } from '../modules/utils/dom-utils.js';

// Create a new element with attributes
const button = createElement('button', {
  className: 'action-button',
  textContent: 'Accept Cookies'
}, null, parentElement);

// Clear all children from an element
clearElement(containerElement);
```

### Storage Operations (storage.js)

```javascript
import { getSettings, saveSettings } from '../modules/api/storage.js';

// Get current settings
getSettings(settings => {
  console.log('Current settings:', settings);
  
  // Update a setting
  settings.smartMode = true;
  
  // Save updated settings
  saveSettings(settings, () => {
    console.log('Settings saved!');
  });
});
```

## Migrating to Modules

To convert existing code to use the new module system:

1. Identify related functions that should be grouped together
2. Create a new module file in the appropriate directory
3. Move the functions into the new file, adding proper exports
4. Replace direct function calls with imports and calls to the modules
5. Update tests to import from the module instead of redefining functions

## Testing Modules

Each module has corresponding test files in the `tests/modules/` directory. For example:

```javascript
// tests/modules/html-utils.test.js
import { formatHtmlWithLineNumbers } from '../../src/modules/utils/html-utils.js';

describe('formatHtmlWithLineNumbers', () => {
  it('should format HTML with line numbers', () => {
    const html = '<div>Test</div>';
    const result = formatHtmlWithLineNumbers(html);
    expect(result).toContain('<table>');
    expect(result).toContain('<td class="line-numbers">1</td>');
    expect(result).toContain('<td>&lt;div&gt;Test&lt;/div&gt;</td>');
  });
});
```

Run tests with:

```
npm test
```

## Benefits of the Module System

- **Code reuse**: Functions are defined once and imported where needed
- **Maintainability**: Smaller, focused files with clear responsibilities
- **Testability**: Modules can be tested in isolation
- **Organization**: Related functionality is grouped logically
- **Documentation**: Each module has clear documentation for its purpose and usage 