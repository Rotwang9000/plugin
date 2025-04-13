/**
 * Tests for the refactored modules
 */

import { jest, describe, beforeEach, test, expect } from '@jest/globals';

// Import the modules directly
import { createElement, clearElement, toggleClass, queryAndProcess } from '../src/modules/dom-utils.js';
import { formatHtmlWithLineNumbers, escapeHtml, safeGetHtmlContent } from '../src/modules/html-utils.js';
import { ButtonFinder, getSyncFinders } from '../src/utils/finders/index.js';
import { isCookieConsentDialog, analyzeDialogSource } from '../src/detection/smart-detection.js';
// Import storage conditionally in the test
import * as storageModule from '../src/modules/storage.js';

// DOM Utilities Tests
describe('DOM Utilities', () => {
	beforeEach(() => {
		// Set up a test DOM environment
		document.body.innerHTML = '<div id="test-container"></div>';
	});
	
	test('createElement should create and return an element', () => {
		const container = document.getElementById('test-container');
		const element = createElement('p', { className: 'test-class' }, 'Test content', container);
		
		expect(element.tagName).toBe('P');
		expect(element.className).toBe('test-class');
		expect(element.textContent).toBe('Test content');
		expect(container.children.length).toBe(1);
	});
	
	test('clearElement should remove all children', () => {
		const container = document.getElementById('test-container');
		createElement('p', null, 'Child 1', container);
		createElement('p', null, 'Child 2', container);
		
		expect(container.children.length).toBe(2);
		
		clearElement(container);
		
		expect(container.children.length).toBe(0);
	});
	
	test('toggleClass should add or remove classes based on condition', () => {
		const element = document.createElement('div');
		
		toggleClass(element, 'active', true);
		expect(element.classList.contains('active')).toBe(true);
		
		toggleClass(element, 'active', false);
		expect(element.classList.contains('active')).toBe(false);
	});
});

// HTML Utilities Tests
describe('HTML Utilities', () => {
	test('formatHtmlWithLineNumbers should add line numbers', () => {
		const html = 'Line 1\nLine 2\nLine 3';
		const result = formatHtmlWithLineNumbers(html);
		
		expect(result).toContain('<td class="line-numbers">1</td>');
		expect(result).toContain('<td class="line-numbers">2</td>');
		expect(result).toContain('<td class="line-numbers">3</td>');
		expect(result).toContain('<td>Line 1</td>');
	});
	
	test('escapeHtml should escape special characters', () => {
		const unsafe = '<script>alert("XSS")</script> & "quote" test';
		const result = escapeHtml(unsafe);
		
		expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &amp; &quot;quote&quot; test');
	});
	
	test('safeGetHtmlContent should handle null elements', () => {
		expect(safeGetHtmlContent(null)).toBe('');
		
		const element = document.createElement('div');
		element.innerHTML = '<p>Test</p>';
		expect(safeGetHtmlContent(element)).toBe('<p>test</p>');
	});
});

// Storage Tests (Mock Chrome API)
describe('Storage Module', () => {
	// Mock Chrome API already set up in jest.setup.js
	
	beforeEach(() => {
		// Reset mocks
		chrome.storage.local.get.mockReset();
		chrome.storage.local.set.mockReset();
		chrome.runtime.sendMessage.mockReset();
	});
	
	test('getSettings should return settings with defaults', () => {
		chrome.storage.local.get.mockImplementation((keys, callback) => {
			callback({ settings: { enabled: true } });
		});
		
		const callback = jest.fn();
		storageModule.getSettings(callback);
		
		expect(chrome.storage.local.get).toHaveBeenCalledWith(['settings'], expect.any(Function));
		expect(callback).toHaveBeenCalled();
		expect(callback.mock.calls[0][0].enabled).toBe(true);
	});
	
	test('saveSettings should store settings and notify background', () => {
		chrome.storage.local.set.mockImplementation((data, callback) => {
			callback();
		});
		
		const settings = { enabled: false, smartMode: true };
		const callback = jest.fn();
		
		storageModule.saveSettings(settings, callback);
		
		expect(chrome.storage.local.set).toHaveBeenCalledWith({ settings }, expect.any(Function));
		expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
			action: 'settingsUpdated', 
			settings
		});
		expect(callback).toHaveBeenCalled();
	});
	
	test('getDialogHistory should return empty array if none exists', () => {
		chrome.storage.local.get.mockImplementation((keys, callback) => {
			callback({});
		});
		
		const callback = jest.fn();
		storageModule.getDialogHistory(callback);
		
		expect(chrome.storage.local.get).toHaveBeenCalledWith(['dialogHistory'], expect.any(Function));
		expect(callback).toHaveBeenCalledWith([]);
	});
});

// Button Recognition Tests
describe('Button Recognition', () => {
	let buttonFinder;
	
	beforeEach(() => {
		document.body.innerHTML = `
			<div id="dialog">
				<button id="acceptBtn">Accept All Cookies</button>
				<a href="#" role="button" id="rejectBtn">Reject</a>
				<a href="#" class="settings">Customize</a>
			</div>
		`;
		
		// Get sync finders to use in tests
		const finders = getSyncFinders();
		buttonFinder = finders.buttonFinder;
	});
	
	test('findAcceptButton should find accept buttons', () => {
		const dialog = document.getElementById('dialog');
		const button = buttonFinder.findAcceptButton(dialog);
		
		expect(button).not.toBeNull();
		expect(button.id).toBe('acceptBtn');
	});
	
	test('findRejectButton should find reject buttons', () => {
		const dialog = document.getElementById('dialog');
		const button = buttonFinder.findRejectButton(dialog);
		
		expect(button).not.toBeNull();
		expect(button.id).toBe('rejectBtn');
	});
	
	test('functions should return null for null input', () => {
		expect(buttonFinder.findAcceptButton(null)).toBeNull();
		expect(buttonFinder.findRejectButton(null)).toBeNull();
	});
});

// Smart Detection Tests
describe('Smart Detection', () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<div id="cookie-banner">
				This site uses cookies. By continuing to use this site, you agree to our use of cookies. 
				<button>Accept</button>
				<a href="/privacy">Privacy Policy</a>
			</div>
			<div id="newsletter">
				Sign up for our newsletter!
				<button>Subscribe</button>
			</div>
		`;
	});
	
	test('isCookieConsentDialog should identify cookie banners', () => {
		const cookieBanner = document.getElementById('cookie-banner');
		const newsletter = document.getElementById('newsletter');
		
		expect(isCookieConsentDialog(cookieBanner)).toBe(true);
		expect(isCookieConsentDialog(newsletter)).toBe(false);
		expect(isCookieConsentDialog(null)).toBe(false);
	});
	
	test('analyzeDialogSource should score HTML content', () => {
		const html = 'This site uses cookies for analytics. Click "Accept" to agree to our cookie policy or "Reject" to refuse non-essential cookies.';
		const result = analyzeDialogSource(html);
		
		expect(result.score).toBeGreaterThan(0);
		expect(result.confidence).toMatch(/high|medium|low/);
		expect(result.details.length).toBeGreaterThan(0);
	});
});

// UI Modules Tests
describe('UI Modules', () => {
	// Skip this test for now since it requires mocking modules which is difficult with ESM
	test.skip('Dialog Display should render elements', () => {
		// This test is skipped due to challenges with mocking ES modules
		// We'll create a separate test file for testing UI components
	});
}); 