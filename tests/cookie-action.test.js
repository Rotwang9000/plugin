/**
 * @jest-environment jsdom
 */

// Mock Chrome API
global.chrome = {
	storage: {
		sync: {
			get: jest.fn((keys, callback) => {
				callback({
					enabled: true,
					smartMode: true,
					autoAccept: true,
					privacyMode: false,
					gdprCompliance: true
				});
			}),
			set: jest.fn()
		},
		local: {
			get: jest.fn((keys, callback) => {
				callback({
					websiteData: {
						'example.com': {
							cookieType: 'gdpr',
							acceptSelector: '#accept-cookies',
							rejectSelector: '#reject-cookies',
							lastUpdated: Date.now()
						}
					},
					statistics: {
						totalHandled: 10,
						acceptedCount: 8,
						rejectedCount: 2,
						sitesVisited: ['example.com']
					}
				});
			}),
			set: jest.fn((data, callback) => {
				if (callback) callback();
			})
		}
	},
	runtime: {
		sendMessage: jest.fn(),
		onMessage: {
			addListener: jest.fn()
		}
	}
};

// Utility Functions
function isElementVisible(element) {
	if (!element) return false;
	
	// Simple visibility check for testing
	return element.style?.display !== 'none' && 
		   element.style?.visibility !== 'hidden' && 
		   element.style?.opacity !== '0';
}

function getElementSelector(element) {
	if (!element) return '';
	
	if (element.id) {
		return `#${element.id}`;
	} else if (element.className && typeof element.className === 'string') {
		return `.${element.className.split(' ')[0]}`;
	}
	
	return element.tagName?.toLowerCase() || '';
}

function createClickEvent() {
	return new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
		view: window
	});
}

// Database Functions
function saveWebsiteData(domain, data, callback) {
	chrome.storage.local.get('websiteData', (result) => {
		const websiteData = result.websiteData || {};
		websiteData[domain] = {
			...data,
			lastUpdated: Date.now()
		};
		
		chrome.storage.local.set({ websiteData }, callback);
	});
}

function updateStatistics(domain, accepted, callback) {
	chrome.storage.local.get('statistics', (result) => {
		const statistics = result.statistics || {
			totalHandled: 0,
			acceptedCount: 0,
			rejectedCount: 0,
			sitesVisited: []
		};
		
		statistics.totalHandled++;
		
		if (accepted) {
			statistics.acceptedCount++;
		} else {
			statistics.rejectedCount++;
		}
		
		// Add the domain to the list of visited sites if not already there
		if (!statistics.sitesVisited.includes(domain)) {
			statistics.sitesVisited.push(domain);
		}
		
		chrome.storage.local.set({ statistics }, callback);
	});
}

// Action Functions
function simulateClick(element) {
	if (!element) return;
	
	const event = createClickEvent();
	element.dispatchEvent(event);
}

function acceptCookies(acceptButton, callback) {
	if (!acceptButton) {
		if (callback) callback();
		return;
	}
	
	// Simulate clicking the accept button
	simulateClick(acceptButton);
	
	// Save the button selector for future use
	const selector = getElementSelector(acceptButton);
	const domain = window.location.hostname;
	
	saveWebsiteData(domain, { acceptSelector: selector }, () => {
		updateStatistics(domain, true, callback);
	});
}

function rejectCookies(rejectButton, callback) {
	if (!rejectButton) {
		if (callback) callback();
		return;
	}
	
	// Simulate clicking the reject button
	simulateClick(rejectButton);
	
	// Save the button selector for future use
	const selector = getElementSelector(rejectButton);
	const domain = window.location.hostname;
	
	saveWebsiteData(domain, { rejectSelector: selector }, () => {
		updateStatistics(domain, false, callback);
	});
}

function handleCookieConsent(acceptButton, rejectButton, callback) {
	// Get user preferences
	chrome.storage.sync.get(['enabled', 'autoAccept', 'privacyMode'], (settings) => {
		if (!settings.enabled) {
			if (callback) callback();
			return;
		}
		
		// Decide which button to click based on settings
		if (settings.privacyMode && rejectButton) {
			// Privacy mode: Click reject button if available
			rejectCookies(rejectButton, callback);
		} else if (!settings.autoAccept && rejectButton) {
			// Auto accept disabled: Click reject button if available
			rejectCookies(rejectButton, callback);
		} else if (acceptButton) {
			// Otherwise, click accept button
			acceptCookies(acceptButton, callback);
		} else {
			// No buttons found
			if (callback) callback();
		}
	});
}

