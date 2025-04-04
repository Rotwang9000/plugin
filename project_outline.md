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
   - Only required for cloud submissions and privacy features, not core functionality
   - Core features (Smart Mode, Auto-Accept) work without requiring consent
   - Cloud Mode and Privacy Mode are disabled by default and require explicit consent to enable
   - Asks for consent when a user attempts to enable features that require it
   - Provides clear toggle control in the settings
   - Respects GDPR requirements while maintaining user experience

2. **Data Sanitization**:
   - Redacts email addresses, phone numbers, and personal identifiers only when submitting ratings to the cloud
   - Preserves original data for local analysis while ensuring privacy for cloud submissions
   - Sanitizes URLs to remove query parameters before cloud transmission
   - Scrubs HTML attributes that might contain sensitive data in cloud submissions

3. **Safe Storage**:
   - Stores dialog capture data locally as essential functionality
   - Avoids capturing full page content
   - Focuses only on the cookie consent element
   - Limits storage to recent captures (maximum 100 dialogs)

4. **Transmission Security**:
   - Sanitizes data immediately before transmission to the cloud
   - Only applies redaction when submitting user ratings with "good" or "bad" feedback
   - Sends only anonymized structural information
   - Focuses on selector patterns rather than content

## Future Enhancements

### Phase 1 (Version 1.1)
- Improve pattern matching algorithms for better cross-site recognition
- Add automatic language detection for button text
- Expand the cloud database with more common patterns
- Add JavaScript-injection detection as a key factor in cookie box identification
- Implement local database of button types with matches in multiple languages
- Prioritize frequently matched terms by moving them to the front of search lists

### Phase 2 (Version 1.2)
- Add multilingual support for more regions
- Introduce preferences mode to select cookie types
- Implement machine learning for pattern recognition
- Strip out all tags except links, input, button and select for cloud data submission
- Pattern match buttons to categorize options into standardized categories
- Generate IDs for buttons without them to help with future identification

### Phase 3 (Version 2.0)
- Create server-side database for selector sharing
- Build analytics dashboard for success metrics
- Add user account system for trusted submissions
- Implement AI-based button categorization for unrecognized patterns
- Store matched patterns with button IDs for faster future recognition
- Use AI results to enhance pattern matching without requiring constant AI usage

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

## Smart Formula Architecture

The Smart Formula is designed to work across all websites without relying on special cases or hardcoded site-specific logic. Instead, it uses intelligent pattern recognition and heuristics to identify and interact with cookie consent dialogs. Key principles:

1. **Universal Pattern Recognition**: Detects cookie dialogs based on content, structure, and context rather than hardcoded rules for specific sites.

2. **Dynamic Button Detection**: Identifies accept/reject buttons through semantic analysis of text, attributes, and position.

3. **Self-Improving**: The system can be updated based on real-world performance through our new analyze feature.

### Analyze Source Feature

The extension now includes a new feature that allows users to paste the HTML source of a cookie consent box for analysis. This helps:

1. **Test Formula Effectiveness**: Quickly determine if the smart formula can correctly detect and handle a specific cookie consent dialog.

2. **Generate Recommendations**: Get suggestions for improving the smart formula if detection fails.

3. **Cloud Updates**: In the cloud version, these analyses can be used to automatically update the smart formula for all users.

## Implementation Guidelines

To maintain our "no special cases" approach, all contributors should:

1. Focus on improving the core pattern recognition algorithms rather than adding site-specific workarounds
2. Use the new analyze feature to test changes against problematic cookie boxes
3. Follow a data-driven approach to refining the smart formula

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

### Self-Contained Test Architecture
- **Function Encapsulation**: Tests define all necessary functions within the test file to avoid module dependencies
- **API Mocking**: Chrome API and DOM interactions are consistently mocked across test files
- **Isolated Environments**: Each test suite creates its own isolated test environment
- **Implementation-Agnostic**: Tests focus on behavior rather than specific implementation details

This approach ensures tests remain robust even as the codebase evolves, with minimal changes needed when refactoring occurs.

