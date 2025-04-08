/**
 * Unit tests for the DialogFinder class
 * Tests the ability to find cookie consent dialogs on a page
 */
import { DialogFinder } from '../../../src/utils/finders/dialogFinder.js';

// Mock selectors for testing
const mockSelectors = {
	dialogSelectors: {
		selectors: [
			{ query: '#cookieDialog', priority: 10 },
			{ query: '.cookie-notice', priority: 8 },
			{ query: '[aria-label*="cookie"]', priority: 7 }
		],
		textPatterns: [
			{ pattern: 'cookie policy', priority: 10 },
			{ pattern: 'cookie preferences', priority: 9 },
			{ pattern: 'privacy', priority: 5 }
		],
		excludeSelectors: [
			'footer [class*="cookie"]',
			'[role="navigation"] [class*="cookie"]'
		]
	}
};

describe('DialogFinder', () => {
	let dialogFinder;
	let document;
	
	beforeEach(() => {
		// Create a mock document
		document = {
			body: document.createElement('div'),
			querySelectorAll: function(selector) {
				return this.body.querySelectorAll(selector);
			},
			querySelector: function(selector) {
				return this.body.querySelector(selector);
			}
		};
		
		dialogFinder = new DialogFinder(mockSelectors);
	});
	
	test('findDialog should find dialog by ID', () => {
		document.body.innerHTML = '<div id="cookieDialog">Cookie Settings</div>';
		const dialog = dialogFinder.findDialog(document);
		expect(dialog).not.toBeNull();
		expect(dialog.id).toBe('cookieDialog');
	});
	
	test('findDialog should find dialog by class', () => {
		document.body.innerHTML = '<div class="cookie-notice">Cookie Notice</div>';
		const dialog = dialogFinder.findDialog(document);
		expect(dialog).not.toBeNull();
		expect(dialog.className).toBe('cookie-notice');
	});
	
	test('findDialog should find dialog by aria-label', () => {
		document.body.innerHTML = '<div aria-label="cookie consent">Cookie Consent</div>';
		const dialog = dialogFinder.findDialog(document);
		expect(dialog).not.toBeNull();
		expect(dialog.getAttribute('aria-label')).toBe('cookie consent');
	});
	
	test('findDialog should find dialog by text content', () => {
		document.body.innerHTML = `
			<div>
				<div>Some random content</div>
				<div id="dialog">Cookie Policy: Please accept our cookies</div>
			</div>
		`;
		const dialog = dialogFinder.findDialog(document);
		expect(dialog).not.toBeNull();
		expect(dialog.id).toBe('dialog');
	});
	
	test('findDialog should respect exclude selectors', () => {
		document.body.innerHTML = `
			<footer>
				<div class="cookie-link">Cookie Policy</div>
			</footer>
			<div id="actual-dialog" class="cookie-notice">Cookie Notice</div>
		`;
		const dialog = dialogFinder.findDialog(document);
		expect(dialog).not.toBeNull();
		expect(dialog.id).toBe('actual-dialog');
	});
	
	test('findDialog should return null if no dialog is found', () => {
		document.body.innerHTML = `
			<div>No cookie-related content here</div>
		`;
		const dialog = dialogFinder.findDialog(document);
		expect(dialog).toBeNull();
	});
	
	test('findAllPotentialDialogs should find all potential dialogs', () => {
		document.body.innerHTML = `
			<div id="dialog1" class="cookie-notice">Cookie Notice</div>
			<div id="dialog2" aria-label="cookie settings">Cookie Settings</div>
			<div id="not-dialog">Some other content</div>
		`;
		const dialogs = dialogFinder.findAllPotentialDialogs(document);
		expect(dialogs.length).toBe(2);
		expect(dialogs[0].id).toBe('dialog1');
		expect(dialogs[1].id).toBe('dialog2');
	});
	
	test('findAllPotentialDialogs should respect exclude selectors', () => {
		document.body.innerHTML = `
			<footer>
				<div id="footer-cookie" class="cookie-link">Cookie Policy</div>
			</footer>
			<div id="dialog1" class="cookie-notice">Cookie Notice</div>
			<div id="dialog2" aria-label="cookie settings">Cookie Settings</div>
		`;
		const dialogs = dialogFinder.findAllPotentialDialogs(document);
		expect(dialogs.length).toBe(2);
		expect(dialogs.some(d => d.id === 'footer-cookie')).toBe(false);
	});
	
	test('scoreDialog should score dialog based on selectors and text patterns', () => {
		const dialog1 = document.createElement('div');
		dialog1.id = 'cookieDialog';
		dialog1.textContent = 'Cookie Policy';
		
		const dialog2 = document.createElement('div');
		dialog2.className = 'cookie-notice';
		dialog2.textContent = 'Some other text';
		
		const dialog3 = document.createElement('div');
		dialog3.textContent = 'Privacy Policy';
		
		const score1 = dialogFinder.scoreDialog(dialog1);
		const score2 = dialogFinder.scoreDialog(dialog2);
		const score3 = dialogFinder.scoreDialog(dialog3);
		
		expect(score1).toBeGreaterThan(score2);
		expect(score2).toBeGreaterThan(score3);
	});
}); 