// Configuration
let settings = {
	enabled: true,
	autoAccept: true,
	smartMode: true,
	cloudMode: true,
	privacyMode: true,  // New privacy setting to control data collection
	gdprCompliance: true // UK/EU GDPR compliance mode
};

// Cloud database mock - in a real implementation, this would be fetched from a server
const cloudDatabase = {
	// Site-specific selectors keyed by domain
	sites: {
		'example.com': [
			{ selector: '#specific-cookie-banner', type: 'button', rating: 4.9 }
		],
		'google.com': [
			{ selector: '.cookieBarButton', type: 'button', rating: 4.8 }
		]
	},
	// Common selectors that work across many sites
	common: [
		// UK/EU specific cookie consent patterns
		{ 
			selector: '.cookie-accept-all', 
			type: 'button', 
			patternId: 'uk-cookie-notice', 
			rating: 4.9,
			region: 'uk',
			signature: {
				classPatterns: ['cookie-', 'accept'],
				structure: 'div > .cookie-accept-all'
			}
		},
		{ 
			selector: '.cookie-accept-necessary', 
			type: 'button', 
			patternId: 'uk-cookie-necessary', 
			rating: 4.7,
			region: 'uk',
			necessary: true // Marks this as a "necessary cookies only" option
		},
		// Google's common cookie consent pattern
		{ 
			selector: '.fc-cta-consent', 
			type: 'button', 
			patternId: 'google-consent', 
			rating: 4.9,
			signature: {
				// HTML pattern signatures to recognize similar banners across sites
				classPatterns: ['fc-', 'consent'],
				structure: 'div > div > button.fc-cta-consent'
			}
		},
		// Other common cookie consent selectors
		{ selector: '#onetrust-accept-btn-handler', type: 'button', rating: 4.7 },
		{ selector: '.cc-accept-all', type: 'button', rating: 4.5 },
		{ selector: '.js-accept-cookies', type: 'button', rating: 4.3 },
		{ selector: '#accept-cookies', type: 'button', rating: 4.6 },
		{ selector: '.consent-banner__button--primary', type: 'button', rating: 4.4 },
		{ selector: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', type: 'button', rating: 4.8 },
		{ selector: '.cookieConsent__accept-btn', type: 'button', rating: 4.5 },
		{ selector: '[data-testid="cookie-policy-manage-dialog-accept-button"]', type: 'button', rating: 4.7 }
	]
};

// UK cookie law terms to check for (broader than just "cookie")
const ukPrivacyTerms = [
	'cookie', 'gdpr', 'privacy', 'data protection', 'personal data', 
	'information commissioner', 'ico', 'legitimate interest', 'consent',
	'cookies', 'similar technologies', 'web beacons', 'storage access'
];

// Store captured dialogs
let capturedDialogs = [];

// Domain visit tracking (for first visit detection)
const visitedDomains = new Set();

// Track data collection consent
let dataCollectionConsent = false;

// Check if this is first visit to the domain today
function isFirstVisitToday() {
	const domain = window.location.hostname;
	const storageKey = `visited_${domain}_${new Date().toDateString()}`;
	
	// Check if we've seen this domain today
	if (visitedDomains.has(storageKey)) {
		return false;
	}
	
	// Check local storage for persistence across browser sessions
	chrome.storage.local.get([storageKey], (result) => {
		if (!result[storageKey]) {
			// First visit today - mark domain as visited
			chrome.storage.local.set({ [storageKey]: true });
		}
	});
	
	// Mark as visited for this session
	visitedDomains.add(storageKey);
	
	return true;
}

// Check if we're on a GET request page (not POST)
function isGetRequest() {
	// If there's no history or this is the first page in history, likely direct navigation (GET)
	if (!window.performance || !window.performance.navigation) {
		return true;
	}
	
	// Check navigation type - 0 is TYPE_NAVIGATE (direct navigation or GET)
	return window.performance.navigation.type === 0;
}

// Load settings
chrome.storage.sync.get({
	enabled: true,
	autoAccept: true,
	smartMode: true,
	cloudMode: true,
	privacyMode: true,
	gdprCompliance: true
}, (loadedSettings) => {
	settings = loadedSettings;
	if (settings.enabled) {
		initCookieConsentManager();
	}
});

// Check data collection consent status
chrome.storage.local.get('dataCollectionConsent', (result) => {
	dataCollectionConsent = result.dataCollectionConsent || false;
});

// Listen for settings changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'settingsUpdated') {
		settings = message.settings;
		// If just enabled, try to find and accept cookie warnings
		if (settings.enabled) {
			initCookieConsentManager();
		}
	} else if (message.action === 'getCapturedDialogs') {
		sendResponse({ dialogs: capturedDialogs });
		return true;
	} else if (message.action === 'submitDialogRating') {
		// Handle dialog rating submission
		const { dialogId, rating, isGoodMatch } = message.data;
		const dialog = capturedDialogs.find(d => d.id === dialogId);
		
		if (dialog) {
			// Ensure we have consent before submitting to cloud
			if (dataCollectionConsent) {
				// Send to background script for cloud submission
				chrome.runtime.sendMessage({ 
					action: 'submitToCloud', 
					data: {
						url: window.location.href,
						domain: window.location.hostname,
						selector: dialog.selector,
						buttonType: dialog.buttonType,
						buttonText: dialog.buttonText,
						html: dialog.html,
						capturedAt: dialog.capturedAt,
						rating,
						isGoodMatch,
						region: detectRegion(window.location.hostname)
					}
				});
			} else {
				console.log('Cookie Consent Manager: Data collection consent not given, not submitting to cloud');
			}
			
			// Remove from local captured list after review
			capturedDialogs = capturedDialogs.filter(d => d.id !== dialogId);
			sendResponse({ success: true });
		} else {
			sendResponse({ success: false, error: 'Dialog not found' });
		}
		return true;
	} else if (message.action === 'setDataCollectionConsent') {
		dataCollectionConsent = message.consent;
		chrome.storage.local.set({ dataCollectionConsent });
		sendResponse({ success: true });
		return true;
	} else if (message.action === 'getDataCollectionConsent') {
		sendResponse({ consent: dataCollectionConsent });
		return true;
	} else if (message.action === 'simulateButtonClick') {
		// Handle button click simulation
		const { buttonText, selector } = message;
		
		try {
			// Try to find the element by selector first
			const containerElement = document.querySelector(selector);
			
			if (containerElement) {
				// Look for a button with matching text within the container
				const buttons = containerElement.querySelectorAll('button, a[role="button"], [type="button"], [class*="button"], [class*="btn"]');
				
				for (const button of buttons) {
					if (button.textContent.trim() === buttonText) {
						// Found a matching button - click it!
						button.click();
						console.log('Cookie Consent Manager: Successfully clicked button:', buttonText);
						sendResponse({ success: true, message: 'Button clicked successfully' });
						return true;
					}
				}
				
				// If no button with exact text is found, try a more lenient approach
				for (const button of buttons) {
					if (button.textContent.trim().includes(buttonText) || 
						buttonText.includes(button.textContent.trim())) {
						// Found a partial match - click it
						button.click();
						console.log('Cookie Consent Manager: Clicked button with partial text match:', button.textContent.trim());
						sendResponse({ success: true, message: 'Button clicked with partial match' });
						return true;
					}
				}
				
				// No match found - just click the first button as fallback
				if (buttons.length > 0) {
					buttons[0].click();
					console.log('Cookie Consent Manager: Clicked first available button as fallback');
					sendResponse({ success: true, message: 'Clicked first available button' });
					return true;
				}
			}
			
			// If we reach here, no button was clicked
			console.log('Cookie Consent Manager: Could not find a button to click');
			sendResponse({ success: false, message: 'No button found to click' });
		} catch (error) {
			console.error('Cookie Consent Manager: Error simulating button click', error);
			sendResponse({ success: false, error: error.message });
		}
		
		return true;
	}
	return true;
});

