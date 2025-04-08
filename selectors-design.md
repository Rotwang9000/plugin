# Selectors.json Design Document

This document outlines the improved structure for `selectors.json` to support a more configurable, maintainable, and pattern-based approach to dialog detection.

## Goals

1. Centralize all selector definitions in one file
2. Add priority/confidence scoring for each selector
3. Support pattern-based detection instead of site-specific handling
4. Allow for easier community contributions
5. Support more button types and element types
6. Include exclusion patterns to avoid false positives

## Schema Design

```json
{
  "version": "2.0.0",
  
  "dialogSelectors": [
    {
      "query": "#cookie-banner",
      "priority": 10,
      "description": "Standard cookie banner ID"
    },
    {
      "query": ".cookie-banner",
      "priority": 9,
      "description": "Standard cookie banner class"
    },
    {
      "query": "#onetrust-banner-sdk",
      "priority": 10,
      "description": "OneTrust cookie banner"
    }
  ],
  
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
  ],
  
  "buttonTypes": {
    "accept": {
      "selectors": [
        {
          "query": "#onetrust-accept-btn-handler",
          "priority": 10,
          "description": "OneTrust accept button"
        },
        {
          "query": "#acceptBtn",
          "priority": 10,
          "description": "Common accept button ID"
        },
        {
          "query": "button[id*='accept']",
          "priority": 8,
          "description": "Button with 'accept' in ID"
        },
        {
          "query": "[class*='accept']",
          "priority": 7,
          "description": "Element with 'accept' in class"
        }
      ],
      "textPatterns": [
        {
          "pattern": "accept all cookies",
          "priority": 10,
          "caseSensitive": false,
          "description": "Explicit accept all cookies text"
        },
        {
          "pattern": "accept all",
          "priority": 9,
          "caseSensitive": false,
          "description": "Accept all text"
        },
        {
          "pattern": "accept cookies",
          "priority": 9,
          "caseSensitive": false,
          "description": "Accept cookies text"
        },
        {
          "pattern": "accept",
          "priority": 5,
          "caseSensitive": false,
          "description": "Simple accept text"
        },
        {
          "pattern": "agree",
          "priority": 5,
          "caseSensitive": false,
          "description": "Agree text"
        },
        {
          "pattern": "i agree",
          "priority": 6,
          "caseSensitive": false,
          "description": "I agree text"
        },
        {
          "pattern": "allow",
          "priority": 5,
          "caseSensitive": false,
          "description": "Allow text"
        },
        {
          "pattern": "ok",
          "priority": 4,
          "caseSensitive": false,
          "description": "OK text"
        },
        {
          "pattern": "got it",
          "priority": 5,
          "caseSensitive": false,
          "description": "Got it text"
        }
      ],
      "excludePatterns": [
        "settings",
        "preferences",
        "more info",
        "learn more",
        "customize",
        "customise",
        "manage"
      ],
      "stylePatterns": [
        {
          "property": "backgroundColor",
          "values": ["#000", "rgba(0, 0, 0", "rgb(0, 0, 0", "black"],
          "priority": 3,
          "description": "Dark background (often primary action)"
        },
        {
          "property": "color",
          "values": ["#fff", "#ffffff", "white"],
          "priority": 3,
          "description": "White text (often primary action)"
        },
        {
          "property": "position",
          "values": ["flex-end", "right"],
          "priority": 2,
          "description": "Button positioned at right/end (often primary action)"
        }
      ]
    },
    "reject": {
      "selectors": [
        {
          "query": "#onetrust-reject-all-handler",
          "priority": 10,
          "description": "OneTrust reject button"
        },
        {
          "query": "#rejectBtn",
          "priority": 10,
          "description": "Common reject button ID"
        },
        {
          "query": "button[id*='reject']",
          "priority": 8,
          "description": "Button with 'reject' in ID"
        },
        {
          "query": "[id*='necessary']",
          "priority": 8,
          "description": "Element with 'necessary' in ID"
        },
        {
          "query": "[class*='reject']",
          "priority": 7,
          "description": "Element with 'reject' in class"
        },
        {
          "query": "[class*='necessary']",
          "priority": 7,
          "description": "Element with 'necessary' in class"
        }
      ],
      "textPatterns": [
        {
          "pattern": "reject all",
          "priority": 10,
          "caseSensitive": false,
          "description": "Reject all text"
        },
        {
          "pattern": "reject cookies",
          "priority": 9,
          "caseSensitive": false,
          "description": "Reject cookies text"
        },
        {
          "pattern": "necessary only",
          "priority": 9,
          "caseSensitive": false,
          "description": "Necessary only text"
        },
        {
          "pattern": "essential only",
          "priority": 9,
          "caseSensitive": false,
          "description": "Essential only text"
        },
        {
          "pattern": "only necessary",
          "priority": 9,
          "caseSensitive": false,
          "description": "Only necessary text"
        },
        {
          "pattern": "only essential",
          "priority": 9,
          "caseSensitive": false,
          "description": "Only essential text"
        },
        {
          "pattern": "reject",
          "priority": 6,
          "caseSensitive": false,
          "description": "Reject text"
        },
        {
          "pattern": "necessary",
          "priority": 6,
          "caseSensitive": false,
          "description": "Necessary text"
        },
        {
          "pattern": "essential",
          "priority": 6,
          "caseSensitive": false,
          "description": "Essential text"
        },
        {
          "pattern": "decline",
          "priority": 6,
          "caseSensitive": false,
          "description": "Decline text"
        },
        {
          "pattern": "refuse",
          "priority": 6,
          "caseSensitive": false,
          "description": "Refuse text"
        }
      ],
      "excludePatterns": [
        "settings",
        "preferences",
        "more info",
        "learn more"
      ],
      "stylePatterns": [
        {
          "property": "border",
          "values": ["1px", "2px", "solid", "outline"],
          "priority": 2,
          "description": "Outlined button (often secondary action)"
        },
        {
          "property": "backgroundColor",
          "values": ["transparent", "rgba(0, 0, 0, 0)"],
          "priority": 2,
          "description": "Transparent background (often secondary action)"
        }
      ]
    },
    "customize": {
      "selectors": [
        {
          "query": "#onetrust-pc-btn-handler",
          "priority": 10,
          "description": "OneTrust preference center button"
        },
        {
          "query": "#customizeBtn",
          "priority": 10,
          "description": "Common customize button ID"
        },
        {
          "query": "button[id*='settings']",
          "priority": 8,
          "description": "Button with 'settings' in ID"
        },
        {
          "query": "button[id*='custom']",
          "priority": 8,
          "description": "Button with 'custom' in ID"
        },
        {
          "query": "button[id*='preferences']",
          "priority": 8,
          "description": "Button with 'preferences' in ID"
        },
        {
          "query": "[class*='settings']",
          "priority": 7,
          "description": "Element with 'settings' in class"
        }
      ],
      "textPatterns": [
        {
          "pattern": "cookie settings",
          "priority": 10,
          "caseSensitive": false,
          "description": "Cookie settings text"
        },
        {
          "pattern": "customize cookies",
          "priority": 10,
          "caseSensitive": false,
          "description": "Customize cookies text"
        },
        {
          "pattern": "customise cookies",
          "priority": 10,
          "caseSensitive": false,
          "description": "Customise cookies text (UK spelling)"
        },
        {
          "pattern": "preferences",
          "priority": 8,
          "caseSensitive": false,
          "description": "Preferences text"
        },
        {
          "pattern": "settings",
          "priority": 8,
          "caseSensitive": false,
          "description": "Settings text"
        },
        {
          "pattern": "manage",
          "priority": 7,
          "caseSensitive": false,
          "description": "Manage text"
        },
        {
          "pattern": "customize",
          "priority": 8,
          "caseSensitive": false,
          "description": "Customize text"
        },
        {
          "pattern": "customise",
          "priority": 8,
          "caseSensitive": false,
          "description": "Customise text (UK spelling)"
        }
      ]
    }
  },
  
  "checkboxTypes": {
    "essential": {
      "selectors": [
        {
          "query": "input[type='checkbox'][id*='essential']",
          "priority": 10,
          "description": "Checkbox with 'essential' in ID"
        },
        {
          "query": "input[type='checkbox'][id*='necessary']",
          "priority": 10,
          "description": "Checkbox with 'necessary' in ID"
        }
      ],
      "labelPatterns": [
        {
          "pattern": "essential",
          "priority": 9,
          "description": "Essential label text"
        },
        {
          "pattern": "necessary",
          "priority": 9,
          "description": "Necessary label text"
        },
        {
          "pattern": "required",
          "priority": 8,
          "description": "Required label text"
        },
        {
          "pattern": "functional",
          "priority": 7,
          "description": "Functional label text"
        }
      ],
      "defaultChecked": true,
      "shouldBeChecked": true,
      "disabled": true
    },
    "analytics": {
      "selectors": [
        {
          "query": "input[type='checkbox'][id*='analytic']",
          "priority": 10,
          "description": "Checkbox with 'analytic' in ID"
        },
        {
          "query": "input[type='checkbox'][id*='statistic']",
          "priority": 9,
          "description": "Checkbox with 'statistic' in ID"
        }
      ],
      "labelPatterns": [
        {
          "pattern": "analytics",
          "priority": 9,
          "description": "Analytics label text"
        },
        {
          "pattern": "statistics",
          "priority": 9,
          "description": "Statistics label text"
        },
        {
          "pattern": "performance",
          "priority": 8,
          "description": "Performance label text"
        }
      ],
      "defaultChecked": false,
      "shouldBeChecked": false
    },
    "marketing": {
      "selectors": [
        {
          "query": "input[type='checkbox'][id*='market']",
          "priority": 10,
          "description": "Checkbox with 'market' in ID"
        },
        {
          "query": "input[type='checkbox'][id*='advertis']",
          "priority": 9,
          "description": "Checkbox with 'advertis' in ID"
        },
        {
          "query": "input[type='checkbox'][id*='social']",
          "priority": 8,
          "description": "Checkbox with 'social' in ID"
        }
      ],
      "labelPatterns": [
        {
          "pattern": "marketing",
          "priority": 9,
          "description": "Marketing label text"
        },
        {
          "pattern": "advertising",
          "priority": 9,
          "description": "Advertising label text"
        },
        {
          "pattern": "social",
          "priority": 8,
          "description": "Social label text"
        },
        {
          "pattern": "targeting",
          "priority": 8,
          "description": "Targeting label text"
        }
      ],
      "defaultChecked": false,
      "shouldBeChecked": false
    }
  },
  
  "regionDetection": {
    "tldPatterns": {
      "eu": [".uk", ".co.uk", ".eu", ".de", ".fr", ".es", ".it", ".nl", ".be", ".dk", ".ie"],
      "us": [".us", ".com", ".org", ".edu", ".gov"],
      "global": [".com", ".org", ".net"]
    },
    "languagePatterns": {
      "eu": ["en-GB", "de", "fr", "es", "it", "nl", "da", "sv", "fi", "el", "cs", "et", "hu", "lv", "lt", "mt", "pl", "sk", "sl"],
      "us": ["en-US"],
      "global": ["en"]
    },
    "contentPatterns": {
      "eu": ["gdpr", "information commissioner", "legitimate interest", "ico", "uk data protection", "eu cookie law", "european union", "data protection"],
      "us": ["ccpa", "cpra", "california privacy", "california consumer privacy", "do not sell", "opt-out"]
    }
  }
}
```

