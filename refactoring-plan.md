# Cookie Consent Manager Refactoring Plan

## Current Issues Identified

### 1. Function Duplication
- Multiple button finder functions spread across different files:
  - `src/utils/buttonFinders.js`: Contains `findNecessaryCookiesButton`, `findAcceptButton`
  - `src/detection/button-recognition.js`: Contains `findButtonByType`, `findAcceptButton`, `findAcceptButtonSync`
  - `src/detection/cloud-detection.js`: Contains `findButtonInDialog`
  - Similar functions used across these files with slight variations

### 2. Selector Management
- Inconsistent selector usage:
  - Some functions directly use hardcoded selectors
  - Some pull from `selectors.json`
  - Some use the `cloudDatabase` object in content.js

### 3. Special Cases
- Site-specific handling exists in multiple locations:
  - Tests reference site-specific selectors (`getSiteSpecificSelectors`)
  - Region detection based on domain TLDs
  - Special handling for specific sites/patterns

### 4. Inconsistent Structure
- Multiple approaches to finding elements:
  - Direct DOM queries
  - Selector-based approaches
  - Text content matching
  - Structure-based detection

## Refactoring Action Plan

### Phase 1: Code Audit and Cleanup

#### 1.1. Map All Button Finding Functions
**Actions:**
- [ ] Create a complete inventory of all button/element finder functions
  - List each function with its location, inputs, outputs, and purpose
  - Identify overlapping functionality and redundancies
  - Document all hardcoded selectors and patterns

**Implementation:**
```javascript
// Example from buttonFinders.js
function findNecessaryCookiesButton(container) {
  // ...
}

// Similar function in button-recognition.js
async function findButtonByType(dialogElement, buttonType) {
  // ...
}
```

#### 1.2. Review Selector Usage
**Actions:**
- [ ] Identify all places selectors are defined or used
  - Document hardcoded selectors in JS files
  - Analyse the structure of selectors.json
  - Map the structure and usage of cloudDatabase

**Implementation:**
```javascript
// Example hardcoded selector pattern
const necessaryTerms = [
  'necessary', 'essential', 'required', 'basic', 
  'functional', 'reject all', 'reject', 'decline'
];

// vs JSON-based approach
const selectors = await fetch('selectors.json').then(r => r.json());
```

#### 1.3. Identify Special Cases
**Actions:**
- [ ] Document all site-specific or special case handling
  - Region detection by TLD
  - Domain-specific selectors
  - Special handling for specific UI patterns

**Implementation:**
```javascript
// Example of site-specific handling to be removed
if (domain.endsWith('.uk') || domain.endsWith('.co.uk')) {
  return 'eu';
}
```

### Phase 2: Architecture Design

#### 2.1. Design Unified Element Finder Module
**Actions:**
- [ ] Create a central module structure for all element finding
  - Define consistent interfaces for all finder functions
  - Establish a clear hierarchy of finders
  - Design an extensible system for button recognition

**Implementation:**
```javascript
// Example of new unified structure
export class ElementFinder {
  constructor(selectors) {
    this.selectors = selectors;
  }
  
  findElement(container, type) {
    // Generic implementation
  }
}

export class ButtonFinder extends ElementFinder {
  findAcceptButton(container) {
    // Specialized implementation
  }
  
  findRejectButton(container) {
    // Specialized implementation
  }
}
```

#### 2.2. Design Selector Configuration System
**Actions:**
- [ ] Design improved selectors.json structure
  - Create schema for all button types
  - Define priority system for selectors
  - Design pattern matching system

**Implementation:**
```json
{
  "buttonTypes": {
    "accept": {
      "selectors": [
        {
          "query": "#acceptBtn",
          "priority": 10
        },
        {
          "query": "button[id*='accept']",
          "priority": 8
        }
      ],
      "textPatterns": [
        {
          "pattern": "accept all",
          "priority": 10
        },
        {
          "pattern": "accept",
          "priority": 5
        }
      ]
    }
  }
}
```

### Phase 3: Implementation

#### 3.1. Create Core Element Finder Module
**Actions:**
- [ ] Implement the unified ElementFinder module
  - Create base ElementFinder class
  - Implement specialized finders (ButtonFinder, CheckboxFinder, etc.)
  - Add proper error handling and logging

**Implementation:**
```javascript
// src/utils/finders/elementFinder.js
export class ElementFinder {
  constructor(selectors) {
    this.selectors = selectors;
  }
  
  findBySelector(container, selectorList) {
    for (const selector of selectorList) {
      try {
        const elements = container.querySelectorAll(selector.query);
        if (elements.length > 0) return elements[0];
      } catch (e) {
        console.error(`Error with selector ${selector.query}`, e);
      }
    }
    return null;
  }
  
  findByTextContent(container, patterns, elementTypes = ['button', '[role="button"]']) {
    const elements = container.querySelectorAll(elementTypes.join(','));
    for (const element of elements) {
      const text = element.textContent.toLowerCase().trim();
      for (const pattern of patterns) {
        if (text.includes(pattern.pattern)) return element;
      }
    }
    return null;
  }
}
```

#### 3.2. Implement Button Finder Classes
**Actions:**
- [ ] Create specialized button finders
  - AcceptButtonFinder
  - RejectButtonFinder
  - SettingsButtonFinder
  - General ButtonFinder for discovery