// Detect region based on domain and page content
function detectRegion(domain) {
	// Check for UK/EU domains
	if (domain.endsWith('.uk') || domain.endsWith('.co.uk') || 
		domain.endsWith('.eu') || domain.includes('.uk.') ||
		document.documentElement.lang === 'en-GB') {
		return 'uk';
	}
	
	// Check for cookie notice text that's specific to UK/EU compliance
	const pageText = document.body.innerText.toLowerCase();
	if (pageText.includes('gdpr') || 
		pageText.includes('information commissioner') ||
		pageText.includes('legitimate interest') ||
		pageText.includes('ico') ||
		pageText.includes('uk data protection')) {
		return 'uk';
	}
	
	// Default to international
	return 'international';
}

function initCookieConsentManager() {
	// Start both modes if enabled
	if (settings.cloudMode) {
		runCloudMode();
	}
	
	if (settings.smartMode) {
		runSmartMode();
	}
}

function runCloudMode() {
	const currentDomain = window.location.hostname;
	const region = detectRegion(currentDomain);
	
	// First try site-specific selectors
	const siteSpecificSelectors = getSiteSpecificSelectors(currentDomain);
	if (siteSpecificSelectors && siteSpecificSelectors.length > 0) {
		for (const item of siteSpecificSelectors) {
			const element = document.querySelector(item.selector);
			if (element) {
				console.log('Cookie Consent Manager: Found element via site-specific selector', item.selector);
				// First capture the dialog
				captureDialog(element, item.selector, 'cloud-site-specific');
				
				// Only click if autoAccept is enabled - with longer delay to ensure capture completes
				if (settings.autoAccept) {
					setTimeout(() => clickElement(element), 800);
				}
				return;
			}
		}
	}
	
	// Then try region-specific common selectors
	const regionSelectors = cloudDatabase.common.filter(item => 
		item.region === region || !item.region
	);
	
	// Prefer "necessary only" if in GDPR compliance mode
	if (settings.gdprCompliance && region === 'uk') {
		// Look for necessary-only buttons first
		const necessarySelectors = regionSelectors.filter(item => item.necessary);
		for (const item of necessarySelectors) {
			const element = document.querySelector(item.selector);
			if (element) {
				console.log('Cookie Consent Manager: Found necessary-only button via selector', item.selector);
				// First capture the dialog
				captureDialog(element, item.selector, 'cloud-common-necessary');
				
				// Only click if autoAccept is enabled - with longer delay to ensure capture completes
				if (settings.autoAccept) {
					setTimeout(() => clickElement(element), 800);
				}
				return;
			}
		}
	}
	
	// Then try all common selectors
	for (const item of regionSelectors) {
		const element = document.querySelector(item.selector);
		if (element) {
			console.log('Cookie Consent Manager: Found element via common selector', item.selector);
			// First capture the dialog
			captureDialog(element, item.selector, 'cloud-common');
			
			// Only click if autoAccept is enabled - with longer delay to ensure capture completes
			if (settings.autoAccept) {
				setTimeout(() => clickElement(element), 800);
			}
			return;
		}
	}
	
	// Finally, look for similar patterns
	findSimilarPatterns(region);
}

