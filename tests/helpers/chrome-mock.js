/**
 * Chrome API mock utilities for testing
 * Provides mock implementations of Chrome Extension APIs
 */
import { jest } from '@jest/globals';

/**
 * Create a mock of the Chrome storage API
 * @param {Object} initialData - Initial data to populate storage with
 * @returns {Object} - Mocked storage API
 */
export function createMockStorage(initialData = {}) {
	const storage = {
		local: {
			data: { ...initialData },
			get: jest.fn((keys, callback) => {
				// Handle different key formats
				if (typeof keys === 'string') {
					callback({ [keys]: storage.local.data[keys] });
				} else if (Array.isArray(keys)) {
					const result = {};
					keys.forEach(key => {
						result[key] = storage.local.data[key];
					});
					callback(result);
				} else if (keys && typeof keys === 'object') {
					// Handle object with default values
					const result = {};
					Object.keys(keys).forEach(key => {
						result[key] = storage.local.data[key] !== undefined ? 
							storage.local.data[key] : keys[key];
					});
					callback(result);
				} else {
					// No keys provided, return everything
					callback({ ...storage.local.data });
				}
				return Promise.resolve({ ...storage.local.data });
			}),
			set: jest.fn((items, callback) => {
				Object.assign(storage.local.data, items);
				if (callback) callback();
				return Promise.resolve();
			}),
			remove: jest.fn((keys, callback) => {
				if (typeof keys === 'string') {
					delete storage.local.data[keys];
				} else if (Array.isArray(keys)) {
					keys.forEach(key => delete storage.local.data[key]);
				}
				if (callback) callback();
				return Promise.resolve();
			}),
			clear: jest.fn((callback) => {
				storage.local.data = {};
				if (callback) callback();
				return Promise.resolve();
			})
		},
		sync: {
			data: { ...initialData },
			get: jest.fn((keys, callback) => {
				// Handle different key formats
				if (typeof keys === 'string') {
					callback({ [keys]: storage.sync.data[keys] });
				} else if (Array.isArray(keys)) {
					const result = {};
					keys.forEach(key => {
						result[key] = storage.sync.data[key];
					});
					callback(result);
				} else if (keys && typeof keys === 'object') {
					// Handle object with default values
					const result = {};
					Object.keys(keys).forEach(key => {
						result[key] = storage.sync.data[key] !== undefined ? 
							storage.sync.data[key] : keys[key];
					});
					callback(result);
				} else {
					// No keys provided, return everything
					callback({ ...storage.sync.data });
				}
				return Promise.resolve({ ...storage.sync.data });
			}),
			set: jest.fn((items, callback) => {
				Object.assign(storage.sync.data, items);
				if (callback) callback();
				return Promise.resolve();
			}),
			remove: jest.fn((keys, callback) => {
				if (typeof keys === 'string') {
					delete storage.sync.data[keys];
				} else if (Array.isArray(keys)) {
					keys.forEach(key => delete storage.sync.data[key]);
				}
				if (callback) callback();
				return Promise.resolve();
			}),
			clear: jest.fn((callback) => {
				storage.sync.data = {};
				if (callback) callback();
				return Promise.resolve();
			})
		}
	};
	
	return storage;
}

/**
 * Create a mock of the Chrome runtime API
 * @returns {Object} - Mocked runtime API
 */
export function createMockRuntime() {
	const messageListeners = [];
	
	return {
		sendMessage: jest.fn((message, callback) => {
			// Simulates sending a message and immediately calling any registered listeners
			messageListeners.forEach(listener => {
				try {
					listener(message, {}, callback || (() => {}));
				} catch (e) {
					console.error('Error in message listener:', e);
				}
			});
			return Promise.resolve();
		}),
		onMessage: {
			addListener: jest.fn((listener) => {
				messageListeners.push(listener);
			}),
			removeListener: jest.fn((listener) => {
				const index = messageListeners.indexOf(listener);
				if (index > -1) {
					messageListeners.splice(index, 1);
				}
			}),
			hasListener: jest.fn((listener) => {
				return messageListeners.includes(listener);
			})
		},
		getURL: jest.fn((path) => {
			return `chrome-extension://mockid/${path}`;
		}),
		getManifest: jest.fn(() => ({
			version: '1.0.0',
			name: 'Cookie Consent Manager (Mock)'
		}))
	};
}

