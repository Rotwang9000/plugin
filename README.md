# Cookie Consent Manager

A Chrome extension that automatically accepts cookie consent warnings on websites.

## Features

- **Smart Mode**: Intelligently detects cookie banners based on their appearance and content, then automatically clicks accept buttons.
- **Cloud Mode**: Uses a database of known cookie consent selectors to quickly identify and handle common cookie warnings.
- **Customisable**: Choose which modes to enable or disable the extension completely.
- **Dialog Capture**: Stores cookie dialogs before they're dismissed so users can review and rate them.
- **Community Contributions**: Submit successful cookie banner matches to improve the cloud database for all users.
- **Privacy Protection**: Automatically redacts personal information before storing or submitting cookie dialogs.
- **First-Visit Detection**: Primarily operates on your first visit to a site, when cookie banners typically appear.

## How It Works

### Smart Mode

The Smart Mode uses the following strategy to detect and handle cookie banners:

1. Focuses on first visits to websites and GET requests (not POST requests)
2. Looks for elements appearing in the first few seconds of page load
3. Identifies popups by searching for text containing "cookie" or "privacy" (even in HTML for translated pages)
4. Prioritizes elements with high z-index values (typically overlays)
5. Looks for elements with at least 2 buttons (typical for consent dialogs)
6. Finds buttons with text like "Accept", "Agree", "OK", etc.
7. Automatically clicks the appropriate button to accept cookies

### Cloud Mode

The Cloud Mode uses a multi-tiered approach for maximum effectiveness:

1. First checks site-specific selectors for the current domain
2. Then tries common selectors that work across many websites
3. Finally, looks for similar HTML patterns to known consent dialogs
4. Uses shared patterns to handle identical dialogs across different sites (e.g., Google's common consent dialog)

### Dialog Capture & Rating

The extension captures cookie consent dialogs before they're dismissed:

1. Stores a copy of the HTML structure of detected dialogs
2. Sanitizes personal data to protect privacy 
3. Users can review these dialogs in the extension popup
4. Rate the match quality (good or bad) to help improve the database
5. Submissions are sent to the cloud database to enhance future detection

### Privacy Protection

The extension includes several privacy safeguards:

1. Asks for permission before collecting banner data
2. Redacts email addresses, phone numbers, and other personal data
3. Removes query parameters from URLs which might contain personal information
4. Sanitizes form fields and input values
5. Removes potentially sensitive attributes from HTML before storage

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

### Rating Cookie Dialogs

1. Visit websites with cookie consent dialogs
2. The extension will automatically detect and handle them
3. A badge on the extension icon shows how many dialogs were captured
4. Click the extension icon and go to the "Captured Dialogs" tab
5. Review and rate the dialogs to help improve the system

### Privacy Settings

1. Click the extension icon to open the popup
2. On the "Settings" tab, use the "Privacy Protection" toggle
3. When enabled, all personal information is redacted from captured dialogs
4. This setting is on by default and recommended for all users

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue to suggest improvements or report bugs. 

## Testing

The extension includes a comprehensive test suite using Jest. We have tests for:

- **Unit Tests**: Testing individual functions and components
- **Integration Tests**: Verifying how different parts of the extension work together
- **Edge Cases**: Ensuring the extension handles unusual scenarios correctly
- **Manifest Validation**: Checking the extension's configuration is valid

To run the tests:

```
npm test
```

When contributing, please ensure all tests pass before submitting a pull request. Add new tests for any new functionality.

Test files are organized under the `tests/` directory:
- `content.test.js`: Tests for content script functionality
- `background.test.js`: Tests for background script
- `popup.test.js`: Tests for the popup interface
- `integration.test.js`: Cross-component tests
- `edge-cases.test.js`: Tests for unusual cookie banner scenarios
- `manifest.test.js`: Validation of the extension configuration 