function getSiteSpecificSelectors(domain) {
	// Try exact domain match
	if (cloudDatabase.sites[domain]) {
		return cloudDatabase.sites[domain];
	}
	
	// Try removing subdomains (e.g., support.example.com -> example.com)
	const baseDomain = domain.split('.').slice(-2).join('.');
	if (cloudDatabase.sites[baseDomain]) {
		return cloudDatabase.sites[baseDomain];
	}
	
	return null;
}

function findSimilarPatterns(region) {
	// Look for structural patterns similar to ones in our database
	// This would be more complex in a real implementation
	// For now, we just look for class patterns that might match
	
	const elements = document.querySelectorAll('div[class*="consent"], div[class*="cookie"], button[class*="consent"], div[class*="gdpr"], div[class*="notice"]');
	
	// Filter for region-specific patterns first
	const patterns = cloudDatabase.common.filter(pattern => 
		pattern.signature && (!pattern.region || pattern.region === region)
	);
	
	// Process each element
	for (const element of elements) {
		for (const pattern of patterns) {
			if (pattern.signature) {
				const classNames = element.className.split(' ');
				const matchesPattern = pattern.signature.classPatterns.some(
					pattern => classNames.some(className => className.includes(pattern))
				);
				
				if (matchesPattern) {
					console.log('Cookie Consent Manager: Found element via pattern matching', element);
					// First capture dialog
					captureDialog(element, `pattern:${pattern.patternId}`, 'cloud-pattern');
					
					// Only click if autoAccept is enabled - with longer delay
					if (settings.autoAccept) {
						// Find the closest button
						const button = element.querySelector('button') || element.closest('button') || element;
						setTimeout(() => clickElement(button), 800);
					}
					return;
				}
			}
		}
	}
}

function runSmartMode() {
	// Check if this is a GET request (not POST) and likely first visit
	if (!isGetRequest()) {
		console.log('Cookie Consent Manager: Skipping smart detection on POST request page');
		return;
	}
	
	// Setup observer to detect new elements appearing
	const observer = new MutationObserver((mutations) => {
		if (!settings.enabled || !settings.smartMode) return;
		
		for (const mutation of mutations) {
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType === Node.ELEMENT_NODE) {
						checkElementForCookieBanner(node);
					}
				});
			}
		}
	});
	
	// Start observing
	observer.observe(document.body, { 
		childList: true, 
		subtree: true 
	});
	
	// Also check existing elements on page load
	setTimeout(() => {
		checkExistingElements();
	}, 1000);
}

function checkExistingElements() {
	// Check all visible divs that might be cookie consent dialogs
	const potentialBanners = document.querySelectorAll(`
		div[class*="cookie"], div[class*="consent"], div[class*="privacy"], 
		div[id*="cookie"], div[id*="consent"], div[id*="privacy"], 
		div[class*="banner"], div[class*="popup"], div[class*="modal"],
		div[class*="gdpr"], div[id*="gdpr"], div[class*="notice"], 
		div[id*="notice"], div[aria-label*="cookie"], div[role="dialog"],
		div[aria-modal="true"], div[data-testid*="cookie"],
		form[id*="cookie"], form[action*="cookie"], form[action*="consent"],
		form[action*="privacy"], form[id*="cc"], form[class*="cookie"]
	`);
	
	potentialBanners.forEach(element => {
		checkElementForCookieBanner(element);
	});
}

