/**
 * @jest-environment jsdom
 */

import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';

// Mock Chrome API
global.chrome = {
	storage: {
		sync: {
			get: jest.fn((keys, callback) => {
				callback({
					enabled: true,
					smartMode: true,
					autoAccept: true,
					privacyMode: false,
					gdprCompliance: true
				});
			}),
			set: jest.fn()
		},
		local: {
			get: jest.fn((keys, callback) => {
				callback({});
			}),
			set: jest.fn()
		}
	},
	runtime: {
		sendMessage: jest.fn(),
		onMessage: {
			addListener: jest.fn()
		}
	}
};

// Utility functions
function isElementVisible(element) {
	if (!element) return false;
	
	// Simple visibility check for testing
	return element.style?.display !== 'none' && 
		   element.style?.visibility !== 'hidden' && 
		   element.style?.opacity !== '0';
}

function getElementSelector(element) {
	if (!element) return '';
	
	if (element.id) {
		return `#${element.id}`;
	} else if (element.className && typeof element.className === 'string') {
		return `.${element.className.split(' ')[0]}`;
	}
	
	return element.tagName?.toLowerCase() || '';
}

// Smart Detection Functions
function findCookieConsentDialog() {
	// Common cookie banner IDs
	const commonIds = [
		'cookie-banner', 'cookie-notice', 'cookie-consent', 'cookieBanner',
		'cookieNotice', 'cookieConsent', 'gdpr-banner', 'gdpr-notice',
		'privacy-banner', 'privacy-notice', 'consent-banner', 'consent-notice',
		'CookieConsent', 'onetrust-banner-sdk', 'truste-consent-track'
	];
	
	// Common cookie banner classes
	const commonClasses = [
		'cookie-banner', 'cookie-notice', 'cookie-consent', 'cookieBanner',
		'cookieNotice', 'cookieConsent', 'gdpr-banner', 'gdpr-notice',
		'privacy-banner', 'privacy-notice', 'consent-banner', 'consent-notice'
	];
	
	// Check by ID first
	for (const id of commonIds) {
		const element = document.getElementById(id);
		if (element && isElementVisible(element)) {
			return element;
		}
	}
	
	// Check by class
	for (const className of commonClasses) {
		const elements = document.getElementsByClassName(className);
		if (elements.length > 0 && isElementVisible(elements[0])) {
			return elements[0];
		}
	}
	
	// Check by common keywords in text content
	const cookieKeywords = [
		'cookie', 'cookies', 'gdpr', 'privacy', 'consent',
		'personal data', 'data protection', 'data policy'
	];
	
	const allElements = document.querySelectorAll('div, section, aside, footer, header');
	for (const element of allElements) {
		if (!isElementVisible(element)) continue;
		
		const text = element.textContent?.toLowerCase() || '';
		if (cookieKeywords.some(keyword => text.includes(keyword))) {
			const hasButtons = element.querySelectorAll('button, a.button, input[type="button"]').length > 0;
			if (hasButtons) {
				return element;
			}
		}
	}
	
	return null;
}

function getCookieButtons(dialog) {
	if (!dialog) {
		return { acceptButton: null, rejectButton: null };
	}
	
	// Common accept button text/identifiers
	const acceptIdentifiers = [
		'accept', 'agree', 'allow', 'consent', 'yes', 'ok', 'got it',
		'got it!', 'i agree', 'i accept', 'continue', 'understood'
	];
	
	// Common reject button text/identifiers
	const rejectIdentifiers = [
		'reject', 'decline', 'deny', 'no', 'refuse', 'don\'t accept',
		'necessary only', 'essential only', 'disable', 'opt out'
	];
	
	// Find buttons
	const allButtons = dialog.querySelectorAll('button, a.button, input[type="button"], a[role="button"], div[role="button"]');
	
	let acceptButton = null;
	let rejectButton = null;
	
	// Check buttons by ID or class first
	for (const button of allButtons) {
		if (!isElementVisible(button)) continue;
		
		const id = button.id?.toLowerCase() || '';
		const className = button.className?.toLowerCase() || '';
		const text = button.textContent?.toLowerCase().trim() || '';
		
		// Check for accept button
		if (!acceptButton) {
			if (acceptIdentifiers.some(term => id.includes(term) || className.includes(term) || text.includes(term))) {
				acceptButton = button;
			}
		}
		
		// Check for reject button
		if (!rejectButton) {
			if (rejectIdentifiers.some(term => id.includes(term) || className.includes(term) || text.includes(term))) {
				rejectButton = button;
			}
		}
		
		if (acceptButton && rejectButton) break;
	}
	
	// If no standard buttons found, try common button patterns
	if (!acceptButton) {
		// Look for primary/confirm button
		const primaryButton = dialog.querySelector('.primary, .btn-primary, .confirm, .main-action');
		if (primaryButton && isElementVisible(primaryButton)) {
			acceptButton = primaryButton;
		}
	}
	
	return { acceptButton, rejectButton };
}