### Unit Testing
- **Content Script**: Tests for banner detection, button recognition, and element visibility
- **Background Script**: Tests for settings management, badge updates, and cloud submissions
- **Popup Interface**: Tests for UI interactions, settings persistence, and dialog management
- **Privacy Features**: Tests for proper sanitization and redaction

### Specialized Testing
- **Smart Detection Algorithm**: Comprehensive tests in `smart-cookie-detection.test.js` for cookie banner detection across various patterns
- **Cookie Action Handling**: Tests in `cookie-action.test.js` for proper user preference handling when accepting/rejecting cookies
- **Data Management**: Tests for proper data storage and retrieval in the database module

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
- Dynamically injected cookie banners

### Coverage Goals
- Smart detection algorithm: 95%+ coverage
- Action handling: 90%+ coverage
- Settings management: 85%+ coverage
- UI components: 80%+ coverage

### Testing Tools
- **Jest**: JavaScript testing framework
- **JSDOM**: DOM environment simulation
- **Chrome API Mocks**: Simulated browser extension APIs

All tests are located in the `tests/` directory with clear documentation in `docs/testing-strategy.md`.

## Recent Improvements

- Improved button detection logic to properly identify "Accept All" and "Reject All" buttons when "More about our cookies" links are present in dialogs, such as in ETH Zurich and OneTrust cookie consent implementations
- Added specific prioritization for "Reject All" buttons to ensure they are properly detected as Necessary-only buttons
- Added test case for ETH Zurich style cookie consent dialog to ensure continued proper detection
- Implemented comprehensive self-contained test files for smart cookie detection and cookie action handling:
  - Added `smart-cookie-detection.test.js` with 16 test cases for various banner patterns
  - Added `cookie-action.test.js` with 16 test cases for user preference-based actions
  - Created detailed documentation in `docs/testing-strategy.md` and `docs/test-summary.md`
- Developed a robust testing architecture that ensures tests remain valid even when refactoring the codebase 

## Recent UI Improvements

### History Screen
- Simplified history display showing just sites and timestamps
- Added visual indicators for current page and auto-accepted dialogs
- Removed filtering options to focus on simplicity
- Improved performance by reducing rendering complexity

### Details Review Page
- Removed the HTML preview which was often broken without CSS
- Replaced with a list of detected elements (buttons, options)
- Added dropdown selections for each element to properly classify:
  - Button types: Accept All, Essential Only, Necessary Only, Customise, Decline, Other, Bad Match
  - Option types: Essential, Analytics, Marketing, Preferences, Privacy, Other, Bad Match
- When user modifies classifications, "Good Match" button disappears and "Bad Match" becomes "Submit Changes"
- User feedback is collected and sent to the server for admin approval
- Approved submissions go into Cloud Matching as special cases
- Periodic analysis of special cases to improve the detection formula

This new approach provides more accurate data collection and better insights into cookie consent UI patterns, while making the review process more efficient for users.

## Testing Framework

### Test Suite Structure
- Unit tests for individual modules
- Integration tests for module interactions
- UI tests for popup interface
- Detection tests for various banner types

### Test Fixes Implemented
- Updated mock DOM elements for new UI
- Resolved circular dependencies between modules
- Improved utility functions for test environments
- Added robust error handling in mock environments
- Fixed element visibility detection in test contexts
- Enhanced button click simulation for Jest tests
- Added special handling for multilingual button detection
- Improved GDPR and CCPA banner detection
- Fixed standalone button detection outside dialogs

### Test Coverage
- 258 passing tests
- Coverage across all major modules
- Edge case handling
- Multilingual support verification

## Implementation Timeline
1. Core detection algorithm - COMPLETED
2. Basic UI and settings - COMPLETED
3. Database and history - COMPLETED
4. Enhanced history screen - COMPLETED
5. Details page with categorization - COMPLETED
6. Test suite updates and fixes - COMPLETED
7. Final polish and documentation - COMPLETED

## Current Focus
- Ensuring comprehensive test coverage
- Fixing any edge cases in detection
- Streamlining the user experience

## Future Enhancements
- AI-assisted categorization
- Extended support for more languages
- Dashboard for viewing consent statistics
- Advanced filtering in history view 