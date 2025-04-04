# Cookie Consent Manager Testing Strategy

This document outlines the testing approach used for the Cookie Consent Manager extension, including test types, methodologies, and best practices.

## Testing Approach

We employ a comprehensive testing approach that focuses on:

1. **Unit Testing**: Testing individual functions and modules in isolation
2. **Integration Testing**: Testing interactions between multiple components
3. **End-to-End Testing**: Testing complete workflows from start to finish
4. **Edge Case Testing**: Testing unusual or extreme scenarios

## Test Structure

The test suite is organised into multiple files, each focusing on specific aspects of the extension:

### Core Functionality Tests

- **Smart Cookie Detection Tests**: Tests the ability to detect various cookie consent dialogs, banners, and buttons across different website styles and layouts.
- **Cookie Action Tests**: Tests the functionality of accepting or rejecting cookies based on user preferences.
- **Settings Tests**: Tests the storage and application of user settings.
- **Database Tests**: Tests the storage and retrieval of website data and statistics.

### Edge Cases and Special Scenarios

- **Edge Cases Tests**: Tests unusual website structures, dynamic content, and other exceptional cases.
- **Multilingual Support Tests**: Tests detection capabilities across various languages.
- **No Special Cases Tests**: Verifies that no site-specific handling exists and all detection is generic.

### UI and Integration Tests

- **Popup UI Tests**: Tests the user interface elements in the extension popup.
- **Integration Tests**: Tests the full workflow from detection to action.

## Testing Methodology

### Self-Contained Tests

To overcome module dependencies and structure limitations, we've implemented self-contained tests that:

1. Mock necessary functions and APIs
2. Create isolated test environments
3. Define all required functionality within the test file
4. Use Jest's testing utilities for assertions and mocking

This approach allows for tests to run independently of actual implementation details and module structure, making the tests more robust and less susceptible to changes in the codebase.

### Mock DOM Testing

Since the extension interacts with web page content, we extensively use JSDOM to simulate browser environments:

1. Creating test DOM structures with various cookie consent patterns
2. Simulating user interactions
3. Testing component visibility and detection
4. Mocking browser APIs (Chrome Extension APIs)

## Running Tests

To run all tests:

```bash
npm test
```

To run specific test files:

```bash
npm test -- filename.test.js
```

To run tests matching a specific pattern:

```bash
npm test -- -t "test pattern"
```

## Test Maintenance

When adding new features or modifying existing ones, follow these guidelines:

1. Always add or update tests to cover the new functionality
2. Ensure existing tests still pass after making changes
3. Consider edge cases and add specific tests for them
4. For new modules, create self-contained test files following the established pattern
5. Use descriptive test names that clearly indicate what's being tested

## Test Coverage

We aim for high test coverage, especially for core functionality:

- Smart detection algorithm: 95%+ coverage
- Action handling: 90%+ coverage
- Settings management: 85%+ coverage
- UI components: 80%+ coverage

Regular reviews of test coverage help identify areas needing additional tests.

## Continuous Improvement

The testing strategy evolves along with the project. Regular reviews of testing methodologies and practices ensure that our approach remains effective as the extension grows and changes. 