function determineCookieType(dialog) {
	if (!dialog) return 'generic';
	
	const text = dialog.textContent?.toLowerCase() || '';
	
	if (text.includes('gdpr') || text.includes('eu') || text.includes('european union')) {
		return 'gdpr';
	}
	
	if (text.includes('ccpa') || text.includes('california') || text.includes('do not sell')) {
		return 'ccpa';
	}
	
	return 'generic';
}

function detectCookieConsent() {
	const dialog = findCookieConsentDialog();
	
	if (!dialog) {
		return { dialog: null, acceptButton: null, rejectButton: null };
	}
	
	const { acceptButton, rejectButton } = getCookieButtons(dialog);
	
	return {
		dialog,
		acceptButton,
		rejectButton
	};
}

function analysePage() {
	const { dialog, acceptButton, rejectButton } = detectCookieConsent();
	
	return {
		hasCookieConsent: !!dialog,
		hasAcceptButton: !!acceptButton,
		hasRejectButton: !!rejectButton,
		cookieType: determineCookieType(dialog),
		domain: window.location.hostname,
		dialogSelector: getElementSelector(dialog),
		acceptSelector: getElementSelector(acceptButton),
		rejectSelector: getElementSelector(rejectButton)
	};
}

function hasIframe() {
	return document.querySelectorAll('iframe').length > 0;
}

// Helper to set up test DOM
function setupDOM(html) {
	document.body.innerHTML = html;
}

