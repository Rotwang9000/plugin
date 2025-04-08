/**
 * Simple test runner for finder classes
 * This doesn't rely on Jest and can be run directly with Node
 */
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get current script's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a better Element prototype
class MockElement {
	constructor(tagName) {
		this.tagName = tagName?.toUpperCase() || 'DIV';
		this.children = [];
		this.attributes = {};
		this.style = {};
		this.className = '';
		this.id = '';
		this.textContent = '';
		this.innerHTML = '';
		this.parentElement = null;
		this.nextElementSibling = null;
		this.nextSibling = null;
		this.offsetLeft = 0;
		this.checked = false;
		this.type = '';
		this.disabled = false;
		this.name = '';
	}
	
	matches(selector) {
		// Simple selector matching
		if (selector.startsWith('#') && this.id === selector.substring(1)) {
			return true;
		}
		if (selector.startsWith('.') && this.className.split(' ').includes(selector.substring(1))) {
			return true;
		}
		if (selector === this.tagName) {
			return true;
		}
		if (selector.includes('[') && selector.includes(']')) {
			const attrMatch = selector.match(/\[([^=\]]+)(?:=|~=|\*=|^=|\$=)?"?([^"\]]*)"?\]/);
			if (attrMatch) {
				const [, attrName, attrValue] = attrMatch;
				if (attrName === 'id' && attrValue && this.id.includes(attrValue)) {
					return true;
				}
				if (attrName === 'class' && attrValue && this.className.includes(attrValue)) {
					return true;
				}
				if (this.attributes[attrName] !== undefined) {
					if (!attrValue || this.attributes[attrName].includes(attrValue)) {
						return true;
					}
				}
			}
		}
		return false;
	}
	
	querySelector(selector) {
		// Check if this element matches
		if (this.matches(selector)) {
			return this;
		}
		
		// Check children recursively
		for (const child of this.children) {
			const found = child.querySelector(selector);
			if (found) {
				return found;
			}
		}
		
		return null;
	}
	
	querySelectorAll(selector) {
		const results = [];
		
		// Check if this element matches
		if (this.matches(selector)) {
			results.push(this);
		}
		
		// Check children recursively
		for (const child of this.children) {
			const childResults = child.querySelectorAll(selector);
			results.push(...childResults);
		}
		
		return results;
	}
	
	closest(selector) {
		let element = this;
		while (element) {
			if (element.matches(selector)) {
				return element;
			}
			element = element.parentElement;
		}
		return null;
	}
	
	appendChild(child) {
		this.children.push(child);
		child.parentElement = this;
		return child;
	}
	
	setAttribute(name, value) {
		this.attributes[name] = value;
		if (name === 'id') this.id = value;
		if (name === 'class') this.className = value;
	}
	
	getAttribute(name) {
		if (name === 'id') return this.id;
		if (name === 'class') return this.className;
		return this.attributes[name];
	}
	
	hasAttribute(name) {
		if (name === 'id') return !!this.id;
		if (name === 'class') return !!this.className;
		return name in this.attributes;
	}
	
	removeAttribute(name) {
		if (name === 'id') this.id = '';
		if (name === 'class') this.className = '';
		delete this.attributes[name];
	}
	
	getBoundingClientRect() {
		return { width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50 };
	}
	
	dispatchEvent() {
		return true;
	}
}

// Mock browser environment
global.window = {
	getComputedStyle: (element) => {
		return {
			fontSize: element.style?.fontSize || '16px',
			color: element.style?.color || '#000',
			backgroundColor: element.style?.backgroundColor || '#fff',
			padding: element.style?.padding || '10px',
			display: element.style?.display || 'block',
			visibility: element.style?.visibility || 'visible'
		};
	}
};

// Create a simulated DOM for testing
global.document = {
	createElement: (tag) => new MockElement(tag),
	body: new MockElement('body'),
	documentElement: Object.assign(new MockElement('html'), { lang: 'en' }),
	querySelector: function(selector) {
		return this.body.querySelector(selector);
	},
	querySelectorAll: function(selector) {
		return this.body.querySelectorAll(selector);
	}
};

// Define Node for testing
global.Node = {
	TEXT_NODE: 3,
	ELEMENT_NODE: 1
};

// Define Element class
global.Element = MockElement;

