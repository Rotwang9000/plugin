# Testing Documentation for Cookie Consent Manager

This document outlines the testing approach for the Cookie Consent Manager Chrome extension, including tools, techniques, and best practices.

## Overview

The Cookie Consent Manager extension uses a comprehensive testing approach with multiple levels:

1. **Unit Tests**: Testing individual functions and classes in isolation
2. **Component Tests**: Testing specific components with their direct dependencies
3. **Integration Tests**: Testing interactions between multiple components
4. **End-to-End Tests**: Testing complete user flows

## Testing Tools

- **Jest**: Primary test framework
- **JSDOM**: Browser environment simulation
- **Mock Service Worker**: For API mocking
- **Custom Utilities**: Helpers for DOM interaction and testing

## Running Tests

### Standard Test Command

```bash
npm run test
```

This command runs the standard Jest test suite with default configuration.

### ESM-Compatible Test Runner

For better compatibility with ECMAScript Modules, use our dedicated test runner script:

```bash
node run-unit-tests.js
```

This script provides:

- Automatic Jest configuration for ESM support
- Browser API mocking (chrome.*, window.fetch, etc.)
- Mock implementations of core finder classes
- Consistent test environment

### Targeted Test Runs

To run specific test files:

```bash
node run-unit-tests.js -- --testPathPattern=buttonFinder
```

## The run-unit-tests.js Script

This script facilitates testing of modules that use ESM syntax while maintaining compatibility with CommonJS tests. It addresses several key challenges:

### 1. Configuration Generation

The script dynamically creates:
- A Jest configuration file (`temp-jest.config.mjs`)
- A setup file for environment configuration (`jest-setup.mjs`)
- Mock implementations of core dependencies

### 2. Mock Implementation

For each core module, the script creates mock implementations that:
- Use the same API as the original module
- Provide test-specific behavior
- Include proper Jest spies/mocks

Example mock:

```javascript
// Mock ElementFinder class
export class ElementFinder {
  constructor(selectors) { this.selectors = selectors; }
  
  // Core methods with Jest spy implementation
  findElementBySelector = jest.fn((container, selector) => {
    // Mock implementation
    return container.querySelector(selector);
  });
  
  // Additional mocked methods...
}
```

### 3. Browser API Simulation

The script sets up mocks for browser APIs:

```javascript
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => callback && callback({})),
      set: jest.fn((data, callback) => callback && callback())
    },
    // Additional chrome API mocks
  },
  // Other browser APIs
};
```

## Mock Implementations

The test environment includes mock implementations for:

### ElementFinder

The base finder class with core element discovery functionality:
- `findElementBySelector`: Find elements via CSS selectors
- `findElementsByTextPatterns`: Find elements by text content
- `isExcluded`: Check if elements should be excluded

### ButtonFinder

Specialized for finding cookie consent buttons:
- `findAcceptButton`: Find the accept/consent button
- `findRejectButton`: Find the reject/necessary-only button
- `findCustomizeButton`: Find the customize/settings button
- `determineButtonType`: Detect the type of a button

### DialogFinder

For locating cookie consent dialogs:
- `findDialog`: Find the main dialog container
- `scoreDialog`: Score potential dialogs by relevance
- `findAllPotentialDialogs`: Find all possible dialog elements

### RegionDetector

For identifying regional consent requirements:
- `detectRegion`: Determine geographic region
- `detectRegionVariation`: Identify consent variation types
- `compareButtonStyles`: Detect dark patterns in button styling

## Writing Tests

### Best Practices

1. **Isolate Tests**: Each test should be independent of others
2. **Mock Dependencies**: Use mocks for external dependencies
3. **Focus on Behavior**: Test what components do, not how they work
4. **Clear Expectations**: Each test should have clear assertions
5. **Setup/Teardown**: Use before/after hooks for clean state

### Example Unit Test

```javascript
describe('ButtonFinder', () => {
  let buttonFinder;
  let container;
  
  beforeEach(() => {
    // Setup with mock selectors
    buttonFinder = new ButtonFinder(mockSelectors);
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  
  afterEach(() => {
    document.body.removeChild(container);
  });
  
  test('findAcceptButton should find button by ID', () => {
    container.innerHTML = '<button id="acceptBtn">Accept</button>';
    const button = buttonFinder.findAcceptButton(container);
    expect(button).not.toBeNull();
    expect(button.id).toBe('acceptBtn');
  });
  
  // Additional tests...
});
```

## Debugging Tests

### Logging

To debug test failures, add console.log statements:

```javascript
test('findDialog should find dialog by text content', () => {
  bodyEl.innerHTML = '<div id="dialog">Cookie Policy</div>';
  const dialog = dialogFinder.findDialog(documentObj);
  console.log('Found dialog:', dialog ? dialog.outerHTML : 'null');
  expect(dialog).not.toBeNull();
});
```

### Run Single Tests

To run a single test for debugging:

```bash
node run-unit-tests.js -- --testPathPattern=buttonFinder --testNamePattern="find by ID"
```

## Continuous Integration

Tests are automatically run on:
- Pull request creation
- Direct commits to main/develop branches
- Scheduled nightly builds

The test workflow:
1. Sets up the Node.js environment
2. Installs dependencies
3. Runs the test suite
4. Reports coverage and results

## Test Coverage

Current test coverage targets:
- **Statements**: 85%
- **Branches**: 80%
- **Functions**: 90%
- **Lines**: 85%

To generate a coverage report:

```bash
node run-unit-tests.js -- --coverage
```

## Troubleshooting

### Common Issues

1. **Module Not Found Errors**: 
   - Check import paths are correct
   - Ensure mock implementations exist for all dependencies

2. **DOM-related Errors**:
   - Make sure JSDOM is properly set up
   - Clean up DOM elements after tests

3. **Async Test Failures**:
   - Use proper async/await or done() callbacks
   - Check for unhandled promises

## Conclusion

Thorough testing is crucial for maintaining the quality and reliability of the Cookie Consent Manager extension. By following these guidelines and leveraging the provided tools, we can ensure the extension works correctly across different websites and scenarios. 