describe('Smart Cookie Detection', () => {
	beforeEach(() => {
		// Reset the DOM
		document.body.innerHTML = '';
		
		// Reset mocks
		jest.clearAllMocks();
		
		// Set up mock window location
		Object.defineProperty(window, 'location', {
			value: {
				hostname: 'example.com',
				href: 'https://example.com/'
			},
			writable: true
		});
		
		// Set up document language
		document.documentElement.lang = 'en-US';
	});
	
	describe('Cookie Dialog Detection', () => {
		test('finds cookie dialog by ID', () => {
			setupDOM(`
				<div id="cookie-banner">
					<p>This website uses cookies</p>
					<button>Accept</button>
				</div>
			`);
			
			const dialog = findCookieConsentDialog();
			expect(dialog).not.toBeNull();
			expect(dialog.id).toBe('cookie-banner');
		});
		
		test('finds cookie dialog by class name', () => {
			setupDOM(`
				<div class="cookie-notice">
					<p>This website uses cookies</p>
					<button>Accept</button>
				</div>
			`);
			
			const dialog = findCookieConsentDialog();
			expect(dialog).not.toBeNull();
			expect(dialog.className).toBe('cookie-notice');
		});
		
		test('finds cookie dialog by text content', () => {
			setupDOM(`
				<div class="notification">
					<p>This website uses cookies to improve your experience</p>
					<button>OK</button>
				</div>
			`);
			
			const dialog = findCookieConsentDialog();
			expect(dialog).not.toBeNull();
			expect(dialog.className).toBe('notification');
		});
		
		test('returns null when no cookie dialog is present', () => {
			setupDOM(`
				<div class="content">
					<p>Regular website content</p>
				</div>
			`);
			
			const dialog = findCookieConsentDialog();
			expect(dialog).toBeNull();
		});
	});
	
	describe('Cookie Button Detection', () => {
		test('finds accept and reject buttons', () => {
			setupDOM(`
				<div id="cookie-banner">
					<p>This website uses cookies</p>
					<button id="accept-cookies">Accept All</button>
					<button id="reject-cookies">Only Necessary</button>
				</div>
			`);
			
			const dialog = document.getElementById('cookie-banner');
			const { acceptButton, rejectButton } = getCookieButtons(dialog);
			
			expect(acceptButton).not.toBeNull();
			expect(acceptButton.id).toBe('accept-cookies');
			expect(rejectButton).not.toBeNull();
			expect(rejectButton.id).toBe('reject-cookies');
		});
		
		test('finds buttons by text content', () => {
			setupDOM(`
				<div id="cookie-banner">
					<p>This website uses cookies</p>
					<button>I agree</button>
					<button>No thanks</button>
				</div>
			`);
			
			const dialog = document.getElementById('cookie-banner');
			const { acceptButton, rejectButton } = getCookieButtons(dialog);
			
			expect(acceptButton).not.toBeNull();
			expect(acceptButton.textContent).toBe('I agree');
			expect(rejectButton).not.toBeNull();
			expect(rejectButton.textContent).toBe('No thanks');
		});
		
		test('handles case with only accept button', () => {
			setupDOM(`
				<div id="cookie-banner">
					<p>This website uses cookies</p>
					<button>OK</button>
				</div>
			`);
			
			const dialog = document.getElementById('cookie-banner');
			const { acceptButton, rejectButton } = getCookieButtons(dialog);
			
			expect(acceptButton).not.toBeNull();
			expect(acceptButton.textContent).toBe('OK');
			expect(rejectButton).toBeNull();
		});
		
		test('returns null for both buttons when no buttons are found', () => {
			setupDOM(`
				<div id="cookie-banner">
					<p>This website uses cookies</p>
					<a href="/privacy-policy">Privacy Policy</a>
				</div>
			`);
			
			const dialog = document.getElementById('cookie-banner');
			const { acceptButton, rejectButton } = getCookieButtons(dialog);
			
			expect(acceptButton).toBeNull();
			expect(rejectButton).toBeNull();
		});
	});
	
	describe('Cookie Type Detection', () => {
		test('identifies GDPR cookie notices', () => {
			setupDOM(`
				<div id="cookie-banner">
					<p>This website uses cookies in compliance with GDPR regulations</p>
					<button>Accept</button>
				</div>
			`);
			
			const dialog = document.getElementById('cookie-banner');
			const cookieType = determineCookieType(dialog);
			
			expect(cookieType).toBe('gdpr');
		});
		
		test('identifies CCPA cookie notices', () => {
			setupDOM(`
				<div id="cookie-banner">
					<p>California residents: learn about your privacy rights under CCPA</p>
					<button>Accept</button>
				</div>
			`);
			
			const dialog = document.getElementById('cookie-banner');
			const cookieType = determineCookieType(dialog);
			
			expect(cookieType).toBe('ccpa');
		});
		
		test('defaults to generic for standard cookie notices', () => {
			setupDOM(`
				<div id="cookie-banner">
					<p>This website uses cookies to improve your experience</p>
					<button>Accept</button>
				</div>
			`);
			
			const dialog = document.getElementById('cookie-banner');
			const cookieType = determineCookieType(dialog);
			
			expect(cookieType).toBe('generic');
		});
	});
	
	describe('Page Analysis', () => {
		test('correctly identifies page with cookie consent', () => {
			setupDOM(`
				<div id="cookie-banner">
					<p>This website uses cookies in compliance with GDPR</p>
					<button id="accept-cookies">Accept All</button>
					<button id="reject-cookies">Reject Non-Essential</button>
				</div>
			`);
			
			const analysis = analysePage();
			
			expect(analysis.hasCookieConsent).toBe(true);
			expect(analysis.hasAcceptButton).toBe(true);
			expect(analysis.hasRejectButton).toBe(true);
			expect(analysis.cookieType).toBe('gdpr');
			expect(analysis.domain).toBe('example.com');
			expect(analysis.dialogSelector).toBe('#cookie-banner');
			expect(analysis.acceptSelector).toBe('#accept-cookies');
			expect(analysis.rejectSelector).toBe('#reject-cookies');
		});
		
		test('correctly identifies page without cookie consent', () => {
			setupDOM(`
				<div id="content">
					<p>Regular website content</p>
				</div>
			`);
			
			const analysis = analysePage();
			
			expect(analysis.hasCookieConsent).toBe(false);
			expect(analysis.hasAcceptButton).toBe(false);
			expect(analysis.hasRejectButton).toBe(false);
			expect(analysis.domain).toBe('example.com');
			expect(analysis.dialogSelector).toBe('');
			expect(analysis.acceptSelector).toBe('');
			expect(analysis.rejectSelector).toBe('');
		});
	});
	
	describe('Edge Cases', () => {
		test('handles non-standard cookie banners', () => {
			setupDOM(`
				<div class="notification-bar">
					<span>We value your privacy. Click "Got it!" to continue.</span>
					<div class="actions">
						<button class="primary-btn">Got it!</button>
						<a href="/privacy">Learn more</a>
					</div>
				</div>
			`);
			
			const result = detectCookieConsent();
			
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			expect(result.acceptButton.textContent).toBe('Got it!');
		});
		
		test('detects iframes on page', () => {
			setupDOM(`
				<div>
					<iframe src="https://example.com/frame"></iframe>
				</div>
			`);
			
			expect(hasIframe()).toBe(true);
		});
		
		test('handles dynamically injected cookie banners', () => {
			// Start with empty page
			setupDOM(`<div id="content">Regular content</div>`);
			
			// No cookie banner initially
			let result = detectCookieConsent();
			expect(result.dialog).toBeNull();
			
			// Inject cookie banner dynamically
			const banner = document.createElement('div');
			banner.id = 'cookie-consent';
			banner.innerHTML = `
				<p>This site uses cookies</p>
				<button id="acceptBtn">Accept</button>
				<button id="rejectBtn">Reject</button>
			`;
			document.body.appendChild(banner);
			
			// Detection should now find the banner
			result = detectCookieConsent();
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			expect(result.acceptButton.id).toBe('acceptBtn');
		});
	});
}); 