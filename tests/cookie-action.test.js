/**
 * @jest-environment jsdom
 */

import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';

// Mock utility functions 
const isElementVisible = jest.fn().mockImplementation(element => {
	return element !== null;
});

const getElementSelector = jest.fn().mockImplementation(element => {
	if (!element) return '';
	if (element.id) return `#${element.id}`;
	return element.tagName?.toLowerCase() || '';
});

const createClickEvent = jest.fn().mockImplementation(() => {
	return new MouseEvent('click', {
		bubbles: true,
		cancelable: true
	});
});

// Mock Chrome API
global.chrome = {
	storage: {
		sync: {
			get: jest.fn((keys, callback) => {
				callback({
					enabled: true,
					autoAccept: true,
					privacyMode: false
				});
			}),
			set: jest.fn()
		},
		local: {
			get: jest.fn((key, callback) => callback({})),
			set: jest.fn((data, callback) => {
				if (callback) callback();
			})
		}
	},
	runtime: {
		sendMessage: jest.fn(),
		onMessage: {
			addListener: jest.fn()
		}
	}
};

// Helper function to setup DOM
function setupDOM(html) {
	document.body.innerHTML = html;
}

// Simplified action functions for testing
function simulateClick(element) {
	if (!element) return;
	element.dispatchEvent(createClickEvent());
}

function acceptCookies(button, callback) {
	if (!button) {
		if (callback) callback();
		return;
	}
	
	simulateClick(button);
	
	// Call callback immediately for testing
	if (callback) callback();
}

function rejectCookies(button, callback) {
	if (!button) {
		if (callback) callback();
		return;
	}
	
	simulateClick(button);
	
	// Call callback immediately for testing
	if (callback) callback();
}

// Create test suite
describe('Cookie Consent Actions', () => {
	beforeEach(() => {
		// Clear the DOM
		document.body.innerHTML = '';
		
		// Reset mocks
		jest.clearAllMocks();
		
		// Set up window location
		Object.defineProperty(window, 'location', {
			value: { hostname: 'example.com' },
			writable: true
		});
	});
	
	test('simulateClick dispatches click event on element', () => {
		// Create button
		setupDOM('<button id="test-button">Test</button>');
		const button = document.getElementById('test-button');
		
		// Spy on dispatchEvent
		button.dispatchEvent = jest.fn();
		
		// Call the function
		simulateClick(button);
		
		// Check expectations
		expect(button.dispatchEvent).toHaveBeenCalled();
	});
	
	test('simulateClick handles null element gracefully', () => {
		// Should not throw
		expect(() => simulateClick(null)).not.toThrow();
	});
	
	test('acceptCookies calls callback after clicking button', done => {
		// Create test DOM
		setupDOM('<button id="accept-button">Accept</button>');
		const button = document.getElementById('accept-button');
		
		// Spy on click
		button.dispatchEvent = jest.fn();
		
		// Call function with callback
		acceptCookies(button, () => {
			// Check expectations
			expect(button.dispatchEvent).toHaveBeenCalled();
			done();
		});
	});
	
	test('acceptCookies handles null button gracefully', done => {
		// Call with null button and callback
		acceptCookies(null, () => {
			done();
		});
	});
	
	test('rejectCookies calls callback after clicking button', done => {
		// Create test DOM
		setupDOM('<button id="reject-button">Reject</button>');
		const button = document.getElementById('reject-button');
		
		// Spy on click
		button.dispatchEvent = jest.fn();
		
		// Call function with callback
		rejectCookies(button, () => {
			// Check expectations
			expect(button.dispatchEvent).toHaveBeenCalled();
			done();
		});
	});
	
	test('rejectCookies handles null button gracefully', done => {
		// Call with null button and callback
		rejectCookies(null, () => {
			done();
		});
	});
}); 