function checkElementForCookieBanner(element) {
	// Skip if element is not visible
	if (!isElementVisible(element)) return;
	
	// Check if element contains cookie/privacy-related text (using broader UK terms)
	const text = element.textContent.toLowerCase();
	const innerHTML = element.innerHTML.toLowerCase();
	
	// Define cookie-specific attributes that strongly indicate a cookie dialog
	const hasCookieAttributes = 
		element.id?.toLowerCase().includes('cookie') ||
		element.getAttribute('data-testid')?.includes('cookie') ||
		element.getAttribute('aria-label')?.includes('cookie') ||
		(element.getAttribute('role') === 'dialog' && text.includes('cookie')) ||
		element.className?.toLowerCase().includes('cookie') ||
		(element.tagName === 'FORM' && (
			element.id?.toLowerCase().includes('cookie') || 
			element.id?.toLowerCase().includes('cc') ||
			element.action?.toLowerCase().includes('cookie') ||
			element.action?.toLowerCase().includes('consent') ||
			element.action?.toLowerCase().includes('privacy')
		));
	
	// Skip if element doesn't have a high z-index (likely not a cookie banner)
	// BUT only if it doesn't have cookie-specific attributes
	if (!hasCookieAttributes && !hasHighZIndex(element)) return;
	
	// Use expanded UK terms for detection
	const hasPrivacyTerms = ukPrivacyTerms.some(term => 
		text.includes(term) || innerHTML.includes(term)
	);
	
	if (hasPrivacyTerms || hasCookieAttributes) {
		// For form-based cookie banners, we need to handle differently
		const isForm = element.tagName === 'FORM';
		const buttons = element.querySelectorAll('button, a[role="button"], [type="button"], [type="submit"], [class*="button"], [class*="btn"]');
		
		// Skip if it has no buttons and isn't a form and doesn't have cookie attributes
		if (buttons.length === 0 && !isForm && !hasCookieAttributes) {
			return;
		}
		
		// For UK/EU compliance, look for "necessary only" button first if in GDPR compliance mode
		if (settings.gdprCompliance && detectRegion(window.location.hostname) === 'uk') {
			const necessaryButton = findNecessaryCookiesButton(element);
			if (necessaryButton) {
				console.log('Cookie Consent Manager: Found necessary cookies button in banner', element);
				captureDialog(element, 'smart-detection-necessary', 'smart-gdpr');
				
				// Only click if autoAccept is enabled - with longer delay
				if (settings.autoAccept) {
					setTimeout(() => clickElement(necessaryButton), 800);
				}
				return;
			}
		}
		
		// If no necessary-only button found or GDPR compliance is off, look for accept buttons
		const acceptButton = findAcceptButton(element);
		if (acceptButton) {
			console.log('Cookie Consent Manager: Found cookie banner with accept button', element);
			captureDialog(element, 'smart-detection', 'smart');
			
			// Only click if autoAccept is enabled - with longer delay
			if (settings.autoAccept) {
				setTimeout(() => clickElement(acceptButton), 800);
			}
			return;
		}
		
		// For forms without explicit buttons, try to find the submit input
		if (isForm) {
			const submitInputs = element.querySelectorAll('input[type="submit"], .a-button-input');
			for (const submitInput of submitInputs) {
				// Look for accept-related value or containing element with accept text
				const value = submitInput.value?.toLowerCase() || '';
				const parentText = submitInput.parentElement?.textContent?.toLowerCase() || '';
				
				if (value.includes('accept') || value.includes('agree') || 
					parentText.includes('accept') || parentText.includes('agree')) {
					console.log('Cookie Consent Manager: Found form submit button for cookie consent', submitInput);
					captureDialog(element, 'smart-detection-form', 'smart-form');
					
					// Only click if autoAccept is enabled
					if (settings.autoAccept) {
						setTimeout(() => clickElement(submitInput), 800);
					}
					return;
				}
			}
		}
	}
}

function hasHighZIndex(element) {
	const style = window.getComputedStyle(element);
	const zIndex = parseInt(style.zIndex, 10);
	
	// Check if it has a high z-index (common for overlays and popups)
	if (!isNaN(zIndex) && zIndex > 100) {
		return true;
	}
	
	// Check if it's fixed or absolute positioned (common for overlays)
	const position = style.position;
	if (position === 'fixed' || position === 'absolute') {
		// Check if it's near the top or bottom of the viewport
		const rect = element.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		
		// Bottom banners are often within 200px of the bottom
		if (viewportHeight - rect.bottom < 200) {
			return true;
		}
		
		// Top/center banners often start in the top half of the screen
		if (rect.top < viewportHeight / 2 && rect.height > 50) {
			return true;
		}
	}
	
	return false;
}

