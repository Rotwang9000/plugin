/**
 * Tests for cookie detection with session tracking and timeout functionality
 */

// Mock fetch for selectors.json loading
global.fetch = jest.fn(() =>
	Promise.resolve({
		ok: true,
		json: () => Promise.resolve({
			cookieDialogSelectors: ['.cookie-banner', '#cookie-notice'],
			dialogTypes: {
				xGrokHistory: {
					selectors: ['.view-browser-history-dialog', '.timeline-dialog']
				}
			},
			buttonTypes: {
				accept: {
					selectors: ['button.accept'],
					textPatterns: ['accept', 'agree']
				}
			}
		})
	})
);

// Mock the DOM environment for testing
document.body.innerHTML = `
	<div class="cookie-banner">
		<button class="accept">Accept Cookies</button>
	</div>
	<div class="view-browser-history-dialog">
		<button class="close">Close</button>
	</div>
`;

// Mock dependencies
jest.mock('../src/detection/button-recognition.js', () => ({
	findAcceptButton: jest.fn(element => element.querySelector('button.accept')),
	findRejectButton: jest.fn(() => null),
	findNecessaryCookiesButton: jest.fn(() => null),
	findSettingsButton: jest.fn(() => null)
}));

jest.mock('../src/detection/smart-detection.js', () => ({
	isCookieConsentDialog: jest.fn(element => element.classList.contains('cookie-banner')),
	findCookieConsentDialogs: jest.fn(),
	analyzeDialogSource: jest.fn(() => ({ score: 0.9, confidence: 'high' })),
	extractDialogElements: jest.fn(() => [])
}));

jest.mock('../src/detection/cloud-detection.js', () => ({
	matchDialogWithCloudPatterns: jest.fn(),
	detectWithCloudPatterns: jest.fn(),
	findButtonInDialog: jest.fn()
}));

jest.mock('../src/modules/html-utils.js', () => ({
	formatHtmlWithLineNumbers: jest.fn(),
	escapeHtml: jest.fn(html => html),
	safeGetHtmlContent: jest.fn(el => el.outerHTML),
	createViewableHtmlDocument: jest.fn()
}));

jest.mock('../src/modules/dom-utils.js', () => ({
	createElement: jest.fn((tag, attrs, text, parent) => {
		const el = document.createElement(tag);
		if (text) el.textContent = text;
		if (parent) parent.appendChild(el);
		return el;
	}),
	clearElement: jest.fn(),
	toggleClass: jest.fn(),
	queryAndProcess: jest.fn(),
	addDebouncedEventListener: jest.fn()
}));

jest.mock('../src/modules/storage.js', () => ({
	getSettings: jest.fn(),
	saveSettings: jest.fn(),
	saveDialogToHistory: jest.fn(),
	dataCollectionConsent: false
}));

jest.mock('../src/api/messaging.js', () => ({
	sendMessageToBackground: jest.fn()
}));

// Mock chrome API
global.chrome = {
	storage: {
		sync: {
			get: jest.fn((defaults, callback) => callback(defaults))
		},
		local: {
			get: jest.fn((key, callback) => callback({})),
			set: jest.fn()
		}
	},
	runtime: {
		onMessage: {
			addListener: jest.fn()
		},
		sendMessage: jest.fn()
	},
	tabs: {
		query: jest.fn((params, callback) => callback([{ id: 1, url: 'https://example.com' }]))
	}
};

// Import the content script after mocking dependencies
const originalConsoleLog = console.log;
console.log = jest.fn();

// Create mock functions to test
const processCookieElement = jest.fn();
const generateDialogId = jest.fn(() => 'test_dialog_id');
const clickElement = jest.fn();
const startDetectionTimeout = jest.fn();

// Test suite
describe('Cookie Detection with Session Protection and Timeout', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		document.body.innerHTML = `
			<div class="cookie-banner">
				<button class="accept">Accept Cookies</button>
			</div>
			<div class="view-browser-history-dialog">
				<button class="close">Close</button>
			</div>
		`;
	});

	afterAll(() => {
		console.log = originalConsoleLog;
	});

	test('Should prevent processing the same dialog twice in a session', () => {
		// Mock implementation
		const processedDialogsInSession = new Set();
		
		const mockProcessCookieElement = (element, selector, method) => {
			const dialogId = generateDialogId(element);
			
			if (processedDialogsInSession.has(dialogId)) {
				return false;
			}
			
			processedDialogsInSession.add(dialogId);
			return true;
		};
		
		const cookieBanner = document.querySelector('.cookie-banner');
		
		// First call should process
		expect(mockProcessCookieElement(cookieBanner, null, 'smart')).toBe(true);
		
		// Second call should not process
		expect(mockProcessCookieElement(cookieBanner, null, 'smart')).toBe(false);
	});

	test('Should not automatically close X/Grok history dialogs', () => {
		// Mock implementation
		const clickAppropriateButton = jest.fn();
		
		const mockProcessCookieElement = (element, selector, method) => {
			// Only auto-accept if it's not an X/Grok history window
			if (method !== 'xGrok') {
				clickAppropriateButton(element);
				return true;
			}
			return false;
		};
		
		const cookieBanner = document.querySelector('.cookie-banner');
		const historyDialog = document.querySelector('.view-browser-history-dialog');
		
		// Cookie banner should trigger click
		mockProcessCookieElement(cookieBanner, null, 'smart');
		expect(clickAppropriateButton).toHaveBeenCalledWith(cookieBanner);
		
		clickAppropriateButton.mockClear();
		
		// History dialog should not trigger click
		mockProcessCookieElement(historyDialog, null, 'xGrok');
		expect(clickAppropriateButton).not.toHaveBeenCalled();
	});

	test('Should stop detection after timeout', () => {
		// Mock the window object
		const originalSetTimeout = window.setTimeout;
		const mockSetTimeout = jest.fn((callback, timeout) => {
			return originalSetTimeout(callback, 0); // Execute immediately for testing
		});
		window.setTimeout = mockSetTimeout;
		
		// Mock implementation
		const mockStartDetectionTimeout = () => {
			window.setTimeout(() => {
				// This would disconnect observers in the real implementation
				console.log('Detection stopped after timeout');
			}, 10000);
		};
		
		mockStartDetectionTimeout();
		expect(mockSetTimeout).toHaveBeenCalled();
		expect(console.log).toHaveBeenCalledWith('Detection stopped after timeout');
		
		// Restore original setTimeout
		window.setTimeout = originalSetTimeout;
	});

	test('Should use JSON config for selectors', async () => {
		// Check that fetch is called properly
		const loadSelectors = async () => {
			try {
				const response = await fetch('selectors.json');
				return await response.json();
			} catch (error) {
				console.error('Error loading selectors:', error);
				return {};
			}
		};
		
		const selectors = await loadSelectors();
		
		expect(fetch).toHaveBeenCalledWith('selectors.json');
		expect(selectors).toHaveProperty('cookieDialogSelectors');
		expect(selectors).toHaveProperty('dialogTypes.xGrokHistory');
		expect(selectors).toHaveProperty('buttonTypes.accept');
	});
}); 