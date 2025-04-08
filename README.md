# Cookie Consent Manager

This Chrome extension helps you manage cookie consent dialogs across the web.

## Features

- **Automatic Detection**: Identifies cookie consent dialogs on websites
- **Smart Handling**: Can automatically accept or reject cookies based on your preferences
- **Privacy Mode**: Option to automatically reject non-essential cookies
- **Custom Rules**: Set per-site preferences for cookie handling
- **History Tracking**: Keep track of sites where cookies were managed
- **Detailed View**: Review detected cookie dialog elements and their details
- **Externalized Selectors**: Selectors and button texts stored in JSON configuration for easy updates and localization
- **Popup Protection**: Prevents closing the same popup multiple times in a session
- **Performance Optimized**: Detection stops 10 seconds after page load to improve performance

## History Screen Enhancements

The history screen now provides a simplified view of all sites where cookie dialogs were detected:

- List view of all sites with timestamps
- Visual indicators for:
  - Current page status
  - Auto-accepted items
  - Detected cookie elements
- Quick access to detailed information per site

## Details Page Improvements

The details page for each site now includes:

- Detected buttons with dropdown options for categorization
- Category options:
  - Accept
  - Reject
  - Settings
  - Not a button
- "Good Match" status changes to "Bad Match" when categorization is changed
- Submissions sent for admin approval

## Development

### Selectors Management

The extension uses a centralized `selectors.json` file to manage element selection across the codebase. This file contains structured data for finding cookie consent elements:

- **dialogSelectors**: CSS selectors for finding cookie consent dialogs with priority levels
- **dialogPatterns**: Content and attribute patterns for identifying dialogs
- **buttonTypes**: Categories of buttons (accept, reject, customize) with:
  - Selectors: CSS queries with priority
  - Text patterns: Common button text with priority
- **checkboxTypes**: Definitions for checkbox identification
- **regionDetection**: Rules for detecting geographical regions

The selectors system uses priority-based matching, trying highest priority selectors first before falling back to more generic patterns. This allows for precise targeting of specific implementations while maintaining broad compatibility.

To modify selectors:
1. Edit the `selectors.json` file
2. Run the test suite to ensure everything works with your changes
3. The changes will be picked up automatically when the extension runs

Example selector structure:
```json
{
  "buttonTypes": {
    "accept": {
      "selectors": [
        { "query": "#acceptBtn", "priority": 10, "description": "Common accept button ID" }
      ],
      "textPatterns": [
        { "pattern": "accept all", "priority": 9, "description": "Accept all text" }
      ]
    }
  }
}
```

### Testing

The project includes a comprehensive test suite with 258 tests covering:

- **Unit Tests**: Individual functions and modules
- **Integration Tests**: Interactions between different parts of the system
- **UI Tests**: Popup interface functionality
- **Detection Tests**: Cookie dialog identification and button classification

To run tests:

```bash
npm run test
```

Key test utilities:

- Tests use a mock DOM environment via Jest
- Simulated browser environment for extension testing
- Mock storage for settings and history
- Language and region detection tests

### Banner Testing

The project includes special tools for testing cookie banner detection:

#### Banner Tester

A utility that tests our button detection logic against a directory of banner HTML examples:

```bash
# Run the banner tester on all examples
npx jest tests/banner-tester.test.js --verbose

# Test a specific banner example
npx jest tests/banner-tester.test.js --verbose -- --test-file=google-type.html
```

This generates a detailed report showing:
- Element counts (buttons, links, etc.)
- Detected accept/reject buttons
- Any potential issues

#### Banner Extractor

A tool for analyzing complex banners and extracting key interactive elements:

```bash
# Extract and analyze a specific banner
node tests/banner-extract.js google-type.html

# Save the analysis to a file
node tests/banner-extract.js google-type.html --output google-analysis.md
```

This helps with debugging by:
- Scoring elements by relevance to cookie consent
- Extracting only the most relevant elements
- Providing a simplified view of complex structures

#### Simplified Diagnostics

For large, complex banners (over 50KB), the tester automatically:
- Creates simplified diagnostic HTML files
- Focuses only on interactive elements
- Provides visual representation of detection results
- Makes debugging large structures manageable

### Test Fixes

The test suite has been updated to be compatible with the new UI changes:

