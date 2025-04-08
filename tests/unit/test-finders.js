/**
 * Simple script to run just the finder unit tests
 * Bypasses issues with the main test suite
 */
import pkg from '@jest/globals';
const { jest } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';

// Get current script's directory to help with relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up browser environment globals needed for tests
if (typeof window === 'undefined') {
	globalThis.window = {
		getComputedStyle: () => ({
			fontSize: '16px',
			color: '#000',
			backgroundColor: '#fff',
			padding: '10px',
			display: 'block',
			visibility: 'visible'
		})
	};
}

if (typeof document === 'undefined') {
	globalThis.document = {
		createElement: (tag) => {
			const element = {
				tagName: tag.toUpperCase(),
				children: [],
				attributes: {},
				style: {},
				className: '',
				id: '',
				textContent: '',
				innerHTML: '',
				matches: () => false,
				querySelector: () => null,
				querySelectorAll: () => [],
				appendChild: (child) => { element.children.push(child); return child; },
				setAttribute: (name, value) => { element.attributes[name] = value; },
				getAttribute: (name) => element.attributes[name],
				parentElement: null,
				getBoundingClientRect: () => ({ width: 100, height: 50 })
			};
			return element;
		},
		body: null,
		documentElement: { lang: 'en' },
		querySelector: () => null,
		querySelectorAll: () => []
	};
	
	document.body = document.createElement('body');
}

// Create a simple Node class for testing
if (typeof Node === 'undefined') {
	globalThis.Node = {
		TEXT_NODE: 3
	};
}

// Create Element class if needed
if (typeof Element === 'undefined') {
	globalThis.Element = class Element {};
}

// Mock console to catch errors
const originalConsole = console;
globalThis.console = {
	...originalConsole,
	error: jest.fn().mockImplementation((...args) => {
		// Still log the error but in a way that indicates it's from a test
		originalConsole.error('[TEST ERROR]', ...args);
	})
};

// Run the tests
import './finders/elementFinder.test.js';
import './finders/buttonFinder.test.js';
import './finders/checkboxFinder.test.js';
import './finders/dialogFinder.test.js';
import './finders/regionDetector.test.js';

console.log('All finder tests completed'); 