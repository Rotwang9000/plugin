# Cookie Consent Manager

This Chrome extension helps you manage cookie consent dialogs across the web.

## Features

- **Automatic Detection**: Identifies cookie consent dialogs on websites
- **Smart Handling**: Can automatically accept or reject cookies based on your preferences
- **Privacy Mode**: Option to automatically reject non-essential cookies
- **Custom Rules**: Set per-site preferences for cookie handling
- **History Tracking**: Keep track of sites where cookies were managed
- **Detailed View**: Review detected cookie dialog elements and their details

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