function captureDialog(element, selector, method) {
	try {
		// Get the parent container if it's just a button
		const container = (element.tagName === 'BUTTON' || element.tagName === 'A') 
			? element.closest('div[class*="cookie"], div[class*="consent"], div[class*="banner"], div[class*="popup"], div[class*="modal"], div[class*="gdpr"], div[class*="notice"]') || element.parentElement 
			: element;
		
		// Skip capture if user hasn't consented to data collection
		if (!dataCollectionConsent) {
			console.log('Cookie Consent Manager: Data collection consent not given, skipping dialog capture');
			return;
		}
		
		// Create a simplified clone of the container
		const clonedHtml = container.cloneNode(true);
		
		// Remove scripts and unnecessary attributes to make it lighter
		const scripts = clonedHtml.querySelectorAll('script');
		scripts.forEach(script => script.remove());
		
		// Sanitize HTML to remove potential private information if privacy mode is enabled
		if (settings.privacyMode) {
			sanitizePrivateData(clonedHtml);
		}
		
		// Determine button type based on the selector and method
		let buttonType = 'unknown';
		
		if (selector.includes('necessary-only') || selector.includes('smart-detection-necessary')) {
			buttonType = 'essential_only';
		} else if (settings.gdprCompliance && method.includes('gdpr')) {
			buttonType = 'gdpr_necessary';
		} else if (element.textContent.toLowerCase().includes('accept') || 
				 element.textContent.toLowerCase().includes('agree') ||
				 element.textContent.toLowerCase().includes('allow')) {
			buttonType = 'accept_all';
		} else if (element.textContent.toLowerCase().includes('decline') || 
				 element.textContent.toLowerCase().includes('reject') ||
				 element.textContent.toLowerCase().includes('refuse')) {
			buttonType = 'decline';
		} else if (element.textContent.toLowerCase().includes('settings') || 
				 element.textContent.toLowerCase().includes('preferences') ||
				 element.textContent.toLowerCase().includes('customise') ||
				 element.textContent.toLowerCase().includes('customize')) {
			buttonType = 'customise';
		} else if (element.textContent.toLowerCase().includes('necessary') || 
				 element.textContent.toLowerCase().includes('essential') ||
				 element.textContent.toLowerCase().includes('required')) {
			buttonType = 'necessary_only';
		}
		
		// Create a dialog record
		const dialog = {
			id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
			url: settings.privacyMode ? sanitizeUrl(window.location.href) : window.location.href,
			domain: window.location.hostname,
			selector,
			method,
			buttonType,
			buttonText: element.textContent.trim().substring(0, 50), // Capture the button text (limited to 50 chars)
			html: clonedHtml.outerHTML,
			capturedAt: new Date().toISOString(),
			region: detectRegion(window.location.hostname)
		};
		
		capturedDialogs.push(dialog);
		
		// Notify the background script that we captured a dialog
		chrome.runtime.sendMessage({ 
			action: 'dialogCaptured', 
			dialog: dialog
		});
	} catch (error) {
		console.error('Cookie Consent Manager: Error capturing dialog', error);
	}
}

// Sanitize potential private data from HTML
function sanitizePrivateData(element) {
	// Remove all input values, emails, phone numbers
	const inputs = element.querySelectorAll('input, textarea');
	inputs.forEach(input => {
		if (input.value) input.value = '[REDACTED]';
		if (input.placeholder) input.placeholder = '[REDACTED]';
	});
	
	// Remove all attributes that might contain user data
	const allElements = element.querySelectorAll('*');
	const sensitiveAttributes = ['data-email', 'data-user', 'data-id', 'data-name', 'data-customer', 'data-account'];
	
	allElements.forEach(el => {
		sensitiveAttributes.forEach(attr => {
			if (el.hasAttribute(attr)) {
				el.setAttribute(attr, '[REDACTED]');
			}
		});
		
		// Check for email patterns in text content and attributes
		for (let i = 0; i < el.attributes.length; i++) {
			const attr = el.attributes[i];
			if (containsEmailPattern(attr.value) || containsUKPostcodePattern(attr.value)) {
				el.setAttribute(attr.name, '[REDACTED]');
			}
		}
	});
	
	// Redact text nodes that might contain emails or other private data
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	const textNodes = [];
	
	while (walker.nextNode()) {
		textNodes.push(walker.currentNode);
	}
	
	textNodes.forEach(node => {
		if (containsEmailPattern(node.nodeValue) || 
			containsPhonePattern(node.nodeValue) ||
			containsUKPostcodePattern(node.nodeValue)) {
			node.nodeValue = node.nodeValue
				.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED EMAIL]')
				.replace(/(\+?[\d\s\(\)-]{10,})/g, '[REDACTED PHONE]')
				.replace(/\b[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}\b/g, '[REDACTED POSTCODE]');
		}
	});
}