/**
 * Create a mock of the Chrome tabs API
 * @returns {Object} - Mocked tabs API
 */
export function createMockTabs() {
	let tabId = 1;
	const tabs = [{
		id: tabId,
		url: 'https://example.com',
		title: 'Example Website',
		active: true,
		windowId: 1
	}];
	
	return {
		query: jest.fn((queryInfo, callback) => {
			let results = [...tabs];
			
			if (queryInfo.active === true) {
				results = results.filter(tab => tab.active);
			}
			
			if (queryInfo.currentWindow === true) {
				results = results.filter(tab => tab.windowId === 1);
			}
			
			if (queryInfo.url) {
				if (Array.isArray(queryInfo.url)) {
					results = results.filter(tab => queryInfo.url.some(pattern => 
						new RegExp(pattern.replace(/\*/g, '.*')).test(tab.url)
					));
				} else {
					const pattern = queryInfo.url.replace(/\*/g, '.*');
					results = results.filter(tab => new RegExp(pattern).test(tab.url));
				}
			}
			
			callback(results);
			return Promise.resolve(results);
		}),
		sendMessage: jest.fn((tabId, message, callback) => {
			if (callback) callback();
			return Promise.resolve();
		}),
		create: jest.fn((createProperties, callback) => {
			const newTab = {
				id: ++tabId,
				url: createProperties.url || 'https://newtab.example.com',
				title: 'New Tab',
				active: createProperties.active !== false,
				windowId: 1
			};
			
			tabs.push(newTab);
			
			if (callback) callback(newTab);
			return Promise.resolve(newTab);
		}),
		update: jest.fn((tabId, updateProperties, callback) => {
			const tabIndex = tabs.findIndex(tab => tab.id === tabId);
			
			if (tabIndex !== -1) {
				tabs[tabIndex] = { ...tabs[tabIndex], ...updateProperties };
				
				if (callback) callback(tabs[tabIndex]);
				return Promise.resolve(tabs[tabIndex]);
			}
			
			if (callback) callback(null);
			return Promise.resolve(null);
		})
	};
}

/**
 * Create a complete mock of the Chrome API
 * @param {Object} initialStorageData - Initial data for chrome.storage
 * @returns {Object} - Complete mocked Chrome API
 */
export function createMockChromeAPI(initialStorageData = {}) {
	return {
		storage: createMockStorage(initialStorageData),
		runtime: createMockRuntime(),
		tabs: createMockTabs(),
		extension: {
			getURL: jest.fn((path) => {
				return `chrome-extension://mockid/${path}`;
			})
		},
		i18n: {
			getMessage: jest.fn((messageName, substitutions) => {
				// Simple mock that just returns the message name
				if (substitutions) {
					return `${messageName} ${substitutions.join(' ')}`;
				}
				return messageName;
			})
		}
	};
}

/**
 * Setup the global chrome API mock
 * @param {Object} initialStorageData - Initial data for chrome.storage
 * @returns {Object} - The mocked Chrome API
 */
export function setupChromeApiMock(initialStorageData = {}) {
	const mockChrome = createMockChromeAPI(initialStorageData);
	global.chrome = mockChrome;
	
	return mockChrome;
}

/**
 * Reset all Jest mocks in the Chrome API
 */
export function resetChromeApiMocks() {
	if (!global.chrome) return;
	
	// Reset all mock functions in the Chrome API
	Object.values(global.chrome).forEach(namespace => {
		if (!namespace) return;
		
		Object.entries(namespace).forEach(([key, value]) => {
			if (jest.isMockFunction(value)) {
				value.mockReset();
			} else if (value && typeof value === 'object') {
				Object.values(value).forEach(subValue => {
					if (jest.isMockFunction(subValue)) {
						subValue.mockReset();
					}
				});
			}
		});
	});
} 