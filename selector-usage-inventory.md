# Selector Usage Inventory

## 1. JSON-based Selectors (`selectors.json`)

### Current Structure
```json
{
  "cookieDialogSelectors": [
    "#cookie-banner", 
    ".cookie-banner",
    "#cookie-notice", 
    ".cookie-notice",
    // More general dialog selectors...
  ],
  "dialogTypes": {
    "xGrokHistory": {
      "selectors": [".view-browser-history-dialog", ".timeline-dialog", ".tweet-details"]
    }
  },
  "buttonTypes": {
    "accept": {
      "selectors": [
        "button[id*='accept']",
        "button[class*='accept']",
        // More accept button selectors...
      ],
      "textPatterns": [
        "accept", 
        "agree", 
        "allow", 
        "ok", 
        "consent"
      ]
    },
    "customize": {
      "selectors": [
        "button[id*='settings']",
        "button[class*='settings']",
        // More customize button selectors...
      ],
      "textPatterns": [
        "settings", 
        "customize", 
        "preference", 
        "manage", 
        "choose", 
        "select", 
        "cookie"
      ]
    },
    "necessary": {
      "selectors": [
        "button[id*='necessary']",
        "button[class*='necessary']",
        // More necessary button selectors...
      ],
      "textPatterns": [
        "necessary", 
        "essential", 
        "required", 
        "reject", 
        "decline", 
        "refuse", 
        "only"
      ]
    }
  }
}
```

### Usage Points
1. **`content.js`**: 
   - Loaded via `loadSelectors()` function
   - Used for general dialog detection

2. **`src/detection/button-recognition.js`**: 
   - Loaded via `loadSelectorsConfig()` function
   - Used to find buttons by type
   - Contains hardcoded fallback values if loading fails

3. **`tests/cookie-detection.test.js`**:
   - Tests that selectors.json is properly loaded and used

## 2. Hardcoded Selectors in Functions

### `src/utils/buttonFinders.js`

#### Hardcoded Terms Arrays
```javascript
// For necessary/essential cookies only options
const necessaryTerms = [
  'necessary', 'essential', 'required', 'basic', 
  'functional', 'reject all', 'reject', 'decline', 'refuse',
  'only necessary', 'only essential'
];

// Common button texts for accepting cookies
const acceptTexts = ['accept', 'agree', 'ok', 'yes', 'got it', 
                    'allow', 'understand', 'consent'];
```

#### Direct DOM Queries
```javascript
// Direct OneTrust pattern
const onetrustRejectBtn = container.querySelector('#onetrust-reject-all-handler');

// Direct DOM queries
const idSpecificElements = container.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');

// Generic button queries
const buttons = container.querySelectorAll('button');

// Checkbox queries
const checkboxes = container.querySelectorAll('input[type="checkbox"]');
```

### `src/detection/cloud-detection.js`

#### Hardcoded Button Selectors Object
```javascript
const buttonSelectors = {
  accept: [
    // Accept button selectors...
  ],
  reject: [
    // Reject button selectors...
  ],
  necessary: [
    // Necessary button selectors...
  ],
  settings: [
    // Settings button selectors...
  ]
};
```

#### Hardcoded Button Text Patterns
```javascript
const buttonTexts = {
  accept: ['accept', 'agree', 'allow', 'got it', 'i understand', 'ok'],
  reject: ['reject', 'decline', 'refuse', 'no thanks', 'later'],
  necessary: ['necessary', 'essential', 'required'],
  settings: ['settings', 'preferences', 'customize', 'manage', 'options']
};
```

### `content.js`

#### Cloud Database Object
```javascript
const cloudDatabase = {
  // Common selectors that work across many sites
  common: [
    // General cookie consent patterns
    { 
      selector: '.cookie-accept-all', 
      type: 'button', 
      patternId: 'cookie-accept', 
      rating: 4.9,
      signature: {
        classPatterns: ['cookie-', 'accept'],
        structure: 'div > .cookie-accept-all'
      }
    },
    // More common patterns...
  ]
};
```

#### Privacy Terms Array
```javascript
const ukPrivacyTerms = [
  'cookie', 'cookies', 'gdpr', 'data protection', 'privacy', 
  'consent', 'personal data', 'legitimate interest', 'ccpa', 
  // More terms...
];
```

## 3. Mixed Selector Usage

### `content.js` - `clickCustomizeButton` Function
```javascript
async function clickCustomizeButton(dialogElement) {
  // First try button-recognition module
  const settingsButton = await findSettingsButton(dialogElement);
  if (settingsButton) {
    return clickElement(settingsButton);
  }
  
  // Fall back to loaded selectors if no button found
  const customizeSelectors = selectors.buttonTypes?.customize?.selectors || [];
  const customizeTextPatterns = selectors.buttonTypes?.customize?.textPatterns || [];
  
  // Use these selectors and patterns...
}
```

### `tests/popup.test.js` - Element Detection
```javascript
// Extract all potential buttons
const buttons = tempDiv.querySelectorAll('button, a[role="button"], [type="button"], [type="submit"], input[type="submit"], [class*="button"], [class*="btn"]');

// Special case for test matching
if (buttonText === 'Necessary Only' || button.id === 'necessary') {
  elementTypeSelect.value = 'necessary_only';
}
```

## 4. Special Cases and Site-Specific Handling

### Domain-Based Special Cases
```javascript
// Region detection based on TLDs
if (domain.endsWith('.uk') || domain.endsWith('.co.uk') || domain.endsWith('.eu')) {
  return 'eu';  // Return EU for UK/EU domains
}

// Site-specific selectors (in tests)
function getSiteSpecificSelectors(domain, cloudDatabase) {
  // Try exact domain match
  if (cloudDatabase.sites[domain]) {
    return cloudDatabase.sites[domain];
  }
  
  // Try removing subdomains
  const baseDomain = domain.split('.').slice(-2).join('.');
  if (cloudDatabase.sites[baseDomain]) {
    return cloudDatabase.sites[baseDomain];
  }
  
  return null;
}
```

### Platform-Specific UI Detection
```javascript
// Check for Twitter-style React Native components with css- and r- classes
const possibleTwitterButtons = container.querySelectorAll('[role="button"], button');
for (const button of possibleTwitterButtons) {
  // Check if this is a Twitter-style component with css- and r- classes
  if (button.className && typeof button.className === 'string') {
    const classes = button.className.split(' ');
    const hasTwitterClasses = classes.some(cls => cls.startsWith('css-') || cls.startsWith('r-'));
    
    if (hasTwitterClasses) {
      // Twitter-specific handling...
    }
  }
}
```

## 5. Selector Usage Patterns and Issues

### Inconsistent Priority Order
Each function uses different selector priority orders:
- Some try ID-based selectors first
- Some try text patterns first
- Some try specific patterns (like OneTrust) first
- Some have hardcoded exclusions, others don't

### Duplication of Patterns
- Same text patterns are defined in multiple places
- Similar selectors with slight variations across files
- No central definition of pattern priorities

### Test Cases vs. Production Code
- Test code sometimes includes different selectors or special cases
- No clear separation between test fixtures and real patterns

### Technical Debt in Selection Logic
- Multiple fallback mechanisms
- No consistent handling of priority or confidence
- Minimal error handling or reporting
 