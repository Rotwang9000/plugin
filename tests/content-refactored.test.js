/**
 * Test suite for refactored content.js
 */

// Mock Chrome API
global.chrome = {
	storage: {
		local: {
			get: jest.fn((keys, callback) => {
				// Mock storage data
				const mockData = {};
				if (keys.includes('dataCollectionConsent')) {
					mockData.dataCollectionConsent = false;
				}
				callback(mockData);
			}),
			set: jest.fn((data, callback) => callback && callback())
		},
		sync: {
			get: jest.fn((defaults, callback) => callback(defaults))
		}
	},
	runtime: {
		sendMessage: jest.fn(),
		onMessage: {
			addListener: jest.fn()
		}
	},
	tabs: {
		query: jest.fn()
	}
};

// Mock DOM APIs
document.addEventListener = jest.fn();
document.querySelectorAll = jest.fn().mockReturnValue([]);
document.querySelector = jest.fn().mockReturnValue(null);
document.body = {
	children: [],
	appendChild: jest.fn(),
	cloneNode: jest.fn().mockReturnValue({
		outerHTML: '<div>Mock HTML</div>'
	})
};

window.location = {
	hostname: 'example.com',
	href: 'https://example.com/test'
};

window.getComputedStyle = jest.fn().mockReturnValue({
	position: 'fixed',
	display: 'block',
	visibility: 'visible',
	opacity: '1',
	zIndex: '999',
	top: '0',
	bottom: 'auto',
	left: '0',
	right: 'auto'
});

// Mock MutationObserver
global.MutationObserver = jest.fn(function(callback) {
	return {
		observe: jest.fn(),
		disconnect: jest.fn(),
		takeRecords: jest.fn()
	};
});

// Mock modules
jest.mock('../src/detection/button-recognition.js');
jest.mock('../src/detection/smart-detection.js');
jest.mock('../src/detection/cloud-detection.js');
jest.mock('../src/modules/html-utils.js');
jest.mock('../src/modules/dom-utils.js');
jest.mock('../src/modules/storage.js');
jest.mock('../src/api/messaging.js');

// Import mocked modules
const { findAcceptButton, findRejectButton, findNecessaryCookiesButton } = require('../src/detection/button-recognition.js');
const { isCookieConsentDialog, analyzeDialogSource, extractDialogElements } = require('../src/detection/smart-detection.js');
const { sendMessageToBackground } = require('../src/api/messaging.js');

// Setup mock implementations
isCookieConsentDialog.mockImplementation(() => true);
analyzeDialogSource.mockImplementation(() => ({ 
	score: 8, 
	confidence: 'high',
	details: []
}));
extractDialogElements.mockImplementation(() => []);
findAcceptButton.mockImplementation(() => ({ click: jest.fn() }));
findRejectButton.mockImplementation(() => ({ click: jest.fn() }));
findNecessaryCookiesButton.mockImplementation(() => ({ click: jest.fn() }));
sendMessageToBackground.mockImplementation(() => {});

// Test cases
describe('Content.js', () => {
	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();
		jest.resetModules();
		
		// Mock localStorage
		global.localStorage = {
			getItem: jest.fn(),
			setItem: jest.fn()
		};
		
		// Mock performance API
		global.performance = {
			navigation: {
				type: 0
			},
			getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }])
		};
		
		// Mock navigator
		global.navigator = {
			language: 'en-US'
		};
		
		// Set up mock element
		const mockElement = {
			tagName: 'DIV',
			outerHTML: '<div class="cookie-banner">Accept cookies</div>',
			innerHTML: 'Accept cookies',
			cloneNode: jest.fn().mockReturnValue({
				outerHTML: '<div class="cookie-banner">Accept cookies</div>',
				querySelectorAll: jest.fn().mockReturnValue([])
			}),
			getAttribute: jest.fn(),
			contains: jest.fn(),
			click: jest.fn(),
			classList: {
				contains: jest.fn().mockReturnValue(true)
			},
			querySelectorAll: jest.fn().mockReturnValue([]),
			children: []
		};
		
		// Return mock element for querySelector calls
		document.querySelectorAll.mockReturnValue([mockElement]);
	});
	
	test('initializes cookie consent manager on DOMContentLoaded', () => {
		// Load content.js (require after mocks are set up)
		require('../content.js');
		
		// Find the callback function that was passed to addEventListener
		const domContentLoadedCallback = document.addEventListener.mock.calls.find(
			call => call[0] === 'DOMContentLoaded'
		)[1];
		
		expect(domContentLoadedCallback).toBeDefined();
		
		// Execute the callback
		domContentLoadedCallback();
		
		// Verify chrome.storage was called to load settings
		expect(chrome.storage.sync.get).toHaveBeenCalled();
	});
	
	test('detects cookie consent dialogs in smart mode', () => {
		// Load content.js
		const contentJs = require('../content.js');
		
		// Mock a cookie banner element
		const mockBanner = {
			tagName: 'DIV',
			outerHTML: '<div class="cookie-consent">We use cookies</div>',
			innerHTML: 'We use cookies',
			classList: {
				contains: jest.fn()
			},
			querySelectorAll: jest.fn().mockReturnValue([]),
			cloneNode: jest.fn().mockReturnValue({
				outerHTML: '<div class="cookie-consent">We use cookies</div>',
				querySelectorAll: jest.fn().mockReturnValue([])
			}),
			getAttribute: jest.fn(),
			contains: jest.fn(),
			children: []
		};
		
		// Call the checkElementForCookieBanner function
		contentJs.checkElementForCookieBanner(mockBanner);
		
		// Verify isCookieConsentDialog was called
		expect(isCookieConsentDialog).toHaveBeenCalledWith(mockBanner);
		
		// Verify findAcceptButton was called for auto-accept
		expect(findAcceptButton).toHaveBeenCalled();
	});
	
	test('handles messages from extension', () => {
		// Load content.js
		require('../content.js');
		
		// Find the listener that was added to chrome.runtime.onMessage
		const messageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
		expect(messageListener).toBeDefined();
		
		// Mock sendResponse function
		const sendResponse = jest.fn();
		
		// Test 'detectionSetting' message
		messageListener({ 
			action: 'detectionSetting', 
			settings: { enabled: true, smartMode: true } 
		}, {}, sendResponse);
		
		// Verify response
		expect(sendResponse).toHaveBeenCalledWith({ success: true });
		
		// Test 'getCapturedDialogs' message
		messageListener({ action: 'getCapturedDialogs' }, {}, sendResponse);
		
		// Verify response includes dialogs array
		expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
			dialogs: expect.any(Array)
		}));
	});
}); 