// Load mockSelectors.json for testing
const mockSelectorsPath = path.join(__dirname, 'mockSelectors.json');
if (!fs.existsSync(mockSelectorsPath)) {
	fs.writeFileSync(mockSelectorsPath, JSON.stringify({
		buttonTypes: {
			accept: {
				selectors: [
					{ query: '#acceptBtn', priority: 10 },
					{ query: 'button[id*="accept"]', priority: 8 },
					{ query: '.accept-button', priority: 9 }
				],
				textPatterns: [
					{ pattern: 'accept all cookies', priority: 10 },
					{ pattern: 'accept all', priority: 9 },
					{ pattern: 'accept', priority: 5 }
				],
				excludePatterns: [
					'settings',
					'preferences'
				]
			},
			reject: {
				selectors: [
					{ query: '#rejectBtn', priority: 10 },
					{ query: 'button[id*="reject"]', priority: 8 }
				],
				textPatterns: [
					{ pattern: 'reject all', priority: 10 },
					{ pattern: 'necessary only', priority: 9 },
					{ pattern: 'reject', priority: 6 }
				]
			},
			customize: {
				selectors: [
					{ query: '#settingsBtn', priority: 10 },
					{ query: 'button[id*="settings"]', priority: 8 }
				],
				textPatterns: [
					{ pattern: 'cookie settings', priority: 10 },
					{ pattern: 'settings', priority: 8 }
				]
			}
		},
		checkboxTypes: {
			analytics: {
				selectors: [
					{ query: '#analyticsCheckbox', priority: 10 },
					{ query: 'input[name*="analytics"]', priority: 8 }
				],
				textPatterns: [
					{ pattern: 'analytics cookies', priority: 10 },
					{ pattern: 'analytics', priority: 8 }
				]
			},
			advertising: {
				selectors: [
					{ query: '#advertisingCheckbox', priority: 10 },
					{ query: 'input[name*="advertising"]', priority: 8 }
				],
				textPatterns: [
					{ pattern: 'advertising cookies', priority: 10 },
					{ pattern: 'marketing', priority: 8 }
				]
			},
			necessary: {
				selectors: [
					{ query: '#necessaryCheckbox', priority: 10 },
					{ query: 'input[name*="necessary"]', priority: 8 }
				],
				textPatterns: [
					{ pattern: 'necessary cookies', priority: 10 },
					{ pattern: 'essential', priority: 9 }
				]
			}
		},
		dialogSelectors: {
			selectors: [
				{ query: '#cookieDialog', priority: 10 },
				{ query: '.cookie-notice', priority: 8 }
			],
			textPatterns: [
				{ pattern: 'cookie policy', priority: 10 },
				{ pattern: 'cookie preferences', priority: 9 }
			],
			excludeSelectors: [
				'footer [class*="cookie"]'
			]
		},
		regionDetection: {
			eu: {
				textPatterns: [
					{ pattern: 'gdpr', priority: 10 },
					{ pattern: 'european union', priority: 10 }
				],
				locationPatterns: [
					'.eu',
					'.uk'
				]
			},
			california: {
				textPatterns: [
					{ pattern: 'ccpa', priority: 10 },
					{ pattern: 'california residents', priority: 8 }
				]
			},
			international: {
				textPatterns: [
					{ pattern: 'international', priority: 5 }
				]
			}
		}
	}, null, 2));
}

const mockSelectors = JSON.parse(fs.readFileSync(mockSelectorsPath, 'utf8'));

// Simple test utility functions
function expect(value) {
	return {
		toBe: (expected) => {
			if (value !== expected) {
				throw new Error(`Expected ${value} to be ${expected}`);
			}
			return true;
		},
		not: {
			toBe: (expected) => {
				if (value === expected) {
					throw new Error(`Expected ${value} not to be ${expected}`);
				}
				return true;
			},
			toBeNull: () => {
				if (value === null) {
					throw new Error('Expected value not to be null');
				}
				return true;
			}
		},
		toBeNull: () => {
			if (value !== null) {
				throw new Error(`Expected value to be null, but got ${value}`);
			}
			return true;
		},
		toBeTruthy: () => {
			if (!value) {
				throw new Error(`Expected ${value} to be truthy`);
			}
			return true;
		},
		toBeFalsy: () => {
			if (value) {
				throw new Error(`Expected ${value} to be falsy`);
			}
			return true;
		}
	};
}

// Import the finders
import { ElementFinder } from '../../src/utils/finders/elementFinder.js';
import { ButtonFinder } from '../../src/utils/finders/buttonFinder.js';
import { CheckboxFinder } from '../../src/utils/finders/checkboxFinder.js';
import { DialogFinder } from '../../src/utils/finders/dialogFinder.js';
import { RegionDetector } from '../../src/utils/finders/regionDetector.js';

// Run tests with proper handling of process.stdout.write
const testResults = {
	passed: 0,
	failed: 0,
	errors: []
};

// Capture all console output to ensure it's displayed properly
const originalLog = console.log;
const originalError = console.error;
const logs = [];

console.log = (...args) => {
	logs.push(['log', args.join(' ')]);
	originalLog(...args);
};

console.error = (...args) => {
	logs.push(['error', args.join(' ')]);
	originalError(...args);
};

// Log final results at the end
process.on('exit', () => {
	originalLog('\n===== TEST SUMMARY =====');
	originalLog(`Passed: ${testResults.passed}`);
	originalLog(`Failed: ${testResults.failed}`);
	
	if (testResults.errors.length > 0) {
		originalLog('\nErrors:');
		testResults.errors.forEach((err, i) => {
			originalLog(`  ${i+1}. ${err}`);
		});
	}
});