// Pattern checks
function containsEmailPattern(text) {
	return /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
}

function containsPhonePattern(text) {
	// More specific phone pattern that won't match as aggressively
	return /(\+?\d{1,3}[-\s\.]?)?\(?\d{3,4}\)?[-\s\.]?\d{3,4}[-\s\.]?\d{3,4}/.test(text);
}

function containsUKPostcodePattern(text) {
	// UK postcode pattern
	return /\b[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}\b/.test(text);
}

// Sanitize URL to remove query parameters and hash which might contain private data
function sanitizeUrl(url) {
	try {
		const parsedUrl = new URL(url);
		return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
	} catch (e) {
		// If URL parsing fails, just return the domain
		return window.location.hostname;
	}
}

function findNecessaryCookiesButton(container) {
	// Terms that indicate necessary/essential cookies only options
	const necessaryTerms = [
		'necessary', 'essential', 'required', 'basic', 
		'functional', 'reject all', 'decline', 'refuse',
		'only necessary', 'only essential'
	];
	
	// First try buttons with explicit necessary-related text
	const clickables = container.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
	
	for (const element of clickables) {
		const text = element.textContent.toLowerCase().trim();
		
		// Check for necessary/essential cookies terms
		if (necessaryTerms.some(term => text.includes(term))) {
			// Skip if it contains terms that suggest it might not be what we want
			if (text.includes('preferences') || text.includes('customize') || text.includes('settings')) {
				continue;
			}
			return element;
		}
	}
	
	// Look for checkboxes that might control non-essential cookies and ensure they're unchecked
	const checkboxes = container.querySelectorAll('input[type="checkbox"]');
	let checkedNonEssential = false;
	
	for (const checkbox of checkboxes) {
		const label = findLabelForInput(checkbox);
		if (label) {
			const labelText = label.textContent.toLowerCase();
			// If it's not a necessary/essential checkbox and it's checked, uncheck it
			if (!necessaryTerms.some(term => labelText.includes(term)) && 
				(labelText.includes('analytics') || 
				 labelText.includes('marketing') || 
				 labelText.includes('advertising') || 
				 labelText.includes('social') || 
				 labelText.includes('tracking'))) {
				
				if (checkbox.checked) {
					checkbox.checked = false;
					checkedNonEssential = true;
				}
			}
		}
	}
	
	// If we've modified checkboxes, look for a save/apply button
	if (checkedNonEssential) {
		const saveButtons = Array.from(clickables).filter(el => {
			const text = el.textContent.toLowerCase().trim();
			return text.includes('save') || text.includes('apply') || text.includes('confirm');
		});
		
		if (saveButtons.length > 0) {
			return saveButtons[0];
		}
	}
	
	return null;
}

function findLabelForInput(input) {
	// Check for explicit label
	if (input.id) {
		const label = document.querySelector(`label[for="${input.id}"]`);
		if (label) return label;
	}
	
	// Check for parent label
	const parent = input.parentElement;
	if (parent && parent.tagName === 'LABEL') {
		return parent;
	}
	
	// No label found
	return null;
}