function handleDialogAutomatically(dialog, callback) {
	if (!dialog) {
		if (callback) callback();
		return;
	}
	
	// Find cookie buttons in the dialog
	const allButtons = dialog.querySelectorAll('button, a.button, input[type="button"]');
	
	let acceptButton = null;
	let rejectButton = null;
	
	// Identify accept and reject buttons
	for (const button of allButtons) {
		if (!isElementVisible(button)) continue;
		
		const text = button.textContent?.toLowerCase() || '';
		const id = button.id?.toLowerCase() || '';
		const className = button.className?.toLowerCase() || '';
		
		// Check for accept button
		if (text.includes('accept') || text.includes('agree') || text.includes('allow') || 
			id.includes('accept') || className.includes('accept')) {
			acceptButton = button;
		}
		
		// Check for reject button
		if (text.includes('reject') || text.includes('decline') || text.includes('refuse') || 
			text.includes('necessary only') || text.includes('essential only') ||
			id.includes('reject') || className.includes('reject')) {
			rejectButton = button;
		}
	}
	
	// Handle the consent
	handleCookieConsent(acceptButton, rejectButton, callback);
}

function detectAndHandleCookieConsent(callback) {
	// Common cookie dialog selectors
	const selectors = [
		'#cookie-banner', '.cookie-banner',
		'#cookie-notice', '.cookie-notice',
		'#consent-banner', '.consent-banner',
		'#gdpr-banner', '.gdpr-banner',
		'#cookie-consent', '.cookie-consent'
	];
	
	// Try to find dialog using common selectors
	let dialog = null;
	for (const selector of selectors) {
		try {
			const element = document.querySelector(selector);
			if (element && isElementVisible(element)) {
				dialog = element;
				break;
			}
		} catch (e) {
			// Ignore selector errors
		}
	}
	
	// If no dialog found by ID/class, look for elements with cookie-related text
	if (!dialog) {
		const cookieKeywords = ['cookie', 'gdpr', 'consent', 'privacy'];
		const elements = document.querySelectorAll('div, section, aside, footer');
		
		for (const element of elements) {
			if (!isElementVisible(element)) continue;
			
			const text = element.textContent?.toLowerCase() || '';
			if (cookieKeywords.some(keyword => text.includes(keyword)) && 
				element.querySelectorAll('button, a').length > 0) {
				dialog = element;
				break;
			}
		}
	}
	
	// Handle the found dialog
	if (dialog) {
		handleDialogAutomatically(dialog, callback);
	} else {
		if (callback) callback();
	}
}

// Helper to set up test DOM
function setupDOM(html) {
	document.body.innerHTML = html;
}

// Longer timeout for all tests (10 seconds)
jest.setTimeout(10000);

