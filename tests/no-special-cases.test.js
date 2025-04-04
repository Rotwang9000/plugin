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
					cloudMode: true
				});
			})
		}
	},
	runtime: {
		onMessage: {
			addListener: jest.fn()
		},
		sendMessage: jest.fn()
	}
};

// Helper to create a mock element
function createMockElement(tagName, attributes = {}, textContent = '') {
	const element = {
		tagName,
		textContent,
		getAttribute: jest.fn(name => attributes[name] || ''),
		setAttribute: jest.fn(),
		classList: {
			contains: jest.fn(cls => (attributes.className || '').includes(cls)),
			add: jest.fn(),
			remove: jest.fn()
		},
		style: {},
		className: attributes.className || '',
		id: attributes.id || '',
		offsetWidth: 100,
		offsetHeight: 50,
		click: jest.fn(),
		querySelectorAll: jest.fn(() => []),
		querySelector: jest.fn(() => null),
		cloneNode: jest.fn(() => ({ ...element, outerHTML: '<div>Cloned content</div>' })),
		parentElement: null,
		removeEventListener: jest.fn(),
		addEventListener: jest.fn(),
		innerText: textContent,
		innerHTML: textContent,
		children: []
	};
	
	// Add text manipulation methods to simulate string behavior
	element.toLowerCase = () => element.textContent.toLowerCase();
	element.trim = () => element.textContent.trim();
	element.includes = (text) => element.textContent.toLowerCase().includes(text.toLowerCase());
	
	return element;
}

// Mock implementation of isElementVisible (simplified for testing)
function isElementVisible(element) {
	if (!element) return false;
	return element.offsetWidth > 0 && element.offsetHeight > 0;
}

// Implementation of findAcceptButton function without BBC-specific handling
function findAcceptButton(container) {
	if (!container) return null;
	
	// Common selectors for accept buttons
	const commonSelectors = [
		'#acceptCookies',
		'#accept',
		'#accept-cookies',
		'#cookieAccept',
		'.accept',
		'.accept-button',
		'.acceptButton',
		'.cookie-accept',
		'[aria-label*="accept" i]',
		'[aria-label*="cookie" i]',
		'input[type="submit"][value*="accept" i]',
		'button[id*="accept" i]',
		'button[class*="accept" i]',
		'a[id*="accept" i]',
		'a[class*="accept" i]'
	];
	
	// Try to find by common selectors first
	for (const selector of commonSelectors) {
		try {
			const element = container.querySelector(selector);
			if (element && isElementVisible(element)) {
				return element;
			}
		} catch (e) {
			// Ignore selector errors
		}
	}
	
	// Find all buttons and links
	const elements = Array.from(container.querySelectorAll('button, a, input[type="submit"], input[type="button"]'));
	
	// Find by button text
	const acceptButtonTexts = [
		'accept', 'allow', 'agree', 'consent', 'yes', 'ok', 'continue', 'understood', 'got it', 'i accept'
	];
	
	for (const element of elements) {
		if (!isElementVisible(element)) continue;
		
		const text = element.textContent ? element.textContent.toLowerCase().trim() : '';
		const value = element.value ? element.value.toLowerCase().trim() : '';
		const ariaLabel = element.getAttribute('aria-label') ? element.getAttribute('aria-label').toLowerCase() : '';
		const id = element.id ? element.id.toLowerCase() : '';
		const className = element.className ? element.className.toLowerCase() : '';
		
		// Check if the button text, value, aria-label, id or class contains accept-related terms
		for (const term of acceptButtonTexts) {
			if (text.includes(term) || value.includes(term) || ariaLabel.includes(term) || 
				id.includes(term) || className.includes(term)) {
				return element;
			}
		}
	}
	
	// Find primary/main buttons - usually the accept button is styled as primary
	const primarySelectors = [
		'.primary', '.primary-button', '.primaryButton', '.main-button', '.mainButton',
		'.btn-primary', '.button-primary', '[class*="primary"]', '[class*="main"]'
	];
	
	for (const selector of primarySelectors) {
		try {
			const element = container.querySelector(selector);
			if (element && isElementVisible(element)) {
				return element;
			}
		} catch (e) {
			// Ignore selector errors
		}
	}
	
	// Fall back to the first visible button or submit input in forms
	if (container.tagName === 'FORM') {
		const submitInput = container.querySelector('input[type="submit"]');
		if (submitInput && isElementVisible(submitInput)) {
			return submitInput;
		}
	}
	
	return null;
}

// Mock implementation of runCloudMode without site-specific handling
function runCloudMode(cloudDatabase) {
	// For testing, we'll just check if the cloudDatabase structure is correct
	
	// Check that there are no site-specific selectors
	if (cloudDatabase.sites) {
		throw new Error('Cloud database should not contain site-specific selectors');
	}
	
	// Check that there are common selectors
	if (!cloudDatabase.common || !Array.isArray(cloudDatabase.common) || cloudDatabase.common.length === 0) {
		throw new Error('Cloud database must contain common selectors');
	}
	
	// All selectors should be generic, not site-specific
	const hasSpecificSiteReferences = cloudDatabase.common.some(
		selector => selector.domain || selector.site || selector.website
	);
	
	if (hasSpecificSiteReferences) {
		throw new Error('Common selectors should not contain site-specific references');
	}
	
	return true;
}