- Updated HTML structure in test setup
- Fixed utility functions to work properly in test environments
- Implemented robust error handling for edge cases
- Addressed circular dependencies between modules
- Added more robust element visibility checking for tests
- Fixed mock event handlers for simulated clicks

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests to ensure nothing breaks
5. Submit a pull request

## License

This project is licensed under the MIT License.

## How It Works

The Cookie Consent Manager extension works in two complementary modes:

### Smart Mode

The Smart Mode uses advanced heuristics to detect and interact with cookie consent dialogs:

1. Detects cookie consent dialogs through content analysis, structure evaluation, and context assessment
2. Finds the appropriate accept/necessary button based on semantic analysis
3. Safely interacts with the button to approve cookies based on your preferences

Our Smart Formula avoids special cases or site-specific hardcoding, relying instead on intelligent pattern recognition that works across any website.

### Cloud Mode

The Cloud Mode leverages a database of common cookie dialog patterns:

1. Uses common selectors and patterns to identify cookie consent elements
2. Prioritizes selectors based on rating and compliance requirements
3. Falls back to signature pattern matching for similar but not identical elements

The smart formula is continuously improved and automatically updates as patterns evolve.

### Dialog Capture & Rating

The extension captures cookie consent dialogs before they're dismissed:

1. Stores a copy of the HTML structure of detected dialogs
2. Sanitizes personal data to protect privacy 
3. Users can review these dialogs in the extension popup
4. Rate the match quality (good or bad) to help improve the database
5. Submissions are sent to the cloud database to enhance future detection

### Privacy Protection

The extension includes several privacy safeguards:

1. Essential functionality works without requiring consent
2. Redacts email addresses, phone numbers, and other personal data only when submitting to the cloud
3. Removes query parameters from URLs which might contain personal information
4. Sanitizes form fields and input values
5. Removes potentially sensitive attributes from HTML before storage
6. Asks for consent only when users want to contribute ratings to the cloud database

## Data Storage and Persistence

Cookie Consent Manager uses multiple storage strategies to ensure your settings and history persist:

1. **Chrome Storage API**: Primary storage that synchronizes across devices (for settings) and persists locally (for history)
2. **localStorage Backup**: Dual-storage approach for plugin resilience
   - Settings and history are automatically backed up every 10 minutes
   - Data is automatically restored from localStorage if Chrome Storage is unavailable
   - Ensures persistence across plugin reloads and updates

This redundant storage approach ensures your settings and cookie consent history remain intact even when:
- The plugin is reloaded from source during development
- The plugin is updated to a new version
- Chrome needs to restart

Your data is stored only on your devices and is not sent to any external servers unless you explicitly enable cloud features and provide consent.

## Future Plans

- Develop a unified privacy warnings bar that consolidates cookie consent messages into a single-line status bar at the top or bottom of the page, showing the first few words of the message alongside action buttons
- Create a server-side AI analysis capability to better understand and categorise privacy warnings
- Implement a premium version offering more fine-grained control over cookie choices:
  - Automatically select "only essential cookies" options when available
  - Analyse checkboxes to intelligently select/deselect based on privacy preferences
  - Define standardised categories for different types of permissions
- Develop a standardised format for website developers to implement privacy warnings:
  - HTML/JSON style format that aligns with our categorisation system
  - Provide a script for developers to include on their sites
  - Seamless integration: shows native warning if user doesn't have our plugin, handled by our plugin if installed
- Allow users to submit new cookie banner patterns to improve the cloud database
- Add option to automatically decline or customize cookie settings
- Support for more languages and regional cookie warning formats
- Machine learning-based detection for more accurate identification

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

## Usage

After installation, the extension will automatically run on websites. You can configure its behaviour by clicking the extension icon in your browser toolbar.

### Default Settings

By default, the extension works with the following settings:
- **Enabled**: ON - The extension is active
- **Auto-Accept**: ON - Automatically clicks accept buttons
- **Smart Mode**: ON - Uses smart detection (no consent required)
- **Cloud Mode**: OFF - Requires consent to enable
- **Privacy Mode**: OFF - Requires consent to enable
- **GDPR Compliance**: ON - Ensures compliance with regulations

Features requiring consent will prompt you for permission when you attempt to enable them.

### Rating Cookie Dialogs

1. Visit websites with cookie consent dialogs
2. The extension will automatically detect and handle them
3. A badge on the extension icon shows how many dialogs were captured
4. Click the extension icon and go to the "Captured Dialogs" tab
5. Review and rate the dialogs to help improve the system

