/**
 * @jest-environment jsdom
 */

// Mock chrome API
global.chrome = {
	storage: {
		sync: {
			get: jest.fn(),
			set: jest.fn()
		},
		local: {
			get: jest.fn(),
			set: jest.fn()
		}
	}
};

// Import settings module with mocked imports
jest.mock('../src/modules/settings.js', () => {
	// Original module
	const originalModule = jest.requireActual('../src/modules/settings.js');
	
	return {
		...originalModule,
		// Add any mocked functions here
	};
});

// Import the module after mocking
const { 
	settings, 
	loadSettings, 
	isFirstVisitToday, 
	isGetRequest, 
	detectRegion 
} = require('../src/modules/settings.js');

describe('Settings Module', () => {
	beforeEach(() => {
		// Reset all mocks before each test
		jest.clearAllMocks();
		
		// Setup default mock implementation for chrome storage
		chrome.storage.sync.get.mockImplementation((keys, callback) => {
			callback({
				enabled: true,
				autoAccept: true,
				smartMode: true,
				cloudMode: false,
				privacyMode: true,
				gdprCompliance: true
			});
		});
		
		chrome.storage.local.get.mockImplementation((keys, callback) => {
			callback({});
		});
		
		// Mock document and window properties
		Object.defineProperty(window, 'location', {
			value: {
				hostname: 'example.com',
				href: 'https://example.com/page'
			},
			writable: true
		});
		
		document.documentElement.lang = 'en-US';
		
		// Create a mock body for testing
		document.body.innerHTML = `
			<div>
				Some text about cookies and privacy.
			</div>
		`;
	});
	
	test('settings object has expected default structure', () => {
		expect(settings).toBeDefined();
		expect(settings).toHaveProperty('enabled');
		expect(settings).toHaveProperty('autoAccept');
		expect(settings).toHaveProperty('smartMode');
		expect(settings).toHaveProperty('cloudMode');
		expect(settings).toHaveProperty('privacyMode');
		expect(settings).toHaveProperty('gdprCompliance');
	});
	
	test('loadSettings loads settings from Chrome storage', (done) => {
		loadSettings((loadedSettings) => {
			expect(chrome.storage.sync.get).toHaveBeenCalled();
			expect(loadedSettings).toHaveProperty('enabled', true);
			expect(loadedSettings).toHaveProperty('autoAccept', true);
			expect(loadedSettings).toHaveProperty('smartMode', true);
			expect(loadedSettings).toHaveProperty('cloudMode', false);
			expect(loadedSettings).toHaveProperty('privacyMode', true);
			expect(loadedSettings).toHaveProperty('gdprCompliance', true);
			done();
		});
	});
	
	test('loadSettings falls back to defaults if Chrome storage fails', (done) => {
		// Mock Chrome storage to fail
		chrome.storage.sync.get.mockImplementation((keys, callback) => {
			// Simulate an error
			callback.catch(new Error('Storage error'));
		});
		
		// Mock localStorage
		const localStorageMock = (function() {
			let store = {};
			return {
				getItem: function(key) {
					return store[key] || null;
				},
				setItem: function(key, value) {
					store[key] = value.toString();
				}
			};
		})();
		Object.defineProperty(window, 'localStorage', {
			value: localStorageMock
		});
		
		loadSettings((loadedSettings) => {
			expect(loadedSettings).toHaveProperty('enabled', true);
			expect(loadedSettings).toHaveProperty('autoAccept', true);
			expect(loadedSettings).toHaveProperty('smartMode', true);
			done();
		});
	});
	
	test('isFirstVisitToday returns true for first visit', () => {
		const result = isFirstVisitToday();
		expect(result).toBe(true);
		expect(chrome.storage.local.get).toHaveBeenCalled();
	});
	
	test('isGetRequest detects GET requests', () => {
		// Mock performance API
		window.performance = {
			navigation: {
				type: 0 // 0 = direct navigation (GET)
			},
			getEntriesByType: jest.fn().mockReturnValue([
				{ type: 'navigate' }
			])
		};
		
		const result = isGetRequest();
		expect(result).toBe(true);
	});
	
	test('detectRegion identifies UK domains', () => {
		// Test .uk domain
		window.location.hostname = 'example.co.uk';
		expect(detectRegion('example.co.uk')).toBe('uk');
		
		// Test .eu domain
		window.location.hostname = 'example.eu';
		expect(detectRegion('example.eu')).toBe('uk');
		
		// Test GB language
		window.location.hostname = 'example.com';
		document.documentElement.lang = 'en-GB';
		expect(detectRegion('example.com')).toBe('uk');
		
		// Test international domain
		window.location.hostname = 'example.com';
		document.documentElement.lang = 'en-US';
		document.body.innerHTML = '<div>Regular content</div>';
		expect(detectRegion('example.com')).toBe('international');
		
		// Test GDPR keyword detection
		window.location.hostname = 'example.com';
		document.documentElement.lang = 'en-US';
		document.body.innerHTML = '<div>This site complies with GDPR regulations</div>';
		expect(detectRegion('example.com')).toBe('uk');
	});
}); 