# Special Cases Inventory

This document identifies all site-specific handling, special cases, and hardcoded exceptions throughout the codebase that need to be replaced with a more configurable approach.

## 1. Domain-Based Special Cases

### Region Detection by TLD

#### `content.js` - `detectRegion` Function
```javascript
function detectRegion(domain) {
  // Check for regional TLDs
  if (domain.endsWith('.uk') || domain.endsWith('.co.uk') || domain.endsWith('.eu')) {
    return 'eu';  // Return EU for UK/EU domains
  }
  
  // Check for browser language
  const navigatorLanguage = navigator.language || navigator.userLanguage;
  if (navigatorLanguage) {
    const language = navigatorLanguage.split('-')[0].toLowerCase();
    if (['en', 'fr', 'de', 'es', 'it', 'nl', 'pt', 'da', 'sv', 'fi', 'el', 'cs', 'et', 'hu', 'lv', 'lt', 'mt', 'pl', 'sk', 'sl'].includes(language)) {
      return 'eu';  // European languages
    }
  }
  
  // Default to generic region if unknown
  return 'global';
}
```

#### `src/modules/settings.js` - `detectRegion` Function
```javascript
function detectRegion(domain) {
  // Check for UK/EU domains
  if (domain.endsWith('.uk') || domain.endsWith('.co.uk') || 
    domain.endsWith('.eu') || domain.includes('.uk.') ||
    document.documentElement.lang === 'en-GB') {
    return 'uk';
  }
  
  // Check for cookie notice text that's specific to UK/EU compliance
  const pageText = safeGetTextContent(document.body);
  const pageHtml = safeGetHtmlContent(document.body);
  
  // Search for key GDPR-related terms in both text and HTML
  const gdprTerms = ['gdpr', 'information commissioner', 'legitimate interest', 
    'ico', 'uk data protection', 'eu cookie law', 'european union', 
    'data protection'];
  
  for (const term of gdprTerms) {
    if (pageText.includes(term) || pageHtml.includes(term)) {
      return 'uk';
    }
  }
  
  // Default to international
  return 'international';
}
```

### Site-Specific Selectors in Tests

#### `tests/content.test.js` - `getSiteSpecificSelectors` Function
```javascript
function getSiteSpecificSelectors(domain, cloudDatabase) {
  // Try exact domain match
  if (cloudDatabase.sites[domain]) {
    return cloudDatabase.sites[domain];
  }
  
  // Try removing subdomains (e.g., support.example.com -> example.com)
  const baseDomain = domain.split('.').slice(-2).join('.');
  if (cloudDatabase.sites[baseDomain]) {
    return cloudDatabase.sites[baseDomain];
  }
  
  return null;
}
```

## 2. Platform/Framework-Specific Handling

### OneTrust-Specific Handling

#### `src/utils/buttonFinders.js` - Special Cases for OneTrust
```javascript
// First check for OneTrust specific patterns (very common)
// This ensures the ETH Zurich pattern and similar ones are correctly detected
const onetrustRejectBtn = container.querySelector('#onetrust-reject-all-handler');
if (onetrustRejectBtn) {
  return onetrustRejectBtn;
}

// First check for OneTrust specific patterns (very common)
const onetrustAcceptBtn = container.querySelector('#onetrust-accept-btn-handler');
if (onetrustAcceptBtn) {
  return onetrustAcceptBtn;
}
```

### Twitter-Style Component Detection

#### `src/utils/buttonFinders.js` - Twitter-Style Components
```javascript
// Check for Twitter-style React Native components with css- and r- classes
const possibleTwitterButtons = container.querySelectorAll('[role="button"], button');
for (const button of possibleTwitterButtons) {
  // Check if this is a Twitter-style component with css- and r- classes
  if (button.className && typeof button.className === 'string') {
    const classes = button.className.split(' ');
    const hasTwitterClasses = classes.some(cls => cls.startsWith('css-') || cls.startsWith('r-'));
    
    if (hasTwitterClasses) {
      // Look for dark-themed buttons (common for accept buttons) 
      // Twitter often uses rgba(0, 0, 0, 0.75) or similar for accept buttons
      const style = window.getComputedStyle(button);
      const backgroundColor = style.backgroundColor || '';
      const color = style.color || '';
      
      // Check for dark background (likely primary action)
      if (backgroundColor.includes('rgba(0, 0, 0') || 
        backgroundColor.includes('rgb(0, 0, 0') ||
        backgroundColor.includes('#000') ||
        color === 'white' || color === '#fff' || color === '#ffffff') {
        
        // If this is a dark-themed button, it's likely the accept button
        return button;
      }
      
      // Check for any button position at right/end of dialog (common for accept)
      const parentStyle = window.getComputedStyle(button.parentElement);
      if (parentStyle.display.includes('flex') && 
        (parentStyle.justifyContent.includes('end') || 
         parentStyle.justifyContent.includes('right'))) {
        return button;
      }
    }
  }
}
```

