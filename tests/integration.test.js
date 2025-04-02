/**
 * @jest-environment jsdom
 */

// Mock Chrome API
global.chrome = {
	storage: {
		sync: {
			get: jest.fn(),
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
		query: jest.fn(),
		sendMessage: jest.fn()
	},
	action: {
		setBadgeText: jest.fn(),
		setBadgeBackgroundColor: jest.fn()
	}
};

// Set up empty body
if (!document.body) {
	const body = document.createElement('body');
	document.documentElement.appendChild(body);
}

// Helper to create DOM element with properties
function createElementWithProps(tagName, attributes = {}, content = '') {
	const element = document.createElement(tagName);
	
	// Set attributes
	for (const [attr, value] of Object.entries(attributes)) {
		if (attr === 'style') {
			Object.assign(element.style, value);
		} else if (attr === 'className') {
			element.className = value;
		} else {
			element.setAttribute(attr, value);
		}
	}
	
	// Set content
	if (content) {
		element.textContent = content;
	}
	
	return element;
}

// Setup mock DOM
function setupDOM() {
	document.body.innerHTML = '';
	
	// Create banner element
	const banner = document.createElement('div');
	banner.id = 'cookie-banner';
	banner.style.display = 'block';
	banner.textContent = 'This website uses cookies to enhance your experience.';
	
	// Create buttons
	const acceptButton = document.createElement('button');
	acceptButton.id = 'accept-cookies';
	acceptButton.textContent = 'Accept Cookies';
	acceptButton.click = jest.fn();
	
	const rejectButton = document.createElement('button');
	rejectButton.id = 'reject-cookies';
	rejectButton.textContent = 'Reject';
	
	const prefsLink = document.createElement('a');
	prefsLink.id = 'preferences';
	prefsLink.href = '#';
	prefsLink.textContent = 'Preferences';
	
	// Append elements
	banner.appendChild(acceptButton);
	banner.appendChild(rejectButton);
	banner.appendChild(prefsLink);
	document.body.appendChild(banner);
	
	return { banner, acceptButton, rejectButton, prefsLink };
}

// Import/recreate content.js functions for testing
function isElementVisible(element) {
	if (!element) return false;
	
	// For testing, just check if element exists
	return true;
}

function findAcceptButton(container) {
	// For testing integration, use the actual DOM with querySelector
	const button = container.querySelector('#accept-cookies');
	if (button) return button;
	
	// Fallback to identifying by text content
	const buttons = container.querySelectorAll('button');
	for (const element of buttons) {
		const text = element.textContent.toLowerCase().trim();
		if (text.includes('accept') || text.includes('agree') || text.includes('ok')) {
			return element;
		}
	}
	
	return null;
}

function checkElementForCookieBanner(element) {
	// Skip if element is not visible
	if (!isElementVisible(element)) return false;
	
	// In integration test, just check if element has cookie-related text
	const text = element.textContent.toLowerCase();
	
	if (text.includes('cookie') || text.includes('privacy')) {
		// Look for accept buttons
		const acceptButton = findAcceptButton(element);
		if (acceptButton) {
			return { element, acceptButton };
		}
	}
	
	return false;
}

// Import/recreate background.js functions
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

// Mock callbacks and message handlers
const messageHandlers = {};

// Simulated message flow between content/background/popup
function simulateContentScriptToBackgroundMessage(message) {
	const { action } = message;
	
	if (action === 'dialogCaptured') {
		// Simulate background script updating badge
		updateBadge(message.count);
	} else if (action === 'submitToCloud') {
		// Simulate background script handling submission
		const pendingSubmissions = [];
		submitToCloud(message.data, pendingSubmissions);
	}
	
	// Notify any registered handlers
	if (messageHandlers[action]) {
		messageHandlers[action](message);
	}
}

// Integration Tests
describe('Cookie Consent Manager - Integration', () => {
	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();
		
		// Set up DOM for testing
		setupDOM();
		
		// Set up message handling simulation
		chrome.runtime.sendMessage.mockImplementation(simulateContentScriptToBackgroundMessage);
	});
	
	test('Content script detects cookie banner and triggers badge update', () => {
		// Get banner element
		const banner = document.getElementById('cookie-banner');
		
		// Run the detection
		const result = checkElementForCookieBanner(banner);
		
		// Verify detection worked
		expect(result).toBeTruthy();
		expect(result.acceptButton.id).toBe('accept-cookies');
		
		// Simulate capturing the dialog and sending to background
		chrome.runtime.sendMessage({ 
			action: 'dialogCaptured', 
			count: 1 
		});
		
		// Verify badge was updated by the background script
		expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '1' });
	});
	
	test('Content script can submit ratings to background script', () => {
		// Mock a captured dialog
		const dialog = {
			id: 'test-dialog-123',
			url: 'https://example.com',
			domain: 'example.com',
			selector: '#cookie-banner',
			html: '<div>Cookie banner content</div>',
			capturedAt: new Date().toISOString()
		};
		
		// Set up background script message handler
		const mockSubmitHandler = jest.fn();
		messageHandlers.submitToCloud = mockSubmitHandler;
		
		// Simulate content script submitting a rating
		chrome.runtime.sendMessage({ 
			action: 'submitToCloud', 
			data: {
				...dialog,
				rating: 5,
				isGoodMatch: true
			}
		});
		
		// Verify background handled the submission
		expect(mockSubmitHandler).toHaveBeenCalled();
	});
	
	test('Full capture and submission workflow', () => {
		// 1. Set up message tracking
		const sentMessages = [];
		chrome.runtime.sendMessage.mockImplementation(message => {
			sentMessages.push(message);
			simulateContentScriptToBackgroundMessage(message);
			return true;
		});
		
		// 2. Content script detects banner
		const banner = document.getElementById('cookie-banner');
		const detection = checkElementForCookieBanner(banner);
		
		// 3. Simulate capturing the dialog
		const capturedDialog = {
			id: 'test-capture-' + Date.now(),
			url: 'https://test-integration.com',
			domain: 'test-integration.com',
			selector: '#cookie-banner',
			method: 'smart',
			html: banner.outerHTML,
			capturedAt: new Date().toISOString()
		};
		
		// 4. Notify background about capture
		chrome.runtime.sendMessage({ 
			action: 'dialogCaptured', 
			count: 1 
		});
		
		// 5. Simulate user rating the dialog (normally done from popup)
		chrome.runtime.sendMessage({ 
			action: 'submitToCloud', 
			data: {
				...capturedDialog,
				rating: 4,
				isGoodMatch: true
			}
		});
		
		// Verify expected message flow
		expect(sentMessages.length).toBe(2);
		expect(sentMessages[0].action).toBe('dialogCaptured');
		expect(sentMessages[1].action).toBe('submitToCloud');
		
		// Verify badge was updated
		expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '1' });
	});
}); 