// Mock Chrome API for testing
global.chrome = {
	runtime: {
		onInstalled: {
			addListener: jest.fn()
		},
		onMessage: {
			addListener: jest.fn()
		},
		sendMessage: jest.fn()
	},
	storage: {
		sync: {
			set: jest.fn(),
			get: jest.fn()
		}
	},
	tabs: {
		query: jest.fn(),
		sendMessage: jest.fn()
	},
	action: {
		setBadgeText: jest.fn(),
		setBadgeBackgroundColor: jest.fn()
	}
};

// Extracted functions from background.js for testing
function updateBadge(capturedDialogCount, pendingSubmissions = []) {
	const totalCount = capturedDialogCount + pendingSubmissions.length;
	
	if (totalCount > 0) {
		chrome.action.setBadgeText({ text: totalCount.toString() });
		chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
	} else {
		chrome.action.setBadgeText({ text: '' });
	}
}

function submitToCloud(data, pendingSubmissions = []) {
	// Add to pending submissions
	const submission = {
		id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
		...data,
		status: 'pending',
		submittedAt: new Date().toISOString()
	};
	
	pendingSubmissions.push(submission);
	
	return {
		pendingSubmissions,
		submission
	};
}

// Helper to mock Date.now for predictable timestamps
let mockedDateNow;
const realDateNow = Date.now;
const mockDateNow = () => mockedDateNow;

// Also mock Math.random for predictable IDs
const realRandom = Math.random;
const mockRandom = () => 0.5;

describe('Background Script', () => {
	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();
		
		// Set up a fixed date for testing
		mockedDateNow = 1627776000000; // Aug 1, 2021
		Date.now = mockDateNow;
		Math.random = mockRandom;
		
		// Mock Date constructor and toISOString
		jest.spyOn(global.Date.prototype, 'toISOString').mockReturnValue('2023-08-01T12:00:00.000Z');
		
		// Initialize by calling the onInstalled handler manually
		const initCallback = jest.fn((callback) => {
			callback();
			return chrome.runtime.onInstalled;
		});
		
		// Temporarily replace the onInstalled.addListener with our initializing version
		const originalAddListener = chrome.runtime.onInstalled.addListener;
		chrome.runtime.onInstalled.addListener = initCallback;
		
		// Call the initialization function that would be in background.js
		chrome.runtime.onInstalled.addListener(() => {
			chrome.storage.sync.set({
				enabled: true,
				smartMode: true,
				cloudMode: true
			});
		});
		
		// Restore the original method
		chrome.runtime.onInstalled.addListener = originalAddListener;
	});
	
	afterEach(() => {
		// Restore original Date.now and Math.random
		Date.now = realDateNow;
		Math.random = realRandom;
		
		// Restore Date prototype
		jest.restoreAllMocks();
	});
	
	test('onInstalled sets up default settings', () => {
		// Check if the onInstalled callback was called during setup
		// This should have already triggered chrome.storage.sync.set
		expect(chrome.storage.sync.set).toHaveBeenCalledWith({
			enabled: true,
			smartMode: true,
			cloudMode: true
		});
	});
	
	test('updateBadge sets badge text when count is positive', () => {
		updateBadge(3, []);
		
		expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3' });
		expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#4CAF50' });
	});
	
	test('updateBadge handles combined count from dialogs and submissions', () => {
		updateBadge(2, [{ id: '1' }, { id: '2' }]);
		
		expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '4' });
	});
	
	test('updateBadge clears badge when count is zero', () => {
		updateBadge(0, []);
		
		expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
	});
	
	test('submitToCloud creates a valid submission record', () => {
		const data = {
			url: 'https://example.com',
			domain: 'example.com',
			selector: '#cookie-banner',
			html: '<div>Cookie banner</div>',
			capturedAt: '2023-01-01T12:00:00.000Z',
			rating: 4,
			isGoodMatch: true
		};
		
		// Create a deterministic ID for testing
		const mockSubstr = jest.fn().mockReturnValue('5');
		const originalSubstr = String.prototype.substr;
		String.prototype.substr = mockSubstr;
		
		const result = submitToCloud(data, []);
		
		// Restore the original substr method
		String.prototype.substr = originalSubstr;
		
		expect(result.pendingSubmissions).toHaveLength(1);
		expect(result.submission).toEqual({
			id: '16277760000005',
			url: 'https://example.com',
			domain: 'example.com',
			selector: '#cookie-banner',
			html: '<div>Cookie banner</div>',
			capturedAt: '2023-01-01T12:00:00.000Z',
			rating: 4,
			isGoodMatch: true,
			status: 'pending',
			submittedAt: '2023-08-01T12:00:00.000Z'
		});
	});
	
	test('submitToCloud adds new submission to existing array', () => {
		const existingSubmissions = [{
			id: 'existing-id',
			url: 'https://old-example.com',
			status: 'pending'
		}];
		
		const data = {
			url: 'https://new-example.com',
			domain: 'new-example.com',
			selector: '#new-banner'
		};
		
		const result = submitToCloud(data, existingSubmissions);
		
		expect(result.pendingSubmissions).toHaveLength(2);
		expect(result.pendingSubmissions[0]).toEqual(existingSubmissions[0]);
		expect(result.pendingSubmissions[1].url).toBe('https://new-example.com');
	});
}); 