## 3. Special Case Handling in Tests

#### `tests/popup.test.js` - Special Case for Test Matching
```javascript
// Special case for test matching - explicitly set the necessary button for tests to pass
if (buttonText === 'Necessary Only' || button.id === 'necessary') {
  elementTypeSelect.value = 'necessary_only';
} else if (buttonTextLower.includes('accept') || buttonTextLower.includes('agree') || buttonTextLower.includes('allow')) {
  elementTypeSelect.value = 'accept_all';
} else if (buttonTextLower.includes('necessary') || buttonTextLower.includes('essential')) {
  elementTypeSelect.value = 'necessary_only';
} else if (buttonTextLower.includes('decline') || buttonTextLower.includes('reject')) {
  elementTypeSelect.value = 'decline';
} else if (buttonTextLower.includes('settings') || buttonTextLower.includes('preferences') || buttonTextLower.includes('customise')) {
  elementTypeSelect.value = 'customise';
} else {
  elementTypeSelect.value = 'other';
}
```

## 4. Hardcoded Visual/Styling Detection

### Style-Based Button Detection

#### `src/utils/buttonFinders.js` - Color/Style-Based Detection
```javascript
// Check for dark background (likely primary action)
if (backgroundColor.includes('rgba(0, 0, 0') || 
  backgroundColor.includes('rgb(0, 0, 0') ||
  backgroundColor.includes('#000') ||
  color === 'white' || color === '#fff' || color === '#ffffff') {
  
  // If this is a dark-themed button, it's likely the accept button
  return button;
}

// Check for any button position at right/end of dialog (common for accept)
const parentStyle = window.getComputedStyle(button.parentElement);
if (parentStyle.display.includes('flex') && 
  (parentStyle.justifyContent.includes('end') || 
    parentStyle.justifyContent.includes('right'))) {
  return button;
}
```

## 5. Fixed Element Detection Patterns

### Direct References to Common Cookie Consent Libraries 

#### `selectors.json` - Specific Library References
```json
"cookieDialogSelectors": [
  "#CybotCookiebotDialog",
  "#onetrust-banner-sdk",
  "#cookie-law-info-bar"
]
```

#### `content.js` - Cloud Database
```javascript
{ selector: '#onetrust-accept-btn-handler', type: 'button', rating: 4.7 },
{ selector: '.cc-accept-all', type: 'button', rating: 4.5 },
{ selector: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', type: 'button', rating: 4.8 },
// Common necessary-only options
{ selector: '#onetrust-reject-all-handler', type: 'button', rating: 4.6, necessary: true },
{ selector: '.cc-accept-necessary', type: 'button', rating: 4.4, necessary: true },
{ selector: '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll', type: 'button', rating: 4.7, necessary: true }
```

## 6. Hardcoded Fallback Patterns

### `src/detection/button-recognition.js` - Hardcoded Fallbacks

```javascript
// Fallback to default configurations if file can't be loaded
return {
  buttonTypes: {
    accept: {
      selectors: [
        '#acceptBtn', '#accept-button', '#accept_button', '#acceptAll', '#accept-all',
        '[id*="accept"]:not([id*="not"]):not([id*="never"])',
        '[id*="agree"]:not([id*="dis"])',
        '[id*="allow"]:not([id*="not"])',
        '.accept-button', '.accept_button', '.acceptBtn', '.accept-all', '.acceptAll',
        '[class*="accept"]:not([class*="not"]):not([class*="never"])',
        '[class*="agree"]:not([class*="dis"])',
        '[class*="allow"]:not([class*="not"])'
      ],
      textPatterns: [
        'accept all', 'accept cookies', 'i accept', 'accept',
        'agree', 'i agree', 'agree all', 'agree to all',
        'allow all', 'allow cookies', 'allow',
        'got it', 'ok', 'okay', 'continue',
        'i understand', 'understood',
        'yes', 'consent', 'save choices'
      ]
    }
    // Other button types...
  }
}
```

## Summary of Special Cases to Remove

1. **Domain-Based Detection**:
   - Remove hardcoded TLD checks (.uk, .eu, etc.)
   - Remove language-based region detection
   - Remove site-specific selector lookup by domain

2. **Platform-Specific Detection**:
   - Remove explicit OneTrust selectors handling
   - Remove Twitter-style component detection
   - Move all platform-specific selectors to configuration

3. **Test-Specific Cases**:
   - Separate test fixtures from production code
   - Remove hardcoded test cases

4. **Visual/Style Detection**:
   - Replace with more reliable pattern-based detection
   - Move to configuration if still needed

5. **Hardcoded Library References**:
   - Move all cookie consent library selectors to configuration
   - Use pattern-based approach instead of specific libraries

6. **Fallback Mechanisms**:
   - Consolidate into central selector configuration
   - Use proper error handling instead of hardcoded fallbacks 