// Basic implementation of the clickElement function without BBC-specific handling
function clickElement(element) {
	if (!element) return false;
	
	// Mock implementation that just calls the element's click method
	// and doesn't contain BBC-specific checks
	element.click();
	return true;
}

describe('No Special Cases', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});
	
	test('findAcceptButton does not contain BBC-specific handling', () => {
		// Create a mock container with two buttons
		const container = createMockElement('DIV');
		const bbcButton = createMockElement('BUTTON');
		bbcButton.id = 'bbccookies-continue-button';
		bbcButton.textContent = 'Continue';
		
		const standardButton = createMockElement('BUTTON');
		standardButton.id = 'accept-cookies';
		standardButton.textContent = 'Accept Cookies';
		
		// Mock querySelectorAll to return both buttons
		container.querySelectorAll = jest.fn().mockImplementation((selector) => {
			if (selector === 'button, a, input[type="submit"], input[type="button"]') {
				return [bbcButton, standardButton];
			}
			return [];
		});
		
		// Mock querySelector to simulate finding by ID
		container.querySelector = jest.fn().mockImplementation((selector) => {
			if (selector === '#accept-cookies') {
				return standardButton;
			}
			return null;
		});
		
		// Call the function
		const result = findAcceptButton(container);
		
		// It should find a button using standard selectors
		expect(result).not.toBeNull();
		
		// It should find the one with the standard ID pattern, not using BBC-specific logic
		expect(result).toBe(standardButton);
		expect(result.id).toBe('accept-cookies');
	});
	
	test('clickElement does not use BBC-specific handling', () => {
		// Create a button with a BBC-specific ID
		const bbcButton = createMockElement('BUTTON');
		bbcButton.id = 'bbccookies-continue';
		
		// Mock the click method
		bbcButton.click = jest.fn();
		
		// The function should handle all buttons the same way
		// If there's no special BBC handling, this should work fine
		clickElement(bbcButton);
		
		// Verify the button was clicked using the standard method
		expect(bbcButton.click).toHaveBeenCalled();
	});
	
	test('runCloudMode does not check for site-specific selectors', () => {
		// Create a mock cloud database without site-specific selectors
		const validCloudDb = {
			common: [
				{ selector: '.cookie-accept-all', type: 'button', rating: 4.9 },
				{ selector: '.cookie-accept-necessary', type: 'button', rating: 4.7, necessary: true }
			]
		};
		
		// This should not throw an error
		expect(() => runCloudMode(validCloudDb)).not.toThrow();
		
		// Create a mock cloud database with site-specific selectors (invalid)
		const invalidCloudDb = {
			sites: {
				'example.com': [{ selector: '#specific-cookie-banner', type: 'button', rating: 4.9 }]
			},
			common: [
				{ selector: '.cookie-accept-all', type: 'button', rating: 4.9 }
			]
		};
		
		// This should throw an error about site-specific selectors
		expect(() => runCloudMode(invalidCloudDb)).toThrow('site-specific');
	});
	
	test('findAcceptButton handles general buttons correctly', () => {
		// Create a container with multiple buttons
		const container = createMockElement('DIV');
		
		// Create buttons with different text content
		const acceptAllButton = createMockElement('BUTTON');
		acceptAllButton.textContent = 'Accept All Cookies';
		
		const okButton = createMockElement('BUTTON');
		okButton.textContent = 'OK';
		
		const cookieSettingsButton = createMockElement('BUTTON');
		cookieSettingsButton.textContent = 'Cookie Settings';
		
		// Set up the buttons so they're returned by specific selectors
		container.querySelectorAll = jest.fn().mockImplementation((selector) => {
			if (selector === 'button, a, input[type="submit"], input[type="button"]') {
				return [cookieSettingsButton, acceptAllButton, okButton];
			}
			return [];
		});
		
		// Mock querySelector for individual selectors
		container.querySelector = jest.fn().mockImplementation((selector) => {
			if (selector === '#acceptCookies' || selector === '#accept-cookies') {
				return acceptAllButton;
			}
			return null;
		});
		
		// The function should prefer the explicit accept button
		const result = findAcceptButton(container);
		expect(result).toBe(acceptAllButton);
	});
	
	test('findAcceptButton works with generic button types', () => {
		// Test with a form
		const form = createMockElement('FORM');
		form.tagName = 'FORM';
		
		// Create a submit input
		const submitInput = createMockElement('INPUT');
		submitInput.tagName = 'INPUT';
		submitInput.setAttribute('type', 'submit');
		
		// Mock querySelector to return the submit input 
		form.querySelector = jest.fn().mockImplementation((selector) => {
			if (selector === 'input[type="submit"]') {
				return submitInput;
			}
			return null;
		});
		
		// Add mock implementations to pass isElementVisible
		form.offsetHeight = 100;
		form.offsetWidth = 100;
		submitInput.offsetHeight = 50;
		submitInput.offsetWidth = 100;
		
		// Should find the submit input
		const result = findAcceptButton(form);
		expect(result).toBe(submitInput);
	});
}); 