**Implementation:**
```javascript
// src/utils/finders/buttonFinder.js
import { ElementFinder } from './elementFinder';

export class ButtonFinder extends ElementFinder {
  findAcceptButton(container) {
    const type = 'accept';
    
    // Try selectors first
    const element = this.findBySelector(container, this.selectors.buttonTypes[type].selectors);
    if (element) return element;
    
    // Then try text patterns
    return this.findByTextContent(container, this.selectors.buttonTypes[type].textPatterns);
  }
  
  findRejectButton(container) {
    const type = 'reject';
    // Similar implementation
  }
}
```

#### 3.3. Expand selectors.json
**Actions:**
- [ ] Expand selectors.json to include all button types
  - Add priorities to selectors
  - Categorize by button type and behavior
  - Add exclusion patterns to avoid false positives

**Implementation:**
```json
{
  "buttonTypes": {
    "accept": {
      "selectors": [
        {"query": "#onetrust-accept-btn-handler", "priority": 10},
        {"query": ".cc-accept-all", "priority": 9},
        {"query": "button[id*='accept']:not([id*='not'])", "priority": 8}
      ],
      "textPatterns": [
        {"pattern": "accept all cookies", "priority": 10},
        {"pattern": "accept all", "priority": 9},
        {"pattern": "accept cookies", "priority": 8},
        {"pattern": "accept", "priority": 5}
      ],
      "excludePatterns": [
        "settings",
        "preferences",
        "more info"
      ]
    },
    "reject": {
      "selectors": [
        {"query": "#onetrust-reject-all-handler", "priority": 10},
        {"query": ".reject-all", "priority": 9}
      ],
      "textPatterns": [
        {"pattern": "reject all", "priority": 10},
        {"pattern": "necessary only", "priority": 9},
        {"pattern": "reject", "priority": 5}
      ]
    }
  }
}
```

#### 3.4. Update All References
**Actions:**
- [ ] Replace all existing button finder usages:
  - Update imports
  - Replace direct function calls
  - Update tests to use new modules

**Implementation:**
```javascript
// Before
import { findAcceptButton } from '../utils/buttonFinders';
const button = findAcceptButton(container);

// After
import { ButtonFinder } from '../utils/finders/buttonFinder';
const buttonFinder = new ButtonFinder(selectors);
const button = buttonFinder.findAcceptButton(container);
```

### Phase 4: Testing and Validation

#### 4.1. Create Testing Infrastructure
**Actions:**
- [ ] Create comprehensive test suite:
  - Unit tests for each finder function
  - Integration tests for real-world scenarios
  - Test with sample dialogs from various sites

**Implementation:**
```javascript
// tests/unit/finders/buttonFinder.test.js
describe('ButtonFinder', () => {
  let buttonFinder;
  let container;
  
  beforeEach(() => {
    buttonFinder = new ButtonFinder(mockSelectors);
    container = document.createElement('div');
  });
  
  test('findAcceptButton should find button by ID', () => {
    container.innerHTML = '<button id="acceptBtn">Accept</button>';
    const button = buttonFinder.findAcceptButton(container);
    expect(button).not.toBeNull();
    expect(button.id).toBe('acceptBtn');
  });
  
  // More tests...
});
```

#### 4.2. Create Test Fixtures
**Actions:**
- [ ] Create fixtures for commonly encountered dialogs:
  - Cookie banners from popular sites
  - Various UI patterns and structures
  - Edge cases and tricky implementations

**Implementation:**
```javascript
// tests/fixtures/dialogs.js
export const cookieDialogs = [
  {
    name: 'OneTrust Style',
    html: `<div id="onetrust-banner-sdk">
      <div class="dialog-content">
        <button id="onetrust-accept-btn-handler">Accept All</button>
        <button id="onetrust-reject-all-handler">Reject All</button>
      </div>
    </div>`
  },
  // More fixtures...
];
```

#### 4.3. Regression Testing
**Actions:**
- [ ] Test on known problematic sites:
  - Sites previously requiring special handling
  - Sites with unique dialog implementations
  - Ensure no regressions in functionality

### Phase 5: Cleanup and Documentation

#### 5.1. Remove Old Code
**Actions:**
- [ ] Delete redundant functions and files:
  - Remove old button finder functions
  - Remove site-specific handling code
  - Clean up tests that used old implementations

**Implementation:**
```javascript
// Files to remove or refactor completely:
// - src/utils/buttonFinders.js
// - Any other files with duplicate functionality
```

#### 5.2. Update Documentation
**Actions:**
- [ ] Update documentation:
  - Update README.md with new architecture
  - Update CONTRIBUTING.md with new selector format
  - Add inline code documentation

**Implementation:**
```markdown
# Contributing Selectors

To add new selectors to the project:

1. Edit the `selectors.json` file
2. Add your selector to the appropriate button type section
3. Include a priority value (1-10) to indicate confidence
4. Test your selector on multiple sites before submitting
```

#### 5.3. Create Developer Guidelines
**Actions:**
- [ ] Create guidelines for future development:
  - How to add new button types
  - How to improve selector patterns
  - How to test changes

## Timeline and Priority

### High Priority (Week 1-2)
- Complete code audit
- Design unified architecture
- Implement core ElementFinder module

### Medium Priority (Week 3-4)
- Expand selectors.json
- Update references
- Create testing infrastructure

### Lower Priority (Week 5-6)
- Remove old code
- Update documentation
- Create developer guidelines

## Success Criteria

- No hardcoded selectors in JavaScript files
- No site-specific special cases
- All button finding uses unified system
- Comprehensive test coverage
- Complete documentation for contributors 