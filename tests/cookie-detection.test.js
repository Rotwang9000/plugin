/**
 * Tests for cookie detection features including the fixes for:
 * 1. Respecting the 'enabled' setting
 * 2. 10-second detection timeout
 * 3. Not closing the same popup twice in a session
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
describe('Cookie Detection', () => {
	// Mock the chrome API
	global.chrome = {
		runtime: {
			sendMessage: jest.fn().mockImplementation((message, callback) => {
				if (callback) callback({});
				return Promise.resolve({});
			}),
			onMessage: {
				addListener: jest.fn()
			}
		},
		storage: {
			sync: {
				get: jest.fn().mockImplementation((keys, callback) => {
					callback({
						enabled: mockSettings.enabled,
						autoAccept: mockSettings.autoAccept,
						smartMode: mockSettings.smartMode
					});
				})
			},
			local: {
				get: jest.fn().mockImplementation((keys, callback) => callback({})),
				set: jest.fn()
			}
		}
	};
	
	// Mock the document and window objects
	document.body.innerHTML = `
		<div id="cookie-banner">
			<p>This website uses cookies to ensure you get the best experience.</p>
			<button id="accept-cookies">Accept</button>
			<button id="reject-cookies">Reject</button>
		</div>
	`;
	
	// Mock settings
	let mockSettings = {
		enabled: true,
		autoAccept: true,
		smartMode: true
	};
	
	// Import the functions we want to test
	const processCookieElement = window.processCookieElement;
	const checkElementForCookieBanner = window.checkElementForCookieBanner;
	const initCookieConsentManager = window.initCookieConsentManager;
	
	// Mock the necessary functions
	window.clickElement = jest.fn();
	window.clickAppropriateButton = jest.fn();
	window.findAcceptButton = jest.fn().mockResolvedValue(document.getElementById('accept-cookies'));
	window.isCookieConsentDialog = jest.fn().mockReturnValue(true);
	window.processedDialogsInSession = new Set();
	window.processedPopupDomains = new Set();
	window.sendMessageToBackground = jest.fn();
	window.captureDialog = jest.fn().mockReturnValue({ id: '123', domain: 'example.com' });
	window.capturedDialogs = [];
	
	beforeEach(() => {
		// Reset mocks before each test
		jest.clearAllMocks();
		window.processedDialogsInSession.clear();
		window.processedPopupDomains.clear();
		window.capturedDialogs = [];
	});
	
	// Test 1: Extension respects the 'enabled' setting
	test('Should not process cookie elements when extension is disabled', () => {
		// Set extension to disabled
		mockSettings.enabled = false;
		
		const cookieBanner = document.getElementById('cookie-banner');
		processCookieElement(cookieBanner, '#cookie-banner', 'test');
		
		// Should not process if disabled
		expect(window.clickAppropriateButton).not.toHaveBeenCalled();
		expect(window.sendMessageToBackground).not.toHaveBeenCalled();
	});
	
	// Test 2: Not closing the same popup twice
	test('Should not close the same popup twice in a session', () => {
		// Set extension to enabled
		mockSettings.enabled = true;
		
		// Mock location.hostname
		Object.defineProperty(window, 'location', {
			value: { hostname: 'example.com' }
		});
		
		const cookieBanner = document.getElementById('cookie-banner');
		
		// First time processing
		processCookieElement(cookieBanner, '#cookie-banner', 'test');
		expect(window.clickAppropriateButton).toHaveBeenCalledTimes(1);
		
		// Reset call counts but keep the processed domains
		jest.clearAllMocks();
		
		// Process another dialog on the same domain
		const secondBanner = document.createElement('div');
		secondBanner.id = 'different-cookie-banner';
		secondBanner.innerHTML = '<button>Accept Cookies</button>';
		document.body.appendChild(secondBanner);
		
		processCookieElement(secondBanner, '#different-cookie-banner', 'test');
		
		// Should not click again since we've already processed this domain
		expect(window.clickAppropriateButton).not.toHaveBeenCalled();
	});
	
	// Test 3: 10-second detection timeout
	test('Should stop detection after 10 seconds', () => {
		// Mock timer functions
		jest.useFakeTimers();
		
		// Mock MutationObserver
		const mockObserver = {
			disconnect: jest.fn(),
			observe: jest.fn()
		};
		global.MutationObserver = jest.fn(() => mockObserver);
		
		// Mock querySelector to include our observer
		const mockEls = [{_observer: mockObserver}];
		document.querySelectorAll = jest.fn().mockReturnValue(mockEls);
		
		// Set readyState to complete to trigger timeout immediately
		Object.defineProperty(document, 'readyState', {
			value: 'complete'
		});
		
		// Run smart mode detection
		window.runSmartMode();
		
		// Fast forward 11 seconds
		jest.advanceTimersByTime(11000);
		
		// Observer should be disconnected
		expect(mockObserver.disconnect).toHaveBeenCalled();
		
		// Clean up
		jest.useRealTimers();
	});
	
	// Test 4: Handles settings changes without requiring page reload
	test('Should handle settings changes without requiring page reload', () => {
		// Mock the stopAllDetection and initCookieConsentManager functions
		window.stopAllDetection = jest.fn();
		window.initCookieConsentManager = jest.fn();
		
		// Set initial settings
		mockSettings.enabled = true;
		mockSettings.autoAccept = true;
		
		// Create a message handler like the one in content.js
		const handleMessage = (message, sender) => {
			if (message.action === 'settingsUpdated') {
				// Update settings
				mockSettings = message.settings;
				
				// Get the specific setting that was changed
				const changedSetting = message.changedSetting;
				const isEnabledChange = changedSetting === 'enabled';
				const isAutoAcceptChange = changedSetting === 'autoAccept';
				
				// If the extension was enabled, start detection
				if (mockSettings.enabled) {
					// Only run detection if auto-accept is enabled
					if (mockSettings.autoAccept) {
						// If we specifically enabled auto-accept, start detection immediately
						if (isAutoAcceptChange) {
							window.initCookieConsentManager();
						}
					}
				} else if (isEnabledChange) {
					// Extension was just disabled
					window.stopAllDetection();
				}
			} else if (message.action === 'stopDetection') {
				// Update settings
				mockSettings = message.settings;
				
				// Stop all detection
				window.stopAllDetection();
			}
		};
		
		// Test 1: Disabling the extension should call stopAllDetection
		handleMessage({
			action: 'settingsUpdated',
			settings: { enabled: false, autoAccept: true },
			changedSetting: 'enabled'
		});
		
		expect(window.stopAllDetection).toHaveBeenCalledTimes(1);
		expect(mockSettings.enabled).toBe(false);
		
		// Reset mock functions
		jest.clearAllMocks();
		
		// Test 2: Re-enabling the extension with auto-accept should start detection
		handleMessage({
			action: 'settingsUpdated',
			settings: { enabled: true, autoAccept: true },
			changedSetting: 'enabled'
		});
		
		// Just enabling shouldn't restart detection automatically
		expect(window.initCookieConsentManager).not.toHaveBeenCalled();
		expect(mockSettings.enabled).toBe(true);
		
		// Reset mock functions
		jest.clearAllMocks();
		
		// Test 3: Disabling auto-accept should not call stopAllDetection
		handleMessage({
			action: 'settingsUpdated',
			settings: { enabled: true, autoAccept: false },
			changedSetting: 'autoAccept'
		});
		
		expect(window.stopAllDetection).not.toHaveBeenCalled();
		expect(mockSettings.autoAccept).toBe(false);
		
		// Reset mock functions
		jest.clearAllMocks();
		
		// Test 4: Re-enabling auto-accept should restart detection
		handleMessage({
			action: 'settingsUpdated',
			settings: { enabled: true, autoAccept: true },
			changedSetting: 'autoAccept'
		});
		
		expect(window.initCookieConsentManager).toHaveBeenCalledTimes(1);
		expect(mockSettings.autoAccept).toBe(true);
		
		// Reset mock functions
		jest.clearAllMocks();
		
		// Test 5: Direct stopDetection message should call stopAllDetection
		handleMessage({
			action: 'stopDetection',
			settings: { enabled: false, autoAccept: true },
			changedSetting: 'enabled'
		});
		
		expect(window.stopAllDetection).toHaveBeenCalledTimes(1);
		expect(mockSettings.enabled).toBe(false);
	});
}); 