describe('Cookie Action', () => {
	beforeEach(() => {
		// Reset the DOM
		document.body.innerHTML = '';
		
		// Reset mocks
		jest.clearAllMocks();
		
		// Set up mock window location
		Object.defineProperty(window, 'location', {
			value: {
				hostname: 'example.com',
				href: 'https://example.com/'
			},
			writable: true
		});
	});
	
	describe('Button Clicking', () => {
		test('simulates click on element', () => {
			setupDOM('<button id="test-button">Click Me</button>');
			const button = document.getElementById('test-button');
			
			// Mock the dispatchEvent method
			button.dispatchEvent = jest.fn();
			
			simulateClick(button);
			
			expect(button.dispatchEvent).toHaveBeenCalled();
			expect(button.dispatchEvent.mock.calls[0][0] instanceof MouseEvent).toBe(true);
		});
		
		test('handles null element gracefully', () => {
			// This should not throw
			expect(() => simulateClick(null)).not.toThrow();
		});
	});
	
	describe('Accept Cookies', () => {
		test('clicks accept button and updates database', (done) => {
			setupDOM('<button id="accept-cookies">Accept Cookies</button>');
			const button = document.getElementById('accept-cookies');
			
			// Mock the dispatchEvent method
			button.dispatchEvent = jest.fn();
			
			acceptCookies(button, () => {
				expect(button.dispatchEvent).toHaveBeenCalled();
				expect(chrome.storage.local.get).toHaveBeenCalled();
				expect(chrome.storage.local.set).toHaveBeenCalled();
				
				// Check that websiteData was updated
				const lastSetCall = chrome.storage.local.set.mock.calls[0][0];
				expect(lastSetCall.websiteData['example.com']).toBeDefined();
				expect(lastSetCall.websiteData['example.com'].acceptSelector).toBe('#accept-cookies');
				
				done();
			});
		});
		
		test('tracks statistics when accepting cookies', (done) => {
			setupDOM('<button id="accept-cookies">Accept Cookies</button>');
			const button = document.getElementById('accept-cookies');
			
			button.dispatchEvent = jest.fn();
			
			acceptCookies(button, () => {
				// The second call to chrome.storage.local.set should update statistics
				const lastSetCall = chrome.storage.local.set.mock.calls[1][0];
				expect(lastSetCall.statistics).toBeDefined();
				expect(lastSetCall.statistics.acceptedCount).toBe(9); // 8 + 1
				expect(lastSetCall.statistics.totalHandled).toBe(11); // 10 + 1
				
				done();
			});
		});
		
		test('handles missing button gracefully', (done) => {
			acceptCookies(null, () => {
				expect(chrome.storage.local.set).not.toHaveBeenCalled();
				done();
			});
		});
	});
	
	describe('Reject Cookies', () => {
		test('clicks reject button and updates database', (done) => {
			setupDOM('<button id="reject-cookies">Reject Cookies</button>');
			const button = document.getElementById('reject-cookies');
			
			// Mock the dispatchEvent method
			button.dispatchEvent = jest.fn();
			
			rejectCookies(button, () => {
				expect(button.dispatchEvent).toHaveBeenCalled();
				expect(chrome.storage.local.get).toHaveBeenCalled();
				expect(chrome.storage.local.set).toHaveBeenCalled();
				
				// Check that websiteData was updated
				const lastSetCall = chrome.storage.local.set.mock.calls[0][0];
				expect(lastSetCall.websiteData['example.com']).toBeDefined();
				expect(lastSetCall.websiteData['example.com'].rejectSelector).toBe('#reject-cookies');
				
				done();
			});
		});
		
		test('tracks statistics when rejecting cookies', (done) => {
			setupDOM('<button id="reject-cookies">Reject Cookies</button>');
			const button = document.getElementById('reject-cookies');
			
			button.dispatchEvent = jest.fn();
			
			rejectCookies(button, () => {
				// The second call to chrome.storage.local.set should update statistics
				const lastSetCall = chrome.storage.local.set.mock.calls[1][0];
				expect(lastSetCall.statistics).toBeDefined();
				expect(lastSetCall.statistics.rejectedCount).toBe(3); // 2 + 1
				expect(lastSetCall.statistics.totalHandled).toBe(11); // 10 + 1
				
				done();
			});
		});
		
		test('handles missing button gracefully', (done) => {
			rejectCookies(null, () => {
				expect(chrome.storage.local.set).not.toHaveBeenCalled();
				done();
			});
		});
	});
	
	describe('Handle Cookie Consent', () => {
		test('accepts cookies when autoAccept is true', (done) => {
			setupDOM(`
				<div id="cookie-banner">
					<button id="accept-cookies">Accept Cookies</button>
					<button id="reject-cookies">Reject Cookies</button>
				</div>
			`);
			
			const acceptButton = document.getElementById('accept-cookies');
			const rejectButton = document.getElementById('reject-cookies');
			
			acceptButton.dispatchEvent = jest.fn();
			rejectButton.dispatchEvent = jest.fn();
			
			handleCookieConsent(acceptButton, rejectButton, () => {
				expect(acceptButton.dispatchEvent).toHaveBeenCalled();
				expect(rejectButton.dispatchEvent).not.toHaveBeenCalled();
				done();
			});
		});
		
		test('rejects cookies when privacyMode is true', (done) => {
			setupDOM(`
				<div id="cookie-banner">
					<button id="accept-cookies">Accept Cookies</button>
					<button id="reject-cookies">Reject Cookies</button>
				</div>
			`);
			
			const acceptButton = document.getElementById('accept-cookies');
			const rejectButton = document.getElementById('reject-cookies');
			
			acceptButton.dispatchEvent = jest.fn();
			rejectButton.dispatchEvent = jest.fn();
			
			// Override default settings to enable privacy mode
			chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
				callback({
					enabled: true,
					autoAccept: true,
					privacyMode: true
				});
			});
			
			handleCookieConsent(acceptButton, rejectButton, () => {
				expect(acceptButton.dispatchEvent).not.toHaveBeenCalled();
				expect(rejectButton.dispatchEvent).toHaveBeenCalled();
				done();
			});
		});
		
		test('rejects cookies when autoAccept is false', (done) => {
			setupDOM(`
				<div id="cookie-banner">
					<button id="accept-cookies">Accept Cookies</button>
					<button id="reject-cookies">Reject Cookies</button>
				</div>
			`);
			
			const acceptButton = document.getElementById('accept-cookies');
			const rejectButton = document.getElementById('reject-cookies');
			
			acceptButton.dispatchEvent = jest.fn();
			rejectButton.dispatchEvent = jest.fn();
			
			// Override default settings to disable auto accept
			chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
				callback({
					enabled: true,
					autoAccept: false,
					privacyMode: false
				});
			});
			
			handleCookieConsent(acceptButton, rejectButton, () => {
				expect(acceptButton.dispatchEvent).not.toHaveBeenCalled();
				expect(rejectButton.dispatchEvent).toHaveBeenCalled();
				done();
			});
		});
		
		test('falls back to accept when reject is unavailable', (done) => {
			setupDOM(`
				<div id="cookie-banner">
					<button id="accept-cookies">Accept Cookies</button>
				</div>
			`);
			
			const acceptButton = document.getElementById('accept-cookies');
			
			acceptButton.dispatchEvent = jest.fn();
			
			// Override default settings to prefer reject
			chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
				callback({
					enabled: true,
					autoAccept: false,
					privacyMode: true
				});
			});
			
			handleCookieConsent(acceptButton, null, () => {
				expect(acceptButton.dispatchEvent).toHaveBeenCalled();
				done();
			});
		});
		
		test('does nothing when extension is disabled', (done) => {
			setupDOM(`
				<div id="cookie-banner">
					<button id="accept-cookies">Accept Cookies</button>
					<button id="reject-cookies">Reject Cookies</button>
				</div>
			`);
			
			const acceptButton = document.getElementById('accept-cookies');
			const rejectButton = document.getElementById('reject-cookies');
			
			acceptButton.dispatchEvent = jest.fn();
			rejectButton.dispatchEvent = jest.fn();
			
			// Override default settings to disable extension
			chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
				callback({
					enabled: false,
					autoAccept: true,
					privacyMode: false
				});
			});
			
			handleCookieConsent(acceptButton, rejectButton, () => {
				expect(acceptButton.dispatchEvent).not.toHaveBeenCalled();
				expect(rejectButton.dispatchEvent).not.toHaveBeenCalled();
				done();
			});
		});
	});
	
	describe('Automatic Dialog Handling', () => {
		test('detects and clicks accept button automatically', (done) => {
			setupDOM(`
				<div id="cookie-banner">
					<p>This website uses cookies</p>
					<button id="accept-cookies">Accept All</button>
					<button id="reject-cookies">Reject All</button>
				</div>
			`);
			
			detectAndHandleCookieConsent(() => {
				// By default, should have clicked accept
				expect(chrome.storage.local.set).toHaveBeenCalled();
				
				// Check that the first set call has the correct website data
				const websiteDataCall = chrome.storage.local.set.mock.calls.find(
					call => call[0].websiteData
				);
				expect(websiteDataCall).toBeDefined();
				expect(websiteDataCall[0].websiteData['example.com'].acceptSelector).toBe('#accept-cookies');
				
				done();
			});
		});
		
		test('detects and clicks reject button when privacy mode is enabled', (done) => {
			setupDOM(`
				<div id="cookie-banner">
					<p>This website uses cookies</p>
					<button id="accept-cookies">Accept All</button>
					<button id="reject-cookies">Reject All</button>
				</div>
			`);
			
			// Override default settings to enable privacy mode
			chrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
				callback({
					enabled: true,
					autoAccept: true,
					privacyMode: true
				});
			});
			
			detectAndHandleCookieConsent(() => {
				// Should have clicked reject
				expect(chrome.storage.local.set).toHaveBeenCalled();
				
				// Check that the first set call has the correct website data
				const websiteDataCall = chrome.storage.local.set.mock.calls.find(
					call => call[0].websiteData
				);
				expect(websiteDataCall).toBeDefined();
				expect(websiteDataCall[0].websiteData['example.com'].rejectSelector).toBe('#reject-cookies');
				
				done();
			});
		});
		
		test('gracefully handles pages without cookie banners', (done) => {
			setupDOM(`
				<div id="content">
					<p>Regular website content</p>
				</div>
			`);
			
			detectAndHandleCookieConsent(() => {
				// Should not have made any storage updates
				expect(chrome.storage.local.set).not.toHaveBeenCalled();
				done();
			});
		});
	});
}); 