### Privacy Settings

1. Click the extension icon to open the popup
2. On the "Settings" tab, use the "Privacy Protection" toggle
3. When enabled, all personal information is redacted before submitting dialogs to the cloud
4. This setting is on by default and recommended for all users

## Code Structure

The codebase has been refactored into a modular architecture to improve maintainability and separation of concerns:

- **src/modules/**: Core functionality modules including settings and cloud database 
- **src/utils/**: Utility functions for finding buttons, interacting with elements, and privacy sanitization
- **src/handlers/**: Event handlers and business logic for dialog capture and smart detection
- **src/index.js**: Main entry point that orchestrates all functionality

See [src/README.md](src/README.md) for more details on the code architecture.

### Build System

The project uses webpack to bundle the modular code:

```bash
# Install dependencies
npm install

# Development mode with hot reloading
npm run dev

# Production build
npm run build
```

The bundled files are output to the `dist/` directory and referenced by the extension's manifest.

## Server Component

The Cookie Consent Manager now includes a server component that handles:

1. Receiving and storing cookie consent dialog reviews
2. Admin panel for reviewing and approving submissions
3. Building a database of cookie consent patterns

### Running the Server

To run the server component:

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Start the server
npm start
```

The server will run on port 3000 by default. The admin panel is available at [http://localhost:3000/admin](http://localhost:3000/admin).

### API Endpoints

The server provides the following API endpoints:

- `POST /api/reviews` - Submit a new review
- `GET /api/reviews` - Get reviews (with optional filtering)
- `PATCH /api/reviews/:id` - Update a review's status
- `GET /api/patterns` - Get patterns (with optional filtering)
- `POST /api/patterns/:id/use` - Update pattern usage count

See the [server README](server/README.md) for detailed API documentation.

## Known Issues and Refactoring Needs

### Code Duplication and Large Files

- **Duplicate functions**: There are duplicate functions in the codebase that should be consolidated, such as `formatHtmlWithLineNumbers` appearing twice in popup.js (lines 1986 and 2111).

- **Large files**: Some files exceed the recommended 2500-line limit:
  - popup.js (2844 lines) - Should be refactored into smaller modules
  - content.js (1804 lines) - Approaching the limit

### Refactoring Recommendations

1. **Module separation**: Split large files into logical modules (UI handling, dialog management, settings, etc.)
2. **Remove duplicated code**: Consolidate duplicate functions
3. **Move utility functions**: Create a utilities module for functions like `formatHtmlWithLineNumbers` and `escapeHtml`
4. **Apply consistent code style**: Ensure tabs are used throughout (not spaces)
5. **Improve error handling**: Add more robust error handling and logging 

## Refactoring Progress

The project is currently undergoing a major refactoring to improve maintainability and code organization.

### Implemented Modules

#### Core Utilities
- ✅ `modules/dom-utils.js` - DOM manipulation helpers
- ✅ `modules/html-utils.js` - HTML formatting functions
- ✅ `modules/storage.js` - Storage operations

#### UI Modules
- ✅ `ui/dialog-display.js` - Dialog rendering functions 
- ✅ `ui/history-ui.js` - History display
- ✅ `ui/settings-ui.js` - Settings interface
- ✅ `ui/stats-ui.js` - Statistics and counters

#### Detection Modules
- ✅ `detection/smart-detection.js` - Smart mode cookie banner detection
- ✅ `detection/cloud-detection.js` - Cloud pattern matching
- ✅ `detection/button-recognition.js` - Button identification

#### API Modules
- ✅ `api/messaging.js` - Cross-script messaging
- ✅ `api/cloud-api.js` - Cloud service interactions

### Entry Points Refactored
- ✅ popup.js - Completely refactored to use the module system
- ✅ content.js - Refactored to use the modular code structure
- ✅ background.js - Refactored to use the modular approach

### Next Steps

1. ✅ Update main entry points to use modular approach

2. Write tests for the new modules:
   - ✅ Basic tests for popup.js refactoring
   - ✅ Basic tests for content.js refactoring
   - ✅ Basic tests for background.js refactoring
   - ⬜ Comprehensive tests for individual modules
   - ⬜ Integration tests for module interactions

3. Verify all functionality works as expected

## Manifest V3 Compatibility

This extension is built with Manifest V3 compatibility, using ES modules for proper compatibility with modern browsers.

## Development

### Prerequisites

- Node.js 16+
- npm

### Installation

```bash
npm install
```

### Build

To build the extension:

```bash
npm run build
```

Or use the custom build script:

```bash
node build.js
```

### Development Mode

To run in development mode with automatic rebuilding:

```bash
npm run dev
```

## Loading in Browser

1. Go to `chrome://extensions/` in Chrome or `edge://extensions/` in Edge
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the extension directory

## Architecture

The extension uses the following key components:

- **Background Script**: Handles extension lifecycle and manages settings
- **Content Script**: Detects and interacts with cookie consent dialogs
- **Popup UI**: User interface for configuration and dialog management

## ES Module Support

This extension uses ES modules for compatibility with Manifest V3. Key points:

- Background script is loaded as a module (type="module" in manifest.json)
- All imports/exports use ES module syntax (import/export)
- Webpack is configured to output ES module compatible bundles
- HTML files use `type="module"` for script tags

## Permissions

The extension requires the following permissions:

- `storage`: To store settings and dialog history
- `activeTab`: To access the current tab's content
- `scripting`: To dynamically inject content scripts when needed
- `alarms`: For scheduling cleanup tasks
- `host_permissions`: For accessing page content on all websites

## Troubleshooting

If you encounter the "Receiving end does not exist" error:

1. The extension uses dynamic script injection as a fallback
2. This is implemented in the background.js with the `injectContentScript` handler
3. The popup.js tries to inject the content script if initial communication fails

## License

MIT 

## Recent Improvements

### Popup Protection and Performance

- **Session-based Dialog Tracking**: The extension now tracks which dialogs have been processed in the current session to prevent closing the same popup twice.
- **Twitter/X Timeline Protection**: Special handling for X/Grok history windows to prevent them from being incorrectly detected as cookie dialogs.
- **Performance Optimization**: Cookie dialog detection now stops 10 seconds after the page has fully loaded, reducing background processing and improving page performance.

### Configuration Improvements

- **Externalized Selectors**: All selectors and button text patterns are now stored in an external JSON file (`selectors.json`), making it easier to:
  - Update selectors without changing the code
  - Add support for new languages and region-specific patterns
  - Maintain a cleaner codebase with less hardcoded values
  - Allow for community contributions to improve detection

### Improved Detection Logic

- **Unified Button Recognition**: Consolidated multiple button detection functions into a unified system that uses external configuration.
- **Async/Sync Detection**: New Promise-based selectors loading with async button detection, plus backward compatibility through sync fallbacks.
- **Unique Dialog Identification**: Each dialog now has a unique identifier based on its properties, ensuring we can reliably track which ones have been processed.
- **Content-based Button Matching**: Buttons are now matched using configurable text patterns from the JSON file, improving accuracy across different languages.
- **Special Dialog Handling**: Added support for special dialog types that should be detected but not automatically closed.

## External Selectors Configuration

The extension uses a JSON configuration file (`selectors.json`) for all selectors and text patterns. This file includes:

```json
{
  "cookieDialogSelectors": [
    "Common selectors for cookie dialogs"
  ],
  "dialogTypes": {
    "xGrokHistory": {
      "selectors": ["Selectors for special dialogs like X/Grok"]
    }
  },
  "buttonTypes": {
    "accept": {
      "selectors": ["Selectors for accept buttons"],
      "textPatterns": ["Text patterns for accept buttons"]
    },
    "reject": {
      "selectors": ["Selectors for reject buttons"],
      "textPatterns": ["Text patterns for reject buttons"]
    },
    "necessary": {
      "selectors": ["Selectors for necessary-only buttons"],
      "textPatterns": ["Text patterns for necessary-only buttons"]
    },
    "customize": {
      "selectors": ["Selectors for customize buttons"],
      "textPatterns": ["Text patterns for customize buttons"]
    }
  }
}
```

This configuration can be updated without changing code, enabling easy maintenance and localization.

## Recent Updates

### Cookie Detection Improvements (April 2023)
- Fixed an issue where the cookie detection would continue to run even when the extension was disabled
- Added a 10-second timeout for detection after page load to improve performance
- Implemented domain-based popup tracking to prevent closing multiple popups on the same domain in a single session
- Fixed issues with incorrectly detecting non-cookie dialogs (such as X/Twitter history windows)
- Added better test coverage for cookie detection functionality 