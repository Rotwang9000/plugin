import { jest } from '@jest/globals';

// Mock browser APIs
globalThis.chrome = {
	storage: {
		local: {
			get: jest.fn(),
			set: jest.fn()
		},
		sync: {
			get: jest.fn(),
			set: jest.fn()
		}
	},
	runtime: {
		sendMessage: jest.fn(),
		onMessage: {
			addListener: jest.fn()
		},
		getURL: jest.fn()
	},
	tabs: {
		query: jest.fn(),
		sendMessage: jest.fn(),
		update: jest.fn(),
		create: jest.fn()
	},
	extension: {
		getURL: jest.fn()
	},
	i18n: {
		getMessage: jest.fn()
	}
};

// Make Chrome globally available
global.chrome = globalThis.chrome;

// Mock window.fetch
globalThis.fetch = jest.fn();
global.fetch = globalThis.fetch;

// Create mock DOM elements that might be missing in jsdom
if (typeof document !== 'undefined' && !document.body) {
	document.body = document.createElement('body');
}

// Reset mocks between tests
beforeEach(() => {
	// Reset chrome API mocks
	Object.values(chrome).forEach(namespace => {
		Object.values(namespace).forEach(method => {
			if (jest.isMockFunction(method)) {
				method.mockReset();
			} else if (method && typeof method === 'object') {
				Object.values(method).forEach(subMethod => {
					if (jest.isMockFunction(subMethod)) {
						subMethod.mockReset();
					}
				});
			}
		});
	});

	// Reset fetch
	if (jest.isMockFunction(fetch)) {
		fetch.mockReset();
	}
}); 