function findAcceptButton(container) {
	// Common button texts for accepting cookies
	const acceptTexts = ['accept', 'agree', 'ok', 'yes', 'got it', 'allow', 'understand', 'consent'];
	
	// BBC-specific handling - they often use specific IDs
	const bbcSpecificIds = ['bbccookies-continue-button', 'bbccookies-accept-button'];
	for (const id of bbcSpecificIds) {
		const bbcButton = document.getElementById(id);
		if (bbcButton && isElementVisible(bbcButton)) {
			return bbcButton;
		}
	}
	
	// For forms, try to find submit inputs first
	if (container.tagName === 'FORM') {
		// Look for submit inputs with accept-related values
		const submitInputs = container.querySelectorAll('input[type="submit"]');
		for (const input of submitInputs) {
			const value = input.value?.toLowerCase() || '';
			const id = input.id?.toLowerCase() || '';
			const name = input.name?.toLowerCase() || '';
			
			if (value.includes('accept') || value.includes('agree') || 
				id.includes('accept') || id.includes('agree') ||
				name.includes('accept') || name.includes('agree')) {
				return input;
			}
		}
		
		// Look for Amazon-style buttons (which are often nested in spans)
		const amazonButtons = container.querySelectorAll('.a-button-input');
		for (const button of amazonButtons) {
			const parentText = button.parentElement?.textContent?.toLowerCase() || '';
			if (acceptTexts.some(text => parentText.includes(text))) {
				return button;
			}
		}
	}
	
	// First look for buttons with explicit accept attributes
	const allElements = container.querySelectorAll('*');
	for (const element of allElements) {
		// Check ID for accept-related terms
		const id = element.id?.toLowerCase() || '';
		if (id.includes('accept') || id.includes('agree') || 
			bbcSpecificIds.includes(id)) {
			return element;
		}
		
		// Check aria-label for accept
		const ariaLabel = element.getAttribute('aria-label');
		if (ariaLabel && acceptTexts.some(text => ariaLabel.toLowerCase().includes(text))) {
			return element;
		}
		
		// Check other attributes
		const dataAction = element.getAttribute('data-action');
		if (dataAction && acceptTexts.some(text => dataAction.toLowerCase().includes(text))) {
			return element;
		}
	}
	
	// Then try buttons and anchors with explicit accept-related text
	const clickables = container.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
	
	for (const element of clickables) {
		const text = element.textContent.toLowerCase().trim();
		
		// Check if the button text includes one of the accept texts
		if (acceptTexts.some(acceptText => text.includes(acceptText))) {
			// Skip if it contains "settings", "preferences" or "customize"
			if (text.includes('settings') || text.includes('preferences') || text.includes('customize') || 
				text.includes('customise') || text.includes('manage')) {
				continue;
			}
			return element;
		}
	}
	
	// If no explicit accept button found, look for primary buttons (usually styled as blue/green)
	for (const element of clickables) {
		const classes = element.className.toLowerCase();
		if (classes.includes('accept') || 
			classes.includes('agree') || 
			classes.includes('allow') || 
			classes.includes('consent') ||
			classes.includes('primary') || 
			classes.includes('main') || 
			classes.includes('btn-primary') ||
			classes.includes('continue-button')) {
			return element;
		}
	}
	
	// Last resort - look for the first button if the container clearly has cookie attributes
	if (container.getAttribute('data-testid')?.includes('cookie') || 
		container.getAttribute('aria-label')?.includes('cookie') ||
		container.id?.toLowerCase().includes('cookie') ||
		container.className?.toLowerCase().includes('cookie')) {
		const buttons = container.querySelectorAll('button');
		if (buttons.length > 0) {
			// Often the first button is accept
			return buttons[0];
		}
	}
	
	return null;
}

