const chrome = {
	storage: {
		sync: {
			get: jest.fn(),
			set: jest.fn()
		},
		local: {
			get: jest.fn(),
			set: jest.fn()
		}
	},
	runtime: {
		onInstalled: { addListener: jest.fn() },
		onMessage: { 
			addListener: jest.fn(),
			removeListener: jest.fn()
		},
		sendMessage: jest.fn(),
		lastError: null
	},
	alarms: {
		create: jest.fn(),
		onAlarm: { addListener: jest.fn() }
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

// Mock localStorage
global.localStorage = {
	getItem: jest.fn(),
	setItem: jest.fn(),
	removeItem: jest.fn(),
	clear: jest.fn()
};

// Mock ExtPay
jest.mock('extpay', () => {
	const mockExtPay = {
		startBackground: jest.fn(),
		getUser: jest.fn().mockResolvedValue({ paid: false }),
		onPaid: { addListener: jest.fn() },
		openPaymentPage: jest.fn(),
		openTrialPage: jest.fn()
	};
	return jest.fn(() => mockExtPay);
});

// Mock the messaging module
jest.mock('../src/api/messaging.js', () => ({
	registerMessageHandlers: jest.fn((handlers) => {
		// Store handlers for testing
		global.__messageHandlers = handlers;
		return jest.fn();
	})
}));

// Mock the storage module
jest.mock('../src/modules/storage.js', () => ({
	getSettings: jest.fn(),
	saveSettings: jest.fn(),
	getDialogHistory: jest.fn(),
	saveDialogToHistory: jest.fn(),
	markDialogAsReviewed: jest.fn(),
	dataCollectionConsent: jest.fn()
}));

// Mock the cloud-api module
jest.mock('../src/api/cloud-api.js', () => ({
	submitToCloud: jest.fn(),
	checkRegionCompliance: jest.fn()
}));

// Make Chrome available globally
global.chrome = chrome;

describe('Background Script', () => {
	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();
		
		// Reset runtime lastError
		chrome.runtime.lastError = null;
		
		// Load the background script (which registers handlers)
		jest.isolateModules(() => {
			require('../background.js');
		});
	});
	
	describe('Extension Initialization', () => {
		it('sets up alarms when extension is installed', () => {
			// Get the onInstalled listener
			const onInstalledCallback = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
			
			// Mock localStorage for settings and history
			localStorage.getItem.mockImplementation((key) => {
				if (key === 'ccm_settings') return JSON.stringify({ enabled: true });
				if (key === 'ccm_history') return JSON.stringify({ dialogHistory: [] });
				return null;
			});
			
			// Call the listener
			onInstalledCallback();
			
			// Verify alarms are created
			expect(chrome.alarms.create).toHaveBeenCalledWith('cleanupVisitedDomains', { periodInMinutes: 1440 });
			expect(chrome.alarms.create).toHaveBeenCalledWith('backupSettingsAndHistory', { periodInMinutes: 10 });
			expect(chrome.alarms.create).toHaveBeenCalledWith('cleanupCapturedDialogs', { periodInMinutes: 720 });
		});
		
		it('restores settings from localStorage if available', () => {
			const testSettings = { 
				enabled: true, 
				autoAccept: false, 
				smartMode: true 
			};
			
			localStorage.getItem.mockImplementation((key) => {
				if (key === 'ccm_settings') return JSON.stringify(testSettings);
				return null;
			});
			
			// Get the onInstalled listener
			const onInstalledCallback = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
			
			// Call the listener
			onInstalledCallback();
			
			// Verify settings are restored
			expect(chrome.storage.sync.set).toHaveBeenCalledWith(testSettings);
		});
	});
	
	describe('Alarm Handling', () => {
		it('handles cleanup alarms correctly', () => {
			// Get the alarm listener
			const alarmCallback = chrome.alarms.onAlarm.addListener.mock.calls[0][0];
			
			// Create spy on the cleanup functions
			const cleanupVisitedDomainsSpy = jest.spyOn(global, 'cleanupVisitedDomains');
			const cleanupCapturedDialogsSpy = jest.spyOn(global, 'cleanupCapturedDialogs');
			const backupSettingsAndHistorySpy = jest.spyOn(global, 'backupSettingsAndHistory');
			
			// Call with different alarm types
			alarmCallback({ name: 'cleanupVisitedDomains' });
			expect(cleanupVisitedDomainsSpy).toHaveBeenCalled();
			
			alarmCallback({ name: 'cleanupCapturedDialogs' });
			expect(cleanupCapturedDialogsSpy).toHaveBeenCalled();
			
			alarmCallback({ name: 'backupSettingsAndHistory' });
			expect(backupSettingsAndHistorySpy).toHaveBeenCalled();
		});
	});
	
	describe('Message Handling', () => {
		it('registers message handlers for all expected actions', () => {
			// Check that the message handlers include all expected actions
			const handlers = global.__messageHandlers;
			
			expect(handlers).toBeDefined();
			expect(Object.keys(handlers)).toContain('settingsUpdated');
			expect(Object.keys(handlers)).toContain('dialogCaptured');
			expect(Object.keys(handlers)).toContain('getCapturedDialogCount');
			expect(Object.keys(handlers)).toContain('getDialogHistory');
			expect(Object.keys(handlers)).toContain('clearDialogHistory');
			expect(Object.keys(handlers)).toContain('markDialogAsReviewed');
			expect(Object.keys(handlers)).toContain('getSettings');
			expect(Object.keys(handlers)).toContain('checkPremiumStatus');
		});
		
		it('handles settingsUpdated message by broadcasting to tabs', async () => {
			const handlers = global.__messageHandlers;
			const testSettings = { enabled: true, autoAccept: false };
			
			// Mock the tabs query
			chrome.tabs.query.mockImplementation((query, callback) => {
				callback([{ id: 1 }, { id: 2 }]);
			});
			
			// Handle the message
			const result = handlers.settingsUpdated({ settings: testSettings });
			
			// Check that tabs.query was called
			expect(chrome.tabs.query).toHaveBeenCalled();
			
			// Check that sendMessage was called for each tab
			expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
			expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
				action: 'settingsUpdated',
				settings: testSettings
			});
			
			// Check the response
			expect(result).toEqual({ success: true });
		});
	});
	
	describe('Dialog Management', () => {
		it('stores dialog in history without duplicates', () => {
			// Mock the storage.local.get for dialogHistory
			chrome.storage.local.get.mockImplementation((key, callback) => {
				if (key[0] === 'dialogHistory') {
					callback({ dialogHistory: [
						{
							domain: 'example.com',
							buttonType: 'accept',
							capturedAt: Date.now() - 1000 // 1 second ago
						}
					]});
				}
			});
			
			// Create a new dialog that would be a duplicate
			const duplicateDialog = {
				domain: 'example.com',
				buttonType: 'accept'
			};
			
			// Call storeDialogInHistory
			global.storeDialogInHistory(duplicateDialog);
			
			// Should not set the updated history because it's a duplicate
			expect(chrome.storage.local.set).not.toHaveBeenCalled();
			
			// Now try with a unique dialog
			const uniqueDialog = {
				domain: 'example.com',
				buttonType: 'reject'
			};
			
			// Reset the mock for set
			chrome.storage.local.set.mockClear();
			
			// Call storeDialogInHistory
			global.storeDialogInHistory(uniqueDialog);
			
			// Should set the updated history
			expect(chrome.storage.local.set).toHaveBeenCalled();
			expect(chrome.storage.local.set.mock.calls[0][0].dialogHistory.length).toBe(2);
		});
	});
}); 