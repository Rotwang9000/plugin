/**
 * Test suite for refactored popup.js
 */

// Mock Chrome API
global.chrome = {
	storage: {
		local: {
			get: jest.fn(),
			set: jest.fn((data, callback) => callback && callback())
		}
	},
	runtime: {
		sendMessage: jest.fn()
	},
	tabs: {
		query: jest.fn(),
		create: jest.fn()
	}
};

// Mock DOM APIs
document.addEventListener = jest.fn();
document.createElement = jest.fn().mockImplementation(() => ({
	appendChild: jest.fn(),
	addEventListener: jest.fn(),
	style: {},
	classList: {
		add: jest.fn(),
		remove: jest.fn(),
		toggle: jest.fn()
	}
}));
document.querySelector = jest.fn().mockImplementation(() => ({
	classList: {
		add: jest.fn(),
		remove: jest.fn(),
		toggle: jest.fn()
	},
	addEventListener: jest.fn()
}));
document.querySelectorAll = jest.fn().mockImplementation(() => []);
document.getElementById = jest.fn().mockImplementation(() => ({
	appendChild: jest.fn(),
	addEventListener: jest.fn(),
	textContent: '',
	className: '',
	checked: false,
	value: '',
	innerHTML: ''
}));

// Mock modules
jest.mock('../src/ui/settings-ui.js');
jest.mock('../src/ui/history-ui.js');
jest.mock('../src/ui/dialog-display.js');
jest.mock('../src/ui/stats-ui.js');
jest.mock('../src/modules/html-utils.js');
jest.mock('../src/modules/dom-utils.js');
jest.mock('../src/modules/storage.js');
jest.mock('../src/detection/smart-detection.js');
jest.mock('../src/api/messaging.js');
jest.mock('../src/api/cloud-api.js');

// Import mocked modules
const { loadSettings, initTabNavigation, initSettingsControls } = require('../src/ui/settings-ui.js');
const { displayAllDialogs } = require('../src/ui/history-ui.js');
const { displayDetectionStatus } = require('../src/ui/dialog-display.js');
const { createElement } = require('../src/modules/dom-utils.js');

// Test cases
describe('Popup.js', () => {
	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();
		
		// Mock DOM event listeners
		document.dispatchEvent = jest.fn();
		
		// Mock settings
		loadSettings.mockImplementation(callback => {
			callback({
				enabled: true,
				smartMode: true,
				cloudMode: true,
				autoAccept: true,
				privacyMode: true,
				gdprCompliance: true,
				devMode: false
			});
		});
		
		// Load popup.js (we need to use require here to ensure it runs after mocks)
		require('../popup.js');
	});
	
	test('initializes tabs on DOM content loaded', () => {
		// Find the callback function that was passed to addEventListener
		const domContentLoadedCallback = document.addEventListener.mock.calls.find(
			call => call[0] === 'DOMContentLoaded'
		)[1];
		
		// Execute the callback
		domContentLoadedCallback();
		
		// Verify tab navigation was initialized
		expect(initTabNavigation).toHaveBeenCalled();
	});
	
	test('loads settings and initializes UI', () => {
		// Find the callback function that was passed to addEventListener
		const domContentLoadedCallback = document.addEventListener.mock.calls.find(
			call => call[0] === 'DOMContentLoaded'
		)[1];
		
		// Execute the callback
		domContentLoadedCallback();
		
		// Verify settings were loaded
		expect(loadSettings).toHaveBeenCalled();
		
		// Verify settings controls were initialized
		expect(initSettingsControls).toHaveBeenCalled();
	});
	
	test('responds to history tab shown events', () => {
		// Find the callback function that was passed to addEventListener
		const domContentLoadedCallback = document.addEventListener.mock.calls.find(
			call => call[0] === 'DOMContentLoaded'
		)[1];
		
		// Execute the callback
		domContentLoadedCallback();
		
		// Find the history tab event listener
		const historyTabCallback = document.addEventListener.mock.calls.find(
			call => call[0] === 'history-tab-shown'
		)[1];
		
		// Verify history tab event listener was registered
		expect(historyTabCallback).toBeDefined();
	});
	
	test('renders detection status with displayDetectionStatus', () => {
		// Mock chrome.tabs.query to return some tabs
		chrome.tabs.query.mockImplementation((query, callback) => {
			callback([{ url: 'https://example.com' }]);
		});
		
		// Mock sendMessageToActiveTab callback
		const mockSendMessage = require('../src/api/messaging.js').sendMessageToActiveTab;
		mockSendMessage.mockImplementation((message, callback) => {
			if (message.action === 'getCapturedDialogs') {
				callback({ dialogs: [{ id: '123' }] });
			}
		});
		
		// Find the callback function that was passed to addEventListener
		const domContentLoadedCallback = document.addEventListener.mock.calls.find(
			call => call[0] === 'DOMContentLoaded'
		)[1];
		
		// Execute the callback
		domContentLoadedCallback();
		
		// The updateCookieDetectionStatus function should be called and eventually call displayDetectionStatus
		expect(displayDetectionStatus).toHaveBeenCalled();
	});
}); 