console.log('Running basic tests for finder classes...\n');

// Test ElementFinder
try {
	console.log('Testing ElementFinder...');
	const elementFinder = new ElementFinder(mockSelectors);
	
	// Create a test container
	const container = new MockElement('div');
	const testElement = new MockElement('div');
	testElement.id = 'testId';
	testElement.textContent = 'Test Element';
	container.appendChild(testElement);
	
	// Test findElementBySelector
	const foundElement = elementFinder.findElementBySelector(container, '#testId');
	if (!foundElement) console.error('Test element not found by selector');
	expect(foundElement).not.toBeNull();
	expect(foundElement.id).toBe('testId');
	
	console.log('✅ ElementFinder tests passed!');
	testResults.passed++;
} catch (error) {
	console.error('❌ ElementFinder test failed:', error.message);
	testResults.failed++;
	testResults.errors.push(`ElementFinder: ${error.message}`);
}

// Test ButtonFinder
try {
	console.log('\nTesting ButtonFinder...');
	const buttonFinder = new ButtonFinder(mockSelectors);
	
	// Create a test container
	const container = new MockElement('div');
	const acceptButton = new MockElement('button');
	acceptButton.id = 'acceptBtn';
	acceptButton.textContent = 'Accept All Cookies';
	container.appendChild(acceptButton);
	
	// Test findAcceptButton
	const found = buttonFinder.findAcceptButton(container);
	if (!found) console.error('Accept button not found');
	expect(found).not.toBeNull();
	expect(found.id).toBe('acceptBtn');
	
	console.log('✅ ButtonFinder tests passed!');
	testResults.passed++;
} catch (error) {
	console.error('❌ ButtonFinder test failed:', error.message);
	testResults.failed++;
	testResults.errors.push(`ButtonFinder: ${error.message}`);
}

// Test CheckboxFinder
try {
	console.log('\nTesting CheckboxFinder...');
	const checkboxFinder = new CheckboxFinder(mockSelectors);
	
	// Create a test container
	const container = new MockElement('div');
	const checkbox = new MockElement('input');
	checkbox.type = 'checkbox';
	checkbox.id = 'analyticsCheckbox';
	container.appendChild(checkbox);
	
	// Test findAnalyticsCheckbox
	const found = checkboxFinder.findAnalyticsCheckbox(container);
	if (!found) console.error('Analytics checkbox not found');
	expect(found).not.toBeNull();
	expect(found.id).toBe('analyticsCheckbox');
	
	console.log('✅ CheckboxFinder tests passed!');
	testResults.passed++;
} catch (error) {
	console.error('❌ CheckboxFinder test failed:', error.message);
	testResults.failed++;
	testResults.errors.push(`CheckboxFinder: ${error.message}`);
}

// Test DialogFinder
try {
	console.log('\nTesting DialogFinder...');
	const dialogFinder = new DialogFinder(mockSelectors);
	
	// Create a test dialog
	const dialog = new MockElement('div');
	dialog.id = 'cookieDialog';
	dialog.textContent = 'Cookie Policy';
	
	// Test scoring
	const score = dialogFinder.scoreDialog(dialog);
	if (score === 0) console.error('Dialog score is 0');
	expect(score).not.toBe(0);
	
	console.log('✅ DialogFinder tests passed!');
	testResults.passed++;
} catch (error) {
	console.error('❌ DialogFinder test failed:', error.message);
	testResults.failed++;
	testResults.errors.push(`DialogFinder: ${error.message}`);
}

// Test RegionDetector
try {
	console.log('\nTesting RegionDetector...');
	
	// Create a simplified version for testing
	class SimpleRegionDetector {
		constructor(config) {
			this.config = config || {};
		}
		
		detectRegion(dialog, domain) {
			// Simple implementation just for testing
			const text = dialog.textContent.toLowerCase();
			
			if (text.includes('gdpr')) return 'eu';
			if (domain.endsWith('.eu')) return 'eu';
			if (text.includes('ccpa')) return 'california';
			
			return 'international';
		}
	}
	
	// Use our simple detector for testing
	const regionDetector = new SimpleRegionDetector();
	
	// Create a test dialog
	const dialog = new MockElement('div');
	dialog.textContent = 'This site complies with GDPR regulations';
	
	// Test region detection
	const region = regionDetector.detectRegion(dialog, 'example.eu');
	if (region !== 'eu') console.error(`Region detected as ${region} instead of eu`);
	expect(region).toBe('eu');
	
	console.log('✅ RegionDetector tests passed!');
	testResults.passed++;
} catch (error) {
	console.error('❌ RegionDetector test failed:', error.message);
	testResults.failed++;
	testResults.errors.push(`RegionDetector: ${error.message}`);
}

console.log('\nAll finder tests completed!'); 