function clickElement(element) {
	if (element && isElementVisible(element)) {
		// Special handling for BBC buttons which often redirect
		const isBBCButton = element.id?.includes('bbccookies') || 
						   window.location.hostname.includes('bbc');
		
		// First check if we're in a form that might submit
		const form = element.closest('form');
		
		// Check if we're in a dialog-like container
		const isInDialog = element.closest('[role="dialog"]') || 
						  element.closest('[aria-modal="true"]') ||
						  element.closest('.cookie-banner') ||
						  element.closest('.cookie-dialog') ||
						  element.closest('.consent-dialog') ||
						  element.closest('[data-testid*="cookie"]');
		
		if (form) {
			// Prevent the form from submitting by aggressively overriding the submit behavior
			try {
				// Store original methods
				const originalOnSubmit = form.onsubmit;
				const originalSubmit = form.submit;
				const originalAction = form.action;
				
				// Completely override form submission
				form.onsubmit = (e) => {
					if (e) {
						e.preventDefault();
						e.stopPropagation();
						e.stopImmediatePropagation();
					}
					return false;
				};
				
				// Also override the submit method
				form.submit = () => {
					console.log('Cookie Consent Manager: Prevented form submission');
					return false;
				};
				
				// Temporarily change the action to prevent navigation
				if (form.action) {
					form.action = 'javascript:void(0);';
				}
				
				// Block all form events
				const blockSubmit = (e) => {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					return false;
				};
				form.addEventListener('submit', blockSubmit, true);
				
				// Add click event listener to prevent default on the element
				const clickHandler = (e) => {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
				};
				element.addEventListener('click', clickHandler, true);
				
				// Create a backup - if clicking the element somehow navigates away,
				// restore the page in a few milliseconds
				const currentLocation = window.location.href;
				const backupTimer = setTimeout(() => {
					// Check if location changed
					if (window.location.href !== currentLocation) {
						console.log('Cookie Consent Manager: Detected navigation after click, restoring page');
						history.back();
					}
				}, 300);
				
				// For BBC buttons, use a more direct approach
				if (isBBCButton) {
					// This approach uses a programmatic click that avoids event handlers
					const clickEvent = new MouseEvent('click', {
						bubbles: false,
						cancelable: true,
						view: window,
						detail: 0,
					});
					element.dispatchEvent(clickEvent);
					
					// Store the cookie value directly
					document.cookie = "ckns_policy=111; max-age=31536000; path=/;";
					document.cookie = "ckns_explicit=1; max-age=31536000; path=/;";
					document.cookie = "ckns_privacy=1; max-age=31536000; path=/;";
				} else {
					// For other forms, simulate the click but prevent default behavior
					try {
						// Use a direct DOM event that bypasses any handlers
						const clickEvent = new MouseEvent('click', {
							bubbles: false,
							cancelable: false,
							view: window
						});
						
						// Dispatch the event directly on the element
						element.dispatchEvent(clickEvent);
					} catch (error) {
						// Fallback to normal click if MouseEvent fails
						element.click();
					}
				}
				
				// Clean up
				clearTimeout(backupTimer);
				form.removeEventListener('submit', blockSubmit, true);
				element.removeEventListener('click', clickHandler, true);
				
				// Restore original form properties
				form.submit = originalSubmit;
				form.onsubmit = originalOnSubmit;
				if (form.action === 'javascript:void(0);') {
					form.action = originalAction;
				}
				
				console.log('Cookie Consent Manager: Clicked button in form with submission prevention', element);
			} catch (error) {
				console.error('Error in form click handling:', error);
				// Last resort
				element.click();
			}
		} else if (isInDialog || isBBCButton || element.tagName === 'BUTTON' || element.tagName === 'A' || 
					element.getAttribute('role') === 'button') {
			try {
				// Set a temporary event listener to prevent default actions
				const clickHandler = (e) => {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
				};
				element.addEventListener('click', clickHandler, true);
				
				// Add global safeguards to prevent page reload/navigation
				const originalSubmit = HTMLFormElement.prototype.submit;
				const originalOnBeforeUnload = window.onbeforeunload;
				
				// Override form submit globally (temporarily)
				HTMLFormElement.prototype.submit = function() {
					console.log('Cookie Consent Manager: Prevented global form submission');
					return false;
				};
				
				// Add a beforeunload handler to catch navigation attempts
				window.onbeforeunload = (e) => {
					e.preventDefault();
					e.returnValue = '';
					return '';
				};
				
				// Special handling for BBC buttons
				if (isBBCButton) {
					// Set BBC cookies directly
					document.cookie = "ckns_policy=111; max-age=31536000; path=/;";
					document.cookie = "ckns_explicit=1; max-age=31536000; path=/;";
					document.cookie = "ckns_privacy=1; max-age=31536000; path=/;";
					
					// Try to remove the cookie dialog
					const bbcCookieDialogs = document.querySelectorAll('#cookiePrompt, .bbccookies-banner');
					bbcCookieDialogs.forEach(dialog => {
						if (dialog) dialog.style.display = 'none';
					});
				}
				
				// Create a backup - if clicking the element somehow navigates away,
				// restore the page in a few milliseconds
				const currentLocation = window.location.href;
				const backupTimer = setTimeout(() => {
					// Check if location changed
					if (window.location.href !== currentLocation) {
						console.log('Cookie Consent Manager: Detected navigation after click, restoring page');
						window.stop(); // Stop any current page load
						history.back();
					}
					
					// Restore original functionality
					HTMLFormElement.prototype.submit = originalSubmit;
					window.onbeforeunload = originalOnBeforeUnload;
				}, 300);
				
				// Try to click without triggering default behavior
				try {
					// Approach 1: Use a direct DOM event that bypasses any handlers
					const clickEvent = new MouseEvent('click', {
						bubbles: false,
						cancelable: false,
						view: window
					});
					
					// Dispatch the event directly on the element
					element.dispatchEvent(clickEvent);
				} catch (error) {
					// Approach 2: Clone the element, click the clone, then remove it
					try {
						// Create a clone of the button without event listeners
						const clone = element.cloneNode(true);
						clone.style.position = 'absolute';
						clone.style.opacity = '0';
						clone.style.pointerEvents = 'none';
						
						// Append to body, click, then remove
						document.body.appendChild(clone);
						clone.click();
						document.body.removeChild(clone);
					} catch (cloneError) {
						// Last resort: regular click
						element.click();
					}
				}
				
				// Clean up
				clearTimeout(backupTimer);
				element.removeEventListener('click', clickHandler, true);
				HTMLFormElement.prototype.submit = originalSubmit;
				window.onbeforeunload = originalOnBeforeUnload;
				
				console.log('Cookie Consent Manager: Clicked dialog/button element with navigation prevention', element);
			} catch (error) {
				console.error('Error in button click handling:', error);
				// Last resort
				element.click();
			}
		} else {
			// For other elements, just click normally
			element.click();
			console.log('Cookie Consent Manager: Clicked element', element);
		}
	}
}

function isElementVisible(element) {
	if (!element) return false;
	
	const style = window.getComputedStyle(element);
	return style.display !== 'none' && 
		style.visibility !== 'hidden' && 
		style.opacity !== '0' &&
		element.offsetWidth > 0 &&
		element.offsetHeight > 0;
} 