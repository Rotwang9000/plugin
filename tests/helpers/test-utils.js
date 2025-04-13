/**
 * Test utility functions and mocks for Jest tests
 * This file provides common functions used across test files
 */
import { jest } from '@jest/globals';

/**
 * Create a mock DOM element with the specified properties
 * @param {string} tagName - The tag name of the element
 * @param {Object} attributes - Attributes to add to the element
 * @param {string} textContent - Text content for the element
 * @returns {Element} The created element
 */
export function createMockElement(tagName = 'DIV', attributes = {}, textContent = '') {
	const element = document.createElement(tagName);
	
	// Add attributes
	for (const [key, value] of Object.entries(attributes)) {
		if (key === 'id') {
			element.id = value;
		} else if (key === 'class' || key === 'className') {
			element.className = value;
		} else {
			element.setAttribute(key, value);
		}
	}
	
	// Add text content
	if (textContent) {
		element.textContent = textContent;
	}
	
	return element;
}

/**
 * Set up a test DOM with the provided HTML
 * @param {string} html - HTML to set up
 * @returns {Element} The container element
 */
export function setupDOM(html) {
	// Clear existing body content
	document.body.innerHTML = '';
	
	// Create a container
	const container = document.createElement('div');
	container.id = 'test-container';
	container.innerHTML = html;
	
	// Add to document
	document.body.appendChild(container);
	
	return container;
}

/**
 * Check if an element is visible
 * @param {Element} element - The element to check
 * @returns {boolean} True if the element is visible
 */
export function isElementVisible(element) {
	if (!element) return false;
	
	const style = window.getComputedStyle(element);
	return style.display !== 'none' && 
		style.visibility !== 'hidden' && 
		style.opacity !== '0';
}

/**
 * Mock chrome.storage API for testing
 * @param {Object} initialSettings - Initial settings to use
 * @returns {Object} Mocked chrome.storage object
 */
export function mockChromeStorage(initialSettings = {}) {
	const storage = {
		local: {
			data: { ...initialSettings },
			get: jest.fn((keys, callback) => {
				if (typeof keys === 'string') {
					// Single key
					callback({ [keys]: storage.local.data[keys] });
				} else if (Array.isArray(keys)) {
					// Array of keys
					const result = {};
					keys.forEach(key => {
						result[key] = storage.local.data[key];
					});
					callback(result);
				} else if (typeof keys === 'object') {
					// Object with default values
					const result = {};
					Object.keys(keys).forEach(key => {
						result[key] = storage.local.data[key] !== undefined ? 
							storage.local.data[key] : keys[key];
					});
					callback(result);
				} else {
					// No keys, return all data
					callback({ ...storage.local.data });
				}
			}),
			set: jest.fn((items, callback) => {
				Object.assign(storage.local.data, items);
				if (callback) callback();
			})
		},
		sync: {
			data: { ...initialSettings },
			get: jest.fn((keys, callback) => {
				if (typeof keys === 'string') {
					callback({ [keys]: storage.sync.data[keys] });
				} else if (Array.isArray(keys)) {
					const result = {};
					keys.forEach(key => {
						result[key] = storage.sync.data[key];
					});
					callback(result);
				} else if (typeof keys === 'object') {
					const result = {};
					Object.keys(keys).forEach(key => {
						result[key] = storage.sync.data[key] !== undefined ? 
							storage.sync.data[key] : keys[key];
					});
					callback(result);
				} else {
					callback({ ...storage.sync.data });
				}
			}),
			set: jest.fn((items, callback) => {
				Object.assign(storage.sync.data, items);
				if (callback) callback();
			})
		}
	};
	
	return storage;
}

/**
 * Create a mocked version of the chrome API
 * @param {Object} initialSettings - Initial settings for chrome.storage
 * @returns {Object} Mocked chrome API
 */
export function mockChromeAPI(initialSettings = {}) {
	const storage = mockChromeStorage(initialSettings);
	
	return {
		storage,
		runtime: {
			sendMessage: jest.fn(),
			onMessage: {
				addListener: jest.fn()
			},
			getURL: jest.fn(path => `chrome-extension://fake-extension-id/${path}`)
		},
		tabs: {
			query: jest.fn(),
			sendMessage: jest.fn(),
			update: jest.fn(),
			create: jest.fn()
		},
		extension: {
			getURL: jest.fn(path => `chrome-extension://fake-extension-id/${path}`)
		},
		i18n: {
			getMessage: jest.fn(key => key)
		}
	};
} 