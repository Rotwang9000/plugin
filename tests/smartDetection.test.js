/**
 * @jest-environment jsdom
 */

// Import the functions from the detection module that we will test
const { 
	analysePage,
	findCookieConsentDialog,
	getCookieButtons,
	determineCookieType,
	detectCookieConsent
} = require('../src/modules/detection.js');

// Mock dependencies
jest.mock('../src/modules/utils.js', () => ({
	log: jest.fn(),
	getElementSelector: jest.fn(element => {
		if (!element) return '';
		if (element.id) return `#${element.id}`;
		if (element.className) return `.${element.className.split(' ')[0]}`;
		return element.tagName.toLowerCase();
	}),
	generateElementPath: jest.fn(element => {
		if (!element) return '';
		if (element.id) return `#${element.id}`;
		return element.tagName.toLowerCase();
	})
}));

jest.mock('../src/modules/settings.js', () => ({
	settings: {
		enabled: true,
		smartMode: true,
		autoAccept: true
	},
	detectRegion: jest.fn().mockReturnValue('international')
}));

// Test suite for smart detection algorithm
describe('Smart Detection Algorithm', () => {
	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();
		
		// Setup DOM for testing
		document.body.innerHTML = '';
		
		// Mock window properties
		Object.defineProperty(window, 'location', {
			value: {
				hostname: 'example.com',
				href: 'https://example.com/page'
			},
			writable: true
		});
	});
	
	describe('Edge Cases', () => {
		test('handles dynamically injected cookie banners', () => {
			// Start with empty page
			document.body.innerHTML = `<div id="content"><p>Regular content</p></div>`;
			
			// No cookie banner detected initially
			let result = detectCookieConsent();
			expect(result.dialog).toBeNull();
			
			// Inject cookie banner dynamically
			const banner = document.createElement('div');
			banner.id = 'cookie-consent';
			banner.innerHTML = `
				<p>This site uses cookies</p>
				<button id="acceptCookies">Accept</button>
				<button id="rejectCookies">Reject</button>
			`;
			document.body.appendChild(banner);
			
			// Now detection should find the banner
			result = detectCookieConsent();
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).not.toBeNull();
		});
		
		test('handles cookie banners in shadow DOM', () => {
			// Create a host for shadow DOM
			const shadowHost = document.createElement('div');
			shadowHost.id = 'shadow-host';
			document.body.appendChild(shadowHost);
			
			// Create shadow DOM
			const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
			shadowRoot.innerHTML = `
				<div id="cookie-banner">
					<p>This site uses cookies</p>
					<button id="acceptCookies">Accept</button>
				</div>
			`;
			
			// Current implementation won't find elements in shadow DOM
			// This test verifies this limitation
			const result = detectCookieConsent();
			expect(result.dialog).toBeNull();
			
			// Future enhancement: Modify detection to search shadow DOM
		});
		
		test('handles iframes with cookie consent', () => {
			// Setup iframe
			document.body.innerHTML = `
				<iframe id="consent-frame" style="width:100%;height:100px;"></iframe>
			`;
			
			const iframe = document.getElementById('consent-frame');
			
			// Mock iframe content document
			iframe.contentDocument = document;
			iframe.contentWindow = window;
			
			// Add cookie consent to iframe document
			iframe.contentDocument.body.innerHTML = `
				<div id="cookie-banner">
					<p>This site uses cookies</p>
					<button id="acceptCookies">Accept</button>
				</div>
			`;
			
			// Current implementation doesn't check iframes
			// This test verifies this limitation
			const result = detectCookieConsent();
			expect(result.dialog).toBeNull();
			
			// Future enhancement: Modify detection to search iframes
		});
	});
	
	describe('Common Cookie Banner Patterns', () => {
		test('detects common GDPR cookie notice patterns', () => {
			document.body.innerHTML = `
				<div id="gdpr-cookie-notice">
					<div class="cookie-notice-content">
						<p>We use cookies to ensure you get the best experience on our website. By continuing to browse, you agree to our use of cookies in accordance with our Cookie Policy.</p>
						<div class="cookie-notice-actions">
							<button id="cookie-notice-accept">Accept</button>
							<button id="cookie-notice-decline">Decline</button>
							<a href="/privacy" class="cookie-notice-link">Privacy Policy</a>
						</div>
					</div>
				</div>
			`;
			
			const result = detectCookieConsent();
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).not.toBeNull();
			expect(result.dialog.id).toBe('gdpr-cookie-notice');
			
			const cookieType = determineCookieType(result.dialog);
			expect(cookieType).toBe('gdpr');
		});
		
		test('detects Cookiebot pattern', () => {
			document.body.innerHTML = `
				<div id="CookieConsent" class="cookieconsent">
					<div class="cookieconsent-content">
						<h2>We use cookies</h2>
						<p>This website uses cookies to ensure you get the best experience on our website.</p>
						<div class="cookieconsent-buttons">
							<button id="CookieConsentAccept">Accept all cookies</button>
							<button id="CookieConsentDecline">Decline non-essential cookies</button>
							<button id="CookieConsentPreferences">Preferences</button>
						</div>
					</div>
				</div>
			`;
			
			const result = detectCookieConsent();
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).not.toBeNull();
			expect(result.dialog.id).toBe('CookieConsent');
			
			// Should identify accept button correctly among multiple buttons
			expect(result.acceptButton.id).toBe('CookieConsentAccept');
		});
		
		test('detects OneTrust cookie banner pattern', () => {
			document.body.innerHTML = `
				<div id="onetrust-consent-sdk">
					<div id="onetrust-banner-sdk" class="otFlat">
						<div class="ot-sdk-container">
							<div id="onetrust-policy">
								<p id="onetrust-policy-text">This site uses cookies for analytics, personalized content and ads.</p>
							</div>
							<div id="onetrust-button-group">
								<button id="onetrust-accept-btn-handler">Accept All Cookies</button>
								<button id="onetrust-reject-all-handler">Reject All</button>
								<button id="onetrust-pc-btn-handler">Cookie Settings</button>
							</div>
						</div>
					</div>
				</div>
			`;
			
			const result = detectCookieConsent();
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).not.toBeNull();
			expect(result.dialog.id).toBe('onetrust-banner-sdk');
			
			// Should identify accept and reject buttons correctly
			expect(result.acceptButton.id).toBe('onetrust-accept-btn-handler');
			expect(result.rejectButton.id).toBe('onetrust-reject-all-handler');
		});
		
		test('detects minimal cookie notice with just an accept button', () => {
			document.body.innerHTML = `
				<div class="cookie-notice">
					<p>We use cookies. <a href="/privacy">Learn more</a></p>
					<button class="accept-cookies">OK</button>
				</div>
			`;
			
			const result = detectCookieConsent();
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).toBeNull();
			expect(result.dialog.className).toBe('cookie-notice');
			
			// Should identify minimal accept button 
			expect(result.acceptButton.className).toBe('accept-cookies');
		});
	});
	
	describe('Language-specific Detection', () => {
		test('detects cookie banners in non-English languages (German)', () => {
			document.body.innerHTML = `
				<div id="cookie-hinweis">
					<p>Diese Website verwendet Cookies, um Ihnen ein optimales Surferlebnis zu bieten.</p>
					<div class="cookie-buttons">
						<button id="akzeptieren">Akzeptieren</button>
						<button id="ablehnen">Ablehnen</button>
					</div>
				</div>
			`;
			
			// Set language to German
			document.documentElement.lang = 'de';
			
			const result = detectCookieConsent();
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).not.toBeNull();
			
			// Should identify German buttons correctly
			expect(result.acceptButton.id).toBe('akzeptieren');
			expect(result.rejectButton.id).toBe('ablehnen');
		});
		
		test('detects cookie banners in non-English languages (French)', () => {
			document.body.innerHTML = `
				<div id="banniere-cookie">
					<p>Ce site utilise des cookies pour améliorer votre expérience.</p>
					<div class="boutons-cookie">
						<button id="accepter">Accepter</button>
						<button id="refuser">Refuser</button>
					</div>
				</div>
			`;
			
			// Set language to French
			document.documentElement.lang = 'fr';
			
			const result = detectCookieConsent();
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).not.toBeNull();
			
			// Should identify French buttons correctly
			expect(result.acceptButton.id).toBe('accepter');
			expect(result.rejectButton.id).toBe('refuser');
		});
	});
	
	describe('Adaptive Decision Making', () => {
		test('adapts to different button labeling patterns', () => {
			document.body.innerHTML = `
				<div id="cookie-consent">
					<p>We use cookies to improve your experience.</p>
					<div class="buttons">
						<button class="btn-secondary">Learn more</button>
						<button class="btn-primary">Got it!</button>
					</div>
				</div>
			`;
			
			const result = detectCookieConsent();
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			
			// Should identify "Got it!" as accept button based on context and button styling
			expect(result.acceptButton.textContent).toBe('Got it!');
		});
		
		test('handles buttons with icons and minimal text', () => {
			document.body.innerHTML = `
				<div id="cookie-banner">
					<p>This site uses cookies.</p>
					<div class="actions">
						<button class="icon-button accept">
							<span class="icon">✓</span>
						</button>
						<button class="icon-button reject">
							<span class="icon">✗</span>
						</button>
					</div>
				</div>
			`;
			
			const result = detectCookieConsent();
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).not.toBeNull();
			
			// Should identify buttons based on class names even without descriptive text
			expect(result.acceptButton.className).toContain('accept');
			expect(result.rejectButton.className).toContain('reject');
		});
		
		test('handles tricky button naming conventions', () => {
			document.body.innerHTML = `
				<div id="cookie-notice">
					<p>By continuing to use our site, you agree to our cookie policy.</p>
					<div class="buttons">
						<button class="continue-button">Continue</button>
						<button class="settings-button">Adjust Settings</button>
					</div>
				</div>
			`;
			
			const result = detectCookieConsent();
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			
			// Should identify "Continue" as an implicit accept
			expect(result.acceptButton.className).toBe('continue-button');
		});
	});
	
	describe('Overall Page Analysis', () => {
		test('complete page analysis identifies cookie consent elements and type', () => {
			document.body.innerHTML = `
				<header>
					<nav>Menu items</nav>
				</header>
				<main>
					<h1>Website Content</h1>
					<p>Regular page content</p>
				</main>
				<div id="cookie-banner" class="gdpr-notice">
					<p>This website uses cookies to ensure you get the best experience. By using our website, you agree to our use of cookies.</p>
					<div class="cookie-actions">
						<button id="accept-cookies">Accept All</button>
						<button id="reject-cookies">Reject Non-Essential</button>
						<a href="/cookie-policy">Cookie Policy</a>
					</div>
				</div>
				<footer>
					<p>Copyright 2023</p>
				</footer>
			`;
			
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
		
		test('page analysis correctly identifies absence of cookie consent', () => {
			document.body.innerHTML = `
				<header>
					<nav>Menu items</nav>
				</header>
				<main>
					<h1>Website Content</h1>
					<p>Regular page content</p>
				</main>
				<footer>
					<p>Copyright 2023</p>
					<a href="/privacy-policy">Privacy Policy</a>
				</footer>
			`;
			
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
}); 