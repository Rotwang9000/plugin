/**
 * Test template for converting older test files to ES modules
 * 
 * Instructions:
 * 1. Copy this template when updating test files
 * 2. Update imports to use your actual modules
 * 3. Use async/await for dynamic module imports if needed
 */
import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';

// Import modules you're testing - replace with your actual imports
// import { yourFunction } from '../src/modules/your-module.js';

// Setup before tests - this runs before each test
beforeEach(() => {
	// Setup test environment
	document.body.innerHTML = '<div id="test-container"></div>';
	
	// Reset mocks
	jest.resetAllMocks();
	
	// Chrome API mocks are already set up in jest.setup.js
	chrome.storage.local.get.mockImplementation((keys, callback) => {
		callback({ settings: { enabled: true } });
	});
});

// Clean up after tests - this runs after each test
afterEach(() => {
	// Clean up test environment
	document.body.innerHTML = '';
	
	// Restore any mocks
	jest.restoreAllMocks();
});

// Example test suite
describe('Example Test Suite', () => {
	test('Example test case', () => {
		// Your test here
		expect(true).toBe(true);
	});
	
	test('Example async test', async () => {
		// For dynamic imports
		// const module = await import('../src/modules/your-module.js');
		// expect(module.yourFunction()).toBe(expectedResult);
	});
});

/**
 * How to mock ES modules:
 * 
 * 1. Manual mocking:
 * 
 * jest.mock('../src/modules/your-module.js', () => ({
 *   yourFunction: jest.fn().mockReturnValue('mocked result'),
 *   anotherFunction: jest.fn()
 * }));
 * 
 * 2. Dynamic mocking (when you need to control the mock during tests):
 * 
 * // At the top of your file:
 * jest.mock('../src/modules/your-module.js');
 * 
 * // Then in your test:
 * import * as yourModule from '../src/modules/your-module.js';
 * 
 * test('Your test', () => {
 *   yourModule.yourFunction.mockReturnValue('mocked value');
 *   expect(yourModule.yourFunction()).toBe('mocked value');
 * });
 */ 