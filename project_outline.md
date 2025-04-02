# Cookie Consent Manager - Project Outline

## Architecture

The extension is built with the following components:

1. **Manifest File** (`manifest.json`): Defines the extension's metadata, permissions, and components.

2. **Content Script** (`content.js`): Runs on every page and contains the logic for:
   - Smart Mode detection of cookie banners
   - Cloud Mode selector matching
   - Finding and clicking accept buttons
   - Capturing dialog HTML before dismissal
   - Responding to rating submissions
   - Sanitizing private information

3. **Background Script** (`background.js`): Manages extension-wide state and handles:
   - Initialization of default settings
   - Communication between components
   - Tracking captured dialogs across tabs
   - Managing cloud database submissions
   - Updating the extension badge with counts
   - Tracking domain visit history

4. **Popup Interface** (`popup.html`, `popup.js`): Provides a user interface for:
   - Toggling the extension on/off
   - Selecting which modes to enable
   - Managing privacy protection settings
   - Reviewing captured dialogs
   - Rating and submitting dialogs to the cloud
   - Status reporting

## Core Functionality

### Smart Mode

The Smart mode employs several techniques to identify cookie banners:

1. **Visit-based targeting**:
   - Prioritizes first visits to domains (when banners typically appear)
   - Focuses on GET requests rather than POST requests
   - Tracks visits to avoid redundant detection attempts

2. **Timing-based detection**:
   - Looks for elements appearing within the first few seconds of page load
   - Uses MutationObserver to track newly added elements

3. **Content-based recognition**:
   - Identifies elements containing "cookie" or "privacy" text
   - Scans both visible text and HTML content (for translated pages)

4. **Visual pattern detection**:
   - Targets elements with high z-index values (typical for overlays)
   - Looks for fixed or absolute positioned elements
   - Identifies elements near viewport edges (common for banners)
   - Requires multiple interactive elements (typically 2+ buttons)

5. **Button recognition**:
   - Finds interactive elements with acceptance text
   - Clicks the most likely "accept" button

### Cloud Mode

The Cloud mode leverages a hierarchical database of cookie banner patterns:

1. **Site-specific selectors**:
   - Domain-specific selectors for precise targeting
   - Handles unique implementations on individual sites

2. **Common selectors**:
   - Generic selectors that work across many sites
   - Rated by success rate for prioritization

3. **Pattern recognition**:
   - Identifies similar HTML structures across different sites
   - Matches class patterns and structural signatures
   - Especially effective for common frameworks (e.g., Google's consent implementation)

### Dialog Capture System

The system preserves cookie dialogs for review and improvement:

1. **HTML Capture**:
   - Clones dialog DOM before clicking accept button
   - Sanitizes captured HTML for storage efficiency and privacy protection
   - Tracks origin and detection method

2. **User Review Interface**:
   - Lists all captured dialogs with site information
   - Provides visual preview of captured content
   - Enables rating for quality assessment

3. **Submission Pipeline**:
   - Sends rated dialogs to cloud database
   - Tracks submission status
   - Removes submitted items from local storage

### Privacy Protection System

The extension includes robust privacy safeguards:

1. **User Consent**:
   - Asks for explicit permission on first run
   - Provides clear toggle control in the settings
   - Default enabled state with easy opt-out

2. **Data Sanitization**:
   - Redacts email addresses, phone numbers, and personal identifiers
   - Removes form field values and input contents
   - Sanitizes URLs to remove query parameters
   - Scrubs HTML attributes that might contain sensitive data

3. **Safe Storage**:
   - Stores only minimal necessary information
   - Avoids capturing full page content
   - Focuses only on the cookie consent element

4. **Transmission Security**:
   - Sanitizes data before transmission
   - Sends only anonymized structural information
   - Focuses on selector patterns rather than content

## Future Enhancements

### Phase 1 (Version 1.1)
- Improve pattern matching algorithms for better cross-site recognition
- Add automatic language detection for button text
- Expand the cloud database with more common patterns

### Phase 2 (Version 1.2)
- Add multilingual support for more regions
- Introduce preferences mode to select cookie types
- Implement machine learning for pattern recognition

### Phase 3 (Version 2.0)
- Create server-side database for selector sharing
- Build analytics dashboard for success metrics
- Add user account system for trusted submissions

### Phase 4 (Version 2.5)
- Develop unified privacy warnings bar to consolidate cookie messages
- Implement server-side AI analysis for privacy message categorisation
- Create standardised format for developers to implement privacy warnings

### Phase 5 (Premium Version)
- Fine-grained control over cookie choices:
	- Automatically select "only essential cookies" options
	- Intelligent checkbox analysis for optimal privacy preferences
	- Standardised categories for different types of permissions
- Developer integration tools:
	- HTML/JSON specification for standardised privacy warnings
	- Compatibility script for websites without our plugin
	- Seamless handling across plugin/non-plugin scenarios

## Technical Considerations

### Performance
- Minimize DOM manipulation impact
- Use efficient selectors to reduce CPU usage
- Implement timing delays to prevent race conditions
- Optimize HTML storage to reduce memory usage
- Early bailout for non-candidate pages (POST requests, return visits)

### Privacy
- No tracking of user browsing history
- Local storage of preferences only
- Optional cloud submission of selectors
- HTML sanitization to remove personal data
- Redaction of sensitive information
- URL sanitization to remove query parameters

### Security
- Sandbox iframe for dialog previews
- Validate all user inputs and submissions
- Secure communication with cloud services
- Permission-based data collection

## Testing Strategy

The extension employs a comprehensive testing approach using Jest:

### Unit Testing
- **Content Script**: Tests for banner detection, button recognition, and element visibility
- **Background Script**: Tests for settings management, badge updates, and cloud submissions
- **Popup Interface**: Tests for UI interactions, settings persistence, and dialog management
- **Privacy Features**: Tests for proper sanitization and redaction

### Integration Testing
- Tests for communication between content and background scripts
- Verifies end-to-end dialog capture and submission workflow
- Simulates browser interactions through mocked Chrome API
- Tests privacy protection across components

### Edge Case Testing
- Non-English cookie banners and language handling
- Unusual cookie dialog structures and patterns
- Dynamic content injection and iframe handling
- POST requests and return visit behavior

### Configuration Testing
- Validates manifest.json structure and permissions
- Ensures proper content script configuration
- Verifies extension action and icon setup

### Testing Tools
- **Jest**: JavaScript testing framework
- **JSDOM**: DOM environment simulation
- **Chrome API Mocks**: Simulated browser extension APIs

All tests are located in the `tests/` directory with clear organization by component and functionality. 