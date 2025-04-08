# Selectors System Documentation

The cookie consent manager uses a centralized selector system to identify and interact with cookie consent elements across the web. This document explains the structure and usage of the `selectors.json` file.

## File Structure

The `selectors.json` file contains the following main sections:

```json
{
  "version": "2.0.0",
  "dialogSelectors": [...],
  "dialogPatterns": [...],
  "buttonTypes": {...},
  "checkboxTypes": {...},
  "regionDetection": {...}
}
```

## Dialog Selectors

The `dialogSelectors` array contains CSS selectors for identifying cookie consent dialogs:

```json
"dialogSelectors": [
  {
    "query": "#cookie-banner",
    "priority": 10,
    "description": "Standard cookie banner ID"
  },
  ...
]
```

Each entry includes:
- `query` - CSS selector string
- `priority` - Numeric priority (higher = checked first)
- `description` - Human-readable explanation

## Dialog Patterns

The `dialogPatterns` array provides additional pattern matching for dialogs that don't match specific selectors:

```json
"dialogPatterns": [
  {
    "attributes": {
      "id": ["cookie", "consent", "gdpr", "privacy"],
      "class": ["cookie", "consent", "gdpr", "privacy"]
    },
    "priority": 7,
    "description": "Elements with cookie/consent related IDs or classes"
  },
  {
    "contentPatterns": ["cookie", "gdpr", "data protection", "privacy policy"],
    "priority": 5,
    "description": "Elements with cookie/privacy related text"
  }
]
```

## Button Types

The `buttonTypes` object defines different button categories and how to identify them:

```json
"buttonTypes": {
  "accept": {
    "selectors": [...],
    "textPatterns": [...]
  },
  "reject": {
    "selectors": [...],
    "textPatterns": [...] 
  },
  "customize": {
    "selectors": [...],
    "textPatterns": [...]
  }
}
```

Each button type contains:

### Selectors
An array of CSS selectors with priorities:

```json
"selectors": [
  {
    "query": "#acceptBtn",
    "priority": 10,
    "description": "Common accept button ID"
  }
]
```

### Text Patterns
Patterns to match button text content:

```json
"textPatterns": [
  {
    "pattern": "accept all cookies",
    "priority": 10,
    "caseSensitive": false,
    "description": "Accept all cookies text"
  }
]
```

## Checkbox Types

The `checkboxTypes` object defines different categories of checkboxes and how to identify them:

```json
"checkboxTypes": {
  "necessary": {
    "selectors": [...],
    "textPatterns": [...]
  },
  "analytics": {
    "selectors": [...],
    "textPatterns": [...]
  },
  "marketing": {
    "selectors": [...],
    "textPatterns": [...]
  }
}
```

Similar to button types, each checkbox type contains selectors and text patterns.

## Region Detection

The `regionDetection` object contains rules for detecting geographical regions:

```json
"regionDetection": {
  "euCountryCodes": ["AT", "BE", "BG", ...],
  "euIndicators": {
    "textPatterns": ["gdpr", "eu cookie law", ...],
    "domainPatterns": [".eu", ".de", ".fr", ...]
  }
}
```

## Priority System

Selectors use a priority system from 1-10:
- **10**: Exact ID match (highest specificity)
- **9**: Exact class match
- **8**: Partial match (contains pattern)
- **7**: Attribute patterns
- **5-6**: Text content patterns
- **1-4**: Fallback patterns (lowest specificity)

Higher priority selectors are tried first, then lower priority ones if no match is found.

## Usage in Code

The selectors are used by the various finder classes:

1. **ElementFinder**: Base class for finding elements using selectors
2. **ButtonFinder**: Finds buttons using button types
3. **CheckboxFinder**: Finds and categorizes checkboxes
4. **DialogFinder**: Finds cookie consent dialogs
5. **RegionDetector**: Detects geographical regions for regulatory compliance

Each class provides specialized methods for finding their respective elements using the selectors.json configuration.

## Extending Selectors

To add new selectors:

1. Identify the appropriate section (dialogSelectors, buttonTypes, etc.)
2. Add new entries with appropriate priorities
3. Include a descriptive comment to explain what the selector targets
4. Run tests to ensure the new selectors work as expected

When adding selectors, consider:
- Specificity (more specific = higher priority)
- Frequency (common patterns need higher priority)
- Compatibility (ensure selectors work across browsers)
- Performance (complex selectors may impact performance)

## Testing Selectors

Use the test suite to verify your selectors:

```bash
node tests/unit/run-finders.js
```

This will run tests against all finder classes to ensure they correctly use the selectors to find elements. 