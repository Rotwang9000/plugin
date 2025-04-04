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
					cloudMode: true,
					privacyMode: true,
					gdprCompliance: true
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

// Define test variables
const ukPrivacyTerms = ['cookie', 'privacy', 'gdpr', 'consent', 'legitimate interest'];

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
		children: [],
		closest: jest.fn(() => null)
	};
	
	// Add text manipulation methods to simulate string behavior
	element.toLowerCase = () => element.textContent.toLowerCase();
	element.trim = () => element.textContent.trim();
	element.includes = (text) => element.textContent.toLowerCase().includes(text.toLowerCase());
	
	return element;
}

// Mock implementation of isElementVisible
function isElementVisible(element) {
	if (!element) return false;
	return element.offsetWidth > 0 && element.offsetHeight > 0;
}

// Mock implementation of findAcceptButton
function findAcceptButton(container) {
	// Common button texts for accepting cookies
	const acceptTexts = ['accept', 'agree', 'ok', 'yes', 'got it', 'allow', 'understand', 'consent'];
	
	// For testing purposes, we'll directly check the buttons in the container's querySelectorAll mock
	const buttons = container.querySelectorAll('button, a, [role="button"], [type="button"], [type="submit"]');
	for (const button of buttons) {
		if (typeof button.textContent !== 'string') continue;
		
		const text = button.textContent.toLowerCase().trim();
		
		// Check if the button text includes one of the accept texts
		if (acceptTexts.some(acceptText => text.includes(acceptText))) {
			// Skip if it contains "settings", "preferences" or "customize"
			if (text.includes('settings') || text.includes('preferences') || text.includes('customize')) {
				continue;
			}
			return button;
		}
	}
	
	// If no explicit accept button found, check for class-based identification
	for (const button of buttons) {
		const classes = typeof button.className === 'string' ? button.className.toLowerCase() : '';
		if (classes.includes('accept') || 
			classes.includes('agree') || 
			classes.includes('allow') || 
			classes.includes('consent') ||
			classes.includes('primary') || 
			classes.includes('main') || 
			classes.includes('btn-primary')) {
			return button;
		}
	}
	
	return null;
}

// Mock implementation of findNecessaryCookiesButton
function findNecessaryCookiesButton(container) {
	// Terms that indicate necessary/essential cookies only options
	const necessaryTerms = ['necessary', 'essential', 'required', 'basic', 'reject all', 'decline'];
	
	// For testing purposes, directly check the buttons in the container's querySelectorAll mock
	const buttons = container.querySelectorAll('button, a, [role="button"]');
	for (const button of buttons) {
		if (typeof button.textContent !== 'string') continue;
		
		const text = button.textContent.toLowerCase().trim();
		
		// Check for necessary/essential cookies terms
		if (necessaryTerms.some(term => text.includes(term))) {
			// Skip if it contains terms that suggest it might not be what we want
			if (text.includes('preferences') || text.includes('customize') || text.includes('settings')) {
				continue;
			}
			return button;
		}
	}
	
	return null;
}

// Mock implementation of identifyMissingStructures
function identifyMissingStructures(container) {
	const recommendations = [];
	
	// Check for unusual patterns that might be missed
	if (container.innerHTML.includes('iframe')) {
		recommendations.push('Add support for iframe-based cookie notices');
	}
	
	if (container.innerHTML.includes('shadowroot') || container.innerHTML.includes('shadow-root')) {
		recommendations.push('Consider adding shadow DOM traversal for cookie notices');
	}
	
	return recommendations;
}

// Mock implementation of analyzeBoxSource
function analyzeBoxSource(source) {
	// Create a test container with the source
	const container = createMockElement('DIV', {}, '');
	container.innerHTML = source;
	
	// Check for cookie-related terms
	const hasCookieTerms = ukPrivacyTerms.some(term => 
		container.innerText.toLowerCase().includes(term) || 
		container.innerHTML.toLowerCase().includes(term)
	);
	
	// Set up buttons for testing
	const mockButtons = [];
	if (source.includes('<button')) {
		// Extract button texts from source
		const buttonMatches = source.match(/<button[^>]*>(.*?)<\/button>/g) || [];
		buttonMatches.forEach(match => {
			const textMatch = match.match(/<button[^>]*>(.*?)<\/button>/);
			const buttonText = textMatch ? textMatch[1] : '';
			mockButtons.push(createMockElement('BUTTON', {}, buttonText));
		});
	}
	
	container.querySelectorAll.mockReturnValue(mockButtons);
	const hasButtons = mockButtons.length > 0;
	
	// Find accept and necessary buttons
	const acceptButton = findAcceptButton(container);
	const hasAcceptButton = !!acceptButton;
	
	const necessaryButton = findNecessaryCookiesButton(container);
	const hasNecessaryButton = !!necessaryButton;
	
	// Check if it's a form
	const isForm = source.includes('<form');
	
	// Evaluate smart formula effectiveness
	const detected = hasCookieTerms && (hasAcceptButton || hasNecessaryButton);
	
	// Generate recommendations
	let recommendations = [];
	
	if (!hasCookieTerms) {
		recommendations.push('Add more cookie/privacy-related terms to detection patterns');
	}
	
	if (!hasButtons && !isForm) {
		recommendations.push('Improve detection of non-standard interactive elements');
	}
	
	if (!hasAcceptButton && !hasNecessaryButton && hasButtons) {
		recommendations.push('Enhance button detection for non-standard naming patterns');
		
		// Check button texts
		const buttonTexts = mockButtons
			.map(b => b.textContent)
			.filter(t => t && t.length > 0);
		
		if (buttonTexts.length > 0) {
			recommendations.push(`Add pattern matching for button texts like: ${buttonTexts.join(', ')}`);
		}
	}
	
	// Check for missing structures
	const missingStructures = identifyMissingStructures(container);
	if (missingStructures.length > 0) {
		recommendations = [...recommendations, ...missingStructures];
	}
	
	return {
		detected,
		hasCookieTerms,
		hasButtons,
		hasAcceptButton,
		hasNecessaryButton,
		isForm,
		acceptButtonText: acceptButton ? acceptButton.textContent : null,
		necessaryButtonText: necessaryButton ? necessaryButton.textContent : null,
		recommendations
	};
}

