# Contributing to Cookie Consent Manager

Thank you for considering contributing to the Cookie Consent Manager extension! Here's how you can help improve this project.

## Adding Selectors to selectors.json

The extension uses a comprehensive `selectors.json` file for cookie consent detection. To add new selectors:

1. Open the `selectors.json` file
2. Add your selector to the appropriate section:

### Dialog Selectors
Add selectors that identify cookie dialog containers:

```json
"dialogSelectors": [
  {
    "query": "#your-cookie-banner",
    "priority": 10,
    "description": "Description of your selector"
  }
]
```

### Button Selectors
Add selectors for specific button types (accept, reject, customize):

```json
"buttonTypes": {
  "accept": {
    "selectors": [
      {
        "query": "#your-accept-button",
        "priority": 10,
        "description": "Custom accept button"
      }
    ]
  }
}
```

### Priority System
Selectors use a priority system (1-10) to determine which selectors to try first:
- 10: Exact ID match or highly specific selector (highest confidence)
- 7-9: Class-based or attribute-based selectors (good confidence)
- 4-6: Pattern-based selectors (medium confidence)
- 1-3: Generic or fallback selectors (low confidence)

### Text Patterns
For buttons identified by text content:

```json
"textPatterns": [
  {
    "pattern": "accept all cookies",
    "priority": 10,
    "description": "Accept all cookies text"
  }
]
```

### Exclude Patterns
To avoid false positives, add exclusion patterns:

```json
"excludePatterns": [
  "settings",
  "preferences",
  "more info"
]
```

## Extending the Finder System

The extension uses a modular finder system in `src/utils/finders/`:

1. **ElementFinder**: Base class for finding elements
2. **ButtonFinder**: For finding cookie consent buttons
3. **CheckboxFinder**: For finding cookie preference checkboxes
4. **DialogFinder**: For finding cookie consent dialogs

To extend the system:

1. Create a new class extending the appropriate base class
2. Add methods for your specific element finding needs
3. Use existing patterns for consistency
4. Update `index.js` to export your new class

Example:

```javascript
import { ElementFinder } from './elementFinder.js';

export class YourCustomFinder extends ElementFinder {
  constructor(selectors) {
    super(selectors);
  }
  
  findYourElement(container) {
    // Your implementation here
  }
}
```

## Using the Dialog Capture System

The dialog capture system allows users to contribute to the selector database without editing code:

1. Enable the extension while browsing
2. When cookie dialogs are detected and handled, they are stored for review
3. Click the extension icon and go to the "Captured Dialogs" tab
4. Review and rate the captured dialogs:
   - Click "Good Match" if the dialog was correctly identified
   - Click "Bad Match" if the dialog was incorrectly identified
5. Your ratings help improve the detection algorithms for all users

## Reporting Issues

When reporting issues, please include:

1. The website URL where the issue occurred
2. A description of what happened vs what was expected
3. Screenshots if applicable
4. Browser version and operating system
5. For cookie detection problems, include the HTML structure of the dialog if possible

## Code Contributions

For larger code contributions:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request with a clear description of the changes

## Testing

Before submitting, test your changes on a variety of websites to ensure they work correctly and don't interfere with normal browsing. In particular, test:

- Popular websites with common cookie dialogs
- Regional websites that might use different languages
- Sites with custom cookie implementations

### Automated Testing

The project includes a comprehensive test suite using Jest. Run all tests with:

```
npm test
```

When adding new features or fixing bugs:

1. Add or update tests that cover your changes
2. Ensure all existing tests continue to pass
3. Write tests for edge cases and potential failure modes

The test suite includes:

- **Unit tests** for individual functions and components
- **Integration tests** for communication between different parts of the extension
- **Edge case tests** for unusual cookie banner scenarios
- **Configuration tests** for validating the extension setup

Tests are organized in the `tests/` directory by component.

Follow these testing best practices:
- Mock Chrome APIs and DOM interactions
- Use descriptive test names that explain what's being tested
- Keep tests focused on testing a single behavior
- Use setup and teardown functions to maintain test isolation

## Code Style

- Use tabs for indentation
- Follow existing code patterns
- Keep functions small and focused on a single task
- Add comments for complex logic
- No special cases hardcoded - use the selectors.json configuration system

Thank you for helping improve the Cookie Consent Manager! 