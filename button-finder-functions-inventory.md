# Button Finder Functions Inventory

## `src/utils/buttonFinders.js`

### `findNecessaryCookiesButton(container)`
**Purpose:** Finds a button that selects only necessary/essential cookies
**Inputs:** DOM container element
**Outputs:** Button element or null
**Implementation Details:**
- Uses hardcoded array of terms (`necessaryTerms`) to identify necessary/essential buttons
- Special case for OneTrust patterns
- Multiple search techniques in priority order:
  1. ID-based detection
  2. "Reject cookies" text detection 
  3. Necessary-related text detection
  4. Class/ID checking for terms like "reject", "necessary"
  5. Checkbox detection and manipulation

### `findLabelForInput(input)`
**Purpose:** Helper function to find a label associated with an input element
**Inputs:** DOM input element
**Outputs:** Label element or null
**Implementation Details:**
- Checks for explicit label via `for` attribute
- Checks for parent label element
- Simple utility function

### `findAcceptButton(container)`
**Purpose:** Finds the accept/agree button in a cookie consent dialog
**Inputs:** DOM container element  
**Outputs:** Button element or null
**Implementation Details:**
- Uses hardcoded array of terms (`acceptTexts`) to identify accept buttons
- Special case for OneTrust patterns
- Multiple search techniques in priority order:
  1. ID-based detection
  2. "Accept cookies" text detection
  3. Button ID matching
  4. Form inputs inspection
  5. Generic text content matching
  6. Attribute checking (aria-label, data-action)
  7. Class-based detection
  8. Style-based detection (for Twitter-like components)

## `src/detection/button-recognition.js`

### `loadSelectorsConfig()`
**Purpose:** Loads selectors from JSON file or falls back to defaults
**Inputs:** None
**Outputs:** Promise resolving to config object
**Implementation Details:**
- Fetches `selectors.json`
- Contains hardcoded fallback selectors if loading fails
- Essentially a utility function to get the configuration

### `findButtonByType(dialogElement, buttonType)` 
**Purpose:** Generic function to find a button by type
**Inputs:** Dialog element, button type string (accept, reject, etc.)
**Outputs:** Promise resolving to button element or null
**Implementation Details:**
- Gets config for the specified button type
- Tries selector-based matching first
- Falls back to text-based matching
- Uses generic selectors as well as configured ones
- Implements a more configurable approach

### `findAcceptButton(dialogElement)`
**Purpose:** Finds accept button (Promise-based version)
**Inputs:** Dialog element
**Outputs:** Promise resolving to button element or null
**Implementation Details:**
- Wrapper around `findButtonByType` for accept buttons
- Simple delegation

### `findAcceptButtonSync(dialogElement)`
**Purpose:** Synchronous version of accept button finding
**Inputs:** Dialog element
**Outputs:** Button element or null
**Implementation Details:**
- Uses cached config if available
- Replicates async logic but synchronously
- Added for backward compatibility

### Other similar functions:
- `findRejectButton(dialogElement)`
- `findRejectButtonSync(dialogElement)`
- `findSettingsButton(dialogElement)`
- `findSettingsButtonSync(dialogElement)`
- `getButtonConfig(buttonType)` 

## `src/detection/cloud-detection.js`

### `findButtonInDialog(dialogElement, buttonType)`
**Purpose:** Find specific button type in a dialog
**Inputs:** Dialog element, button type string
**Outputs:** Button element or null
**Implementation Details:**
- Has hardcoded buttonSelectors object
- Tries each selector
- Falls back to text content matching
- Similar to other finder functions but with slightly different patterns

## Other Button-Related Functions

### In `content.js`
- `clickCustomizeButton(dialogElement)`
- Various code to detect and manipulate buttons

### In `popup_fixed.js` and `popup.js`
- `displayDialogButtons(dialog)` 
- `displayDetectedElements(dialog)`
- Functions to analyse and display detected buttons

## Hardcoded Selector Patterns

| File | Pattern Type | Example |
|------|--------------|---------|
| `buttonFinders.js` | Text Terms | `const necessaryTerms = ['necessary', 'essential', 'required', 'basic', ...]` |
| `buttonFinders.js` | Text Terms | `const acceptTexts = ['accept', 'agree', 'ok', 'yes', ...]` |
| `button-recognition.js` | Selectors | Fallback selectors in `loadSelectorsConfig()` |
| `cloud-detection.js` | Selectors | `const buttonSelectors = {accept: [...], reject: [...]}` |
| `content.js` | Cloud DB | `const cloudDatabase = {common: [{selector: '.cookie-accept-all', ...}]}` |

## Overlapping Functionality

1. **Accept Button Finding**:
   - `findAcceptButton` in buttonFinders.js
   - `findAcceptButton` in button-recognition.js
   - `findButtonInDialog` with 'accept' in cloud-detection.js

2. **Reject/Necessary Button Finding**:
   - `findNecessaryCookiesButton` in buttonFinders.js
   - `findRejectButton` in button-recognition.js
   - `findButtonInDialog` with 'reject' in cloud-detection.js

3. **Settings/Customize Button Finding**:
   - `findSettingsButton` in button-recognition.js
   - `findButtonInDialog` with 'settings' in cloud-detection.js
   - `clickCustomizeButton` in content.js

4. **Button Text Matching Logic**:
   - Similar text pattern matching in all finder functions
   - Different terms/priorities but same general approach

5. **Selector Priority Systems**:
   - All implement some form of trying selectors in order
   - Minor variations in algorithm and priorities 