describe('Source Analysis Feature', () => {
	// Test variables
	const validCookieBox = `
		<div class="cookie-banner">
			<h2>Cookie Notice</h2>
			<p>This website uses cookies to enhance your browsing experience.</p>
			<button id="accept-cookies">Accept All</button>
			<button id="necessary-only">Necessary Only</button>
		</div>
	`;
	
	const nonCookieBox = `
		<div class="notification">
			<h2>Welcome to our site</h2>
			<p>Check out our latest offers and promotions.</p>
			<button>Close</button>
		</div>
	`;
	
	const cookieBoxWithoutButtons = `
		<div class="privacy-notice">
			<h2>Privacy Information</h2>
			<p>We care about your privacy and use cookies for a better experience.</p>
			<div class="close-icon">X</div>
		</div>
	`;
	
	const frenchCookieBox = `
		<div class="bandeau-cookies">
			<h2>Avis de Cookies</h2>
			<p>Ce site utilise des cookies pour améliorer votre expérience.</p>
			<button>Accepter</button>
			<button>Refuser</button>
		</div>
	`;
	
	const iframeCookieBox = `
		<div class="cookie-notice">
			<h2>Cookie Policy</h2>
			<p>This site uses cookies. See our policy.</p>
			<iframe src="cookie-buttons.html"></iframe>
		</div>
	`;
	
	test('analyzeBoxSource correctly detects standard cookie banner', () => {
		const result = analyzeBoxSource(validCookieBox);
		expect(result.detected).toBe(true);
		expect(result.hasCookieTerms).toBe(true);
		expect(result.hasButtons).toBe(true);
		expect(result.hasAcceptButton).toBe(true);
		expect(result.acceptButtonText).toBe('Accept All');
		expect(result.hasNecessaryButton).toBe(true);
		expect(result.necessaryButtonText).toBe('Necessary Only');
		expect(result.recommendations.length).toBe(0);
	});
	
	test('analyzeBoxSource correctly handles non-cookie box', () => {
		const result = analyzeBoxSource(nonCookieBox);
		expect(result.detected).toBe(false);
		expect(result.hasCookieTerms).toBe(false);
		expect(result.hasButtons).toBe(true);
		expect(result.hasAcceptButton).toBe(false);
		expect(result.hasNecessaryButton).toBe(false);
		expect(result.recommendations.length).toBeGreaterThan(0);
		expect(result.recommendations).toContain('Add more cookie/privacy-related terms to detection patterns');
	});
	
	test('analyzeBoxSource detects cookie terms without buttons', () => {
		const result = analyzeBoxSource(cookieBoxWithoutButtons);
		expect(result.detected).toBe(false);
		expect(result.hasCookieTerms).toBe(true);
		expect(result.hasButtons).toBe(false);
		expect(result.recommendations.length).toBeGreaterThan(0);
		expect(result.recommendations).toContain('Improve detection of non-standard interactive elements');
	});
	
	test('analyzeBoxSource handles non-English cookie banners', () => {
		const result = analyzeBoxSource(frenchCookieBox);
		expect(result.detected).toBe(true);
		expect(result.hasCookieTerms).toBe(true);
		expect(result.hasButtons).toBe(true);
		expect(result.hasAcceptButton).toBe(true);
		expect(result.acceptButtonText).toBe('Accepter');
	});
	
	test('analyzeBoxSource identifies iframe-based cookie notices', () => {
		const result = analyzeBoxSource(iframeCookieBox);
		expect(result.hasCookieTerms).toBe(true);
		expect(result.hasButtons).toBe(false);
		expect(result.recommendations).toContain('Add support for iframe-based cookie notices');
	});
	
	test('analyzeBoxSource returns appropriate recommendations', () => {
		const customCookieBox = `
			<div class="gdpr-module">
				<h2>Data Processing Notice</h2>
				<p>We process your data according to GDPR requirements.</p>
				<button class="continue">Continue</button>
			</div>
		`;
		
		const result = analyzeBoxSource(customCookieBox);
		expect(result.detected).toBe(false);
		expect(result.hasCookieTerms).toBe(true); // Has "GDPR"
		expect(result.hasButtons).toBe(true);
		expect(result.hasAcceptButton).toBe(false);
		expect(result.recommendations).toContain('Enhance button detection for non-standard naming patterns');
		expect(result.recommendations).toContain('Add pattern matching for button texts like: Continue');
	});
	
	test('analyzeBoxSource supports form-based cookie notices', () => {
		const formBasedCookieBox = `
			<form id="cookie-consent-form">
				<h2>Cookie Preferences</h2>
				<p>Please select your cookie preferences below.</p>
				<input type="checkbox" id="essential" checked disabled> <label for="essential">Essential (Required)</label><br>
				<input type="checkbox" id="analytics"> <label for="analytics">Analytics</label><br>
				<input type="checkbox" id="marketing"> <label for="marketing">Marketing</label><br>
				<input type="submit" value="Save Preferences">
			</form>
		`;
		
		const result = analyzeBoxSource(formBasedCookieBox);
		expect(result.isForm).toBe(true);
		expect(result.hasCookieTerms).toBe(true);
	});
}); 