## Key Improvements

### 1. Priority-based Selectors

Each selector now has a priority value from 1-10, where:
- 10: Exact/specific match (e.g., `#onetrust-accept-btn-handler`)
- 8-9: Very confident generic match (e.g., `button[id*='accept']`)
- 5-7: Confident generic match (e.g., `[class*='accept']`)
- 1-4: Less confident match (e.g., style-based detection)

This allows the finder to try selectors in order of confidence.

### 2. Descriptive Metadata

Each selector includes a description field to explain its purpose, making it easier for contributors to understand and maintain.

### 3. Expanded Button Types

Added support for:
- Accept buttons
- Reject/necessary-only buttons
- Customize/settings buttons
- More types can be added easily

### 4. Checkbox Configuration

Added support for checkbox configuration:
- Essential/necessary checkboxes (should be checked)
- Analytics checkboxes (should be unchecked)
- Marketing checkboxes (should be unchecked)
- Default state and desired state for each

### 5. Visual/Style Detection

Moved style-based detection to configuration:
- Color patterns
- Position patterns
- Border/outline detection
- Lower priority than specific selectors

### 6. Region Detection

Replaced hardcoded region detection with configurable patterns:
- TLD patterns for regions
- Language patterns
- Content-based detection

### 7. Exclude Patterns

Added exclude patterns to avoid false positives:
- Words that shouldn't appear in certain button types
- Helps differentiate between similar buttons

## Usage Examples

### Finding an Accept Button

```javascript
// Using the new ElementFinder with selectors.json
const finder = new ButtonFinder(selectors);
const acceptButton = finder.findButton(container, 'accept');
```

### Finding and Configuring Checkboxes

```javascript
// Using the new CheckboxFinder with selectors.json
const checkboxFinder = new CheckboxFinder(selectors);
const checkboxes = checkboxFinder.findAndConfigureCheckboxes(container);
// Each checkbox will be checked/unchecked according to configuration
```

### Detecting Region

```javascript
// Using configurable region detection
const regionDetector = new RegionDetector(selectors.regionDetection);
const region = regionDetector.detectRegion(document);
```

## Migration Path

1. Create the new selectors.json structure
2. Create ElementFinder classes that use this structure
3. Update existing code to use these new finders
4. Remove hardcoded selectors and special cases 