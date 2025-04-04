/**
 * @jest-environment jsdom
 */

// Import the functions from the detection module
const { 
	detectCookieConsent, 
	getCookieButtons, 
	analysePage, 
	findCookieConsentButtons, 
	findCookieConsentDialog,
	determineCookieType,
	hasIframe
} = require('../src/modules/detection.js');

// Mock dependencies
jest.mock('../src/modules/utils.js', () => ({
	log: jest.fn(),
	objectToJson: jest.fn(obj => JSON.stringify(obj)),
	jsonToObject: jest.fn(json => JSON.parse(json)),
	getQueryParameters: jest.fn()
}));

jest.mock('../src/modules/settings.js', () => ({
	settings: {
		enabled: true,
		smartMode: true,
		autoAccept: true
	},
	detectRegion: jest.fn(() => 'international')
}));

describe('Detection Module', () => {
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
	
	describe('findCookieConsentDialog', () => {
		test('finds cookie dialog by common IDs', () => {
			document.body.innerHTML = `
				<div id="cookieBanner">
					Cookie consent text
					<button>Accept</button>
				</div>
			`;
			
			const result = findCookieConsentDialog();
			expect(result).not.toBeNull();
			expect(result.id).toBe('cookieBanner');
		});
		
		test('finds cookie dialog by common classes', () => {
			document.body.innerHTML = `
				<div class="cookie-consent">
					Cookie consent text
					<button>Accept</button>
				</div>
			`;
			
			const result = findCookieConsentDialog();
			expect(result).not.toBeNull();
			expect(result.className).toBe('cookie-consent');
		});
		
		test('finds cookie dialog by common keywords', () => {
			document.body.innerHTML = `
				<div>
					<div>
						<p>We use cookies to improve your experience</p>
						<button>Accept</button>
					</div>
				</div>
			`;
			
			const result = findCookieConsentDialog();
			expect(result).not.toBeNull();
			expect(result.textContent).toContain('cookies');
		});
		
		test('returns null when no cookie dialog is found', () => {
			document.body.innerHTML = `
				<div>
					<p>Regular website content</p>
				</div>
			`;
			
			const result = findCookieConsentDialog();
			expect(result).toBeNull();
		});
	});
	
	describe('getCookieButtons', () => {
		test('finds accept and reject buttons', () => {
			document.body.innerHTML = `
				<div id="cookieConsent">
					<button id="acceptCookies">Accept</button>
					<button id="rejectCookies">Reject</button>
				</div>
			`;
			
			const dialog = document.getElementById('cookieConsent');
			const result = getCookieButtons(dialog);
			
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).not.toBeNull();
			expect(result.acceptButton.id).toBe('acceptCookies');
			expect(result.rejectButton.id).toBe('rejectCookies');
		});
		
		test('finds buttons by common accept/reject text', () => {
			document.body.innerHTML = `
				<div id="cookieConsent">
					<button>Allow cookies</button>
					<button>Decline cookies</button>
				</div>
			`;
			
			const dialog = document.getElementById('cookieConsent');
			const result = getCookieButtons(dialog);
			
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).not.toBeNull();
			expect(result.acceptButton.textContent).toBe('Allow cookies');
			expect(result.rejectButton.textContent).toBe('Decline cookies');
		});
		
		test('prioritizes buttons with certain keywords', () => {
			document.body.innerHTML = `
				<div id="cookieConsent">
					<button>OK</button>
					<button>I agree</button>
					<button>Settings</button>
				</div>
			`;
			
			const dialog = document.getElementById('cookieConsent');
			const result = getCookieButtons(dialog);
			
			expect(result.acceptButton).not.toBeNull();
			expect(result.acceptButton.textContent).toBe('I agree');
		});
		
		test('returns null for buttons when none found', () => {
			document.body.innerHTML = `
				<div id="cookieConsent">
					<p>Cookie policy information</p>
				</div>
			`;
			
			const dialog = document.getElementById('cookieConsent');
			const result = getCookieButtons(dialog);
			
			expect(result.acceptButton).toBeNull();
			expect(result.rejectButton).toBeNull();
		});
	});
	
	describe('determineCookieType', () => {
		test('identifies GDPR cookie banners', () => {
			document.body.innerHTML = `
				<div id="cookieBanner">
					<p>This site uses cookies in compliance with GDPR</p>
					<button>Accept</button>
					<button>Decline</button>
				</div>
			`;
			
			const dialog = document.getElementById('cookieBanner');
			const result = determineCookieType(dialog);
			
			expect(result).toBe('gdpr');
		});
		
		test('identifies CCPA cookie notices', () => {
			document.body.innerHTML = `
				<div id="cookieBanner">
					<p>California residents: learn about your privacy rights (CCPA)</p>
					<button>Accept</button>
				</div>
			`;
			
			const dialog = document.getElementById('cookieBanner');
			const result = determineCookieType(dialog);
			
			expect(result).toBe('ccpa');
		});
		
		test('defaults to generic when type cannot be determined', () => {
			document.body.innerHTML = `
				<div id="cookieBanner">
					<p>This website uses cookies</p>
					<button>OK</button>
				</div>
			`;
			
			const dialog = document.getElementById('cookieBanner');
			const result = determineCookieType(dialog);
			
			expect(result).toBe('generic');
		});
	});
	
	describe('hasIframe', () => {
		test('detects iframes in the page', () => {
			document.body.innerHTML = `
				<div>
					<iframe src="https://example.com/frame"></iframe>
				</div>
			`;
			
			expect(hasIframe()).toBe(true);
		});
		
		test('returns false when no iframes exist', () => {
			document.body.innerHTML = `
				<div>
					<p>No iframes here</p>
				</div>
			`;
			
			expect(hasIframe()).toBe(false);
		});
	});
	
	describe('analysePage', () => {
		test('returns page analysis with cookie consent info', () => {
			document.body.innerHTML = `
				<div id="cookieBanner">
					<p>This site uses cookies</p>
					<button id="acceptBtn">Accept</button>
					<button id="rejectBtn">Reject</button>
				</div>
			`;
			
			const result = analysePage();
			
			expect(result).toHaveProperty('hasCookieConsent', true);
			expect(result).toHaveProperty('hasAcceptButton', true);
			expect(result).toHaveProperty('hasRejectButton', true);
			expect(result).toHaveProperty('cookieType');
			expect(result).toHaveProperty('domain', 'example.com');
		});
		
		test('returns page analysis when no cookie consent exists', () => {
			document.body.innerHTML = `
				<div>
					<p>Regular website content</p>
				</div>
			`;
			
			const result = analysePage();
			
			expect(result).toHaveProperty('hasCookieConsent', false);
			expect(result).toHaveProperty('hasAcceptButton', false);
			expect(result).toHaveProperty('hasRejectButton', false);
			expect(result).toHaveProperty('domain', 'example.com');
		});
	});
	
	describe('detectCookieConsent', () => {
		test('detects and returns cookie consent UI elements', () => {
			document.body.innerHTML = `
				<div id="cookieBanner">
					<p>This site uses cookies</p>
					<button id="acceptBtn">Accept</button>
					<button id="rejectBtn">Reject</button>
				</div>
			`;
			
			const result = detectCookieConsent();
			
			expect(result).toHaveProperty('dialog');
			expect(result).toHaveProperty('acceptButton');
			expect(result).toHaveProperty('rejectButton');
			expect(result.dialog).not.toBeNull();
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).not.toBeNull();
		});
		
		test('returns null values when no cookie consent exists', () => {
			document.body.innerHTML = `
				<div>
					<p>Regular website content</p>
				</div>
			`;
			
			const result = detectCookieConsent();
			
			expect(result).toHaveProperty('dialog', null);
			expect(result).toHaveProperty('acceptButton', null);
			expect(result).toHaveProperty('rejectButton', null);
		});
	});
	
	describe('findCookieConsentButtons', () => {
		test('finds standalone cookie buttons outside dialog', () => {
			document.body.innerHTML = `
				<div>
					<p>Website content</p>
				</div>
				<button id="acceptCookies">Accept Cookies</button>
				<button id="rejectCookies">Reject Cookies</button>
			`;
			
			const result = findCookieConsentButtons();
			
			expect(result.acceptButton).not.toBeNull();
			expect(result.rejectButton).not.toBeNull();
			expect(result.acceptButton.id).toBe('acceptCookies');
			expect(result.rejectButton.id).toBe('rejectCookies');
		});
		
		test('returns null when no standalone buttons exist', () => {
			document.body.innerHTML = `
				<div>
					<p>Website content with no cookie buttons</p>
				</div>
			`;
			
			const result = findCookieConsentButtons();
			
			expect(result.acceptButton).toBeNull();
			expect(result.rejectButton).toBeNull();
		});
	});
}); 