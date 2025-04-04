// Configuration
let settings = {
	enabled: true,
	autoAccept: true,
	smartMode: true,
	cloudMode: true,
	privacyMode: true,  // New privacy setting to control data collection
	gdprCompliance: true // UK/EU GDPR compliance mode
};

// Cloud database - Contains generic patterns, no site-specific entries
const cloudDatabase = {
	// Common selectors that work across many sites
	common: [
		// General cookie consent patterns
		{ 
			selector: '.cookie-accept-all', 
			type: 'button', 
			patternId: 'cookie-accept', 
			rating: 4.9,
			signature: {
				classPatterns: ['cookie-', 'accept'],
				structure: 'div > .cookie-accept-all'
			}
		},
		{ 
			selector: '.cookie-accept-necessary', 
			type: 'button', 
			patternId: 'cookie-necessary', 
			rating: 4.7,
			necessary: true // Marks this as a "necessary cookies only" option
		},
		{ 
			selector: '.fc-cta-consent', 
			type: 'button', 
			patternId: 'consent', 
			rating: 4.9,
			signature: {
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
		// Common necessary-only options
		{ selector: '#onetrust-reject-all-handler', type: 'button', rating: 4.6, necessary: true },
		{ selector: '.cc-accept-necessary', type: 'button', rating: 4.4, necessary: true },
		{ selector: '.js-accept-essential', type: 'button', rating: 4.2, necessary: true },
		{ selector: '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll', type: 'button', rating: 4.7, necessary: true }
	]
};

// Ensure privacy terms are defined
const ukPrivacyTerms = [
	'cookie', 'cookies', 'gdpr', 'data protection', 'privacy', 
	'consent', 'personal data', 'legitimate interest', 'ccpa', 
	'cpra', 'opt-out', 'opt out', 'policy', 'privacy policy', 
	'data privacy', 'privacy notice', 'cookie policy', 'accept cookies',
	'cookie preferences', 'cookie settings', 'privacy settings'
];

// Store captured dialogs
let capturedDialogs = [];

// Domain visit tracking (for first visit detection)
const visitedDomains = new Set();

// Track data collection consent
let dataCollectionConsent = false;

// WeakMap to track elements that have been clicked
const clickedElements = new WeakMap();

// Track tabs that were opened by our extension's clicks
let openedByExtension = false;

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
	// The performance.navigation API is deprecated but still useful
	if (window.performance && window.performance.navigation) {
		// navigation.type: 0 = direct/normal navigation, 1 = reload, 2 = back/forward
		// All of these can be treated as GET for our purposes
		return window.performance.navigation.type !== 255; // 255 is reserved/other
	}
	
	// Alternative method using performance entries if available
	if (window.performance && window.performance.getEntriesByType) {
		const navEntries = window.performance.getEntriesByType('navigation');
		if (navEntries && navEntries.length > 0 && navEntries[0].type) {
			// navigation types: navigate, reload, back_forward, prerender
			// All of these are typically GET requests
			return navEntries[0].type !== 'other';
		}
	}
	
	// If we can't determine the navigation type, assume it's a GET request
	// This is better than potentially missing cookie banners
	return true;
}

// Load settings with fallback to localStorage if Chrome storage fails
function loadSettings(callback) {
	chrome.storage.sync.get({
		enabled: true,
		autoAccept: true,
		smartMode: true,
		cloudMode: false,
		privacyMode: false,
		gdprCompliance: false
	}, (loadedSettings) => {
		settings = loadedSettings;
		callback(settings);
	}).catch(error => {
		console.log('Error loading settings from Chrome storage, falling back to localStorage', error);
		// Fall back to localStorage if Chrome storage fails
		try {
			const savedSettings = localStorage.getItem('ccm_settings');
			if (savedSettings) {
				settings = JSON.parse(savedSettings);
				console.log('Loaded settings from localStorage fallback');
			} else {
				// Use defaults if nothing in localStorage either
				settings = {
					enabled: true,
					autoAccept: true,
					smartMode: true,
					cloudMode: false,
					privacyMode: false,
					gdprCompliance: false
				};
				console.log('Using default settings (no localStorage fallback found)');
			}
			callback(settings);
		} catch (e) {
			console.error('Error parsing localStorage settings', e);
			// Use defaults in case of any error
			settings = {
				enabled: true,
				autoAccept: true,
				smartMode: true,
				cloudMode: false,
				privacyMode: false,
				gdprCompliance: false
			};
			callback(settings);
		}
	});
}

// Replace existing chrome.storage.sync.get with loadSettings call
loadSettings((loadedSettings) => {
	// Check if this tab was recently opened by our extension
	chrome.storage.local.get(['recentlyOpenedTabs'], (result) => {
		if (result.recentlyOpenedTabs) {
			const currentTabUrl = window.location.href;
			const timestamp = Date.now();
			
			// Look for this URL in recently opened tabs (within last 5 seconds)
			const recentlyOpenedTabs = result.recentlyOpenedTabs.filter(item => {
				return (timestamp - item.timestamp) < 5000; // 5 seconds
			});
			
			const wasOpenedByExtension = recentlyOpenedTabs.some(item => 
				currentTabUrl.includes(item.url) || 
				item.url.includes(currentTabUrl)
			);
			
			if (wasOpenedByExtension) {
				console.log('Cookie Consent Manager: This tab was opened by our extension, disabling auto-accept');
				openedByExtension = true;
				
				// Clean up the list, removing this URL
				const updatedTabs = recentlyOpenedTabs.filter(item => 
					!currentTabUrl.includes(item.url) && !item.url.includes(currentTabUrl)
				);
				
				chrome.storage.local.set({ recentlyOpenedTabs: updatedTabs });
			} else {
				// Clean expired entries
				chrome.storage.local.set({ recentlyOpenedTabs: recentlyOpenedTabs });
			}
		}
		
		// Only initialize if enabled
		if (settings.enabled) {
			initCookieConsentManager();
		}
	}).catch(error => {
		console.log('Error accessing recentlyOpenedTabs, falling back to defaults', error);
		// Fall back to defaults if Chrome storage fails
		if (settings.enabled) {
			initCookieConsentManager();
		}
	});
});

// Check data collection consent status
chrome.storage.local.get('dataCollectionConsent', (result) => {
	dataCollectionConsent = result.dataCollectionConsent || false;
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'detectionSetting') {
		// Update detection settings
		settings = message.settings;
		sendResponse({ success: true });
		return true;
	} else if (message.action === 'recordInteraction') {
		// Record an interaction with a cookie consent dialog
		dialog = message.dialog;
		sendResponse({ success: true });
		return true;
	} else if (message.action === 'analyzeSource') {
		try {
			// Check if necessary variables exist
			if (typeof ukPrivacyTerms === 'undefined') {
				sendResponse({ 
					error: true, 
					errorDetails: 'Required variable ukPrivacyTerms is not defined' 
				});
				return true;
			}
			
			if (typeof findAcceptButton === 'undefined') {
				sendResponse({ 
					error: true, 
					errorDetails: 'Required function findAcceptButton is not defined' 
				});
				return true;
			}
			
			if (typeof findNecessaryCookiesButton === 'undefined') {
				sendResponse({ 
					error: true, 
					errorDetails: 'Required function findNecessaryCookiesButton is not defined' 
				});
				return true;
			}
			
			if (typeof identifyMissingStructures === 'undefined') {
				sendResponse({ 
					error: true, 
					errorDetails: 'Required function identifyMissingStructures is not defined' 
				});
				return true;
			}
			
			// Analyze source code
			const result = analyzeBoxSource(message.source);
			sendResponse(result);
		} catch (error) {
			console.error('Error analyzing source:', error);
			sendResponse({ 
				error: true, 
				errorDetails: error ? (error.message || error.toString()) : 'Unknown error in analyzeSource'
			});
		}
		return true;
	} else if (message.action === 'submitRating') {
		// Handle rating submission with sanitization
		const { dialogId, rating, isGoodMatch } = message.data;
		
		// Only sanitize data when submitting ratings
		chrome.storage.local.get(['dialogHistory', 'capturedDialogs'], (result) => {
			// Look for the dialog in both locations
			let dialog = (result.capturedDialogs || []).find(d => d.id === dialogId);
			if (!dialog) {
				dialog = (result.dialogHistory || []).find(d => d.id === dialogId);
			}
			
			if (dialog) {
				// Create a sanitized copy for submission
				const sanitizedDialog = {...dialog};
				
				// Sanitize the HTML before submission
				const tempContainer = document.createElement('div');
				tempContainer.innerHTML = dialog.html;
				sanitizePrivateData(tempContainer);
				sanitizedDialog.html = tempContainer.innerHTML;
				
				// Sanitize URL
				sanitizedDialog.url = sanitizeUrl(dialog.url);
				
				// Submit the sanitized dialog with rating
				chrome.runtime.sendMessage({ 
					action: 'submitDialogRating', 
					data: { 
						dialogId, 
						rating, 
						isGoodMatch,
						sanitizedDialog
					}
				}, sendResponse);
			} else {
				sendResponse({ error: 'Dialog not found' });
			}
		});
		return true;
	} else if (message.action === 'getCapturedDialogs') {
		sendResponse({ dialogs: capturedDialogs });
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
	// Check if cloud mode is active
	if (!settings.cloudMode) {
		return false;
	}
	
	// Check if consent is given for cloud mode
	if (!dataCollectionConsent) {
		console.log('Cookie Consent Manager: Cloud mode requires consent');
		return false;
	}
	
	// Skip auto-accepting if this tab was opened by our extension
	if (openedByExtension && settings.autoAccept) {
		console.log('Cookie Consent Manager: Skipping cloud auto-accept on tab opened by extension');
		return false;
	}
	
	const currentDomain = window.location.hostname;
	const region = detectRegion(currentDomain);
	
	// Try common selectors
	const selectors = cloudDatabase.common;
	
	// Check for premium access before allowing GDPR compliance mode
	// For now, we'll just check the setting, in the future this would check premium status
	const isPremiumUser = settings.gdprCompliance; // This will be replaced with actual premium status check
	
	// Prefer "necessary only" if in GDPR compliance mode and user has premium
	if (isPremiumUser && settings.gdprCompliance && region === 'uk') {
		// Look for necessary-only buttons first
		const necessarySelectors = selectors.filter(item => item.necessary);
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
	
	// Then try standard accept buttons
	for (const item of selectors) {
		// Skip necessary-only buttons in this pass
		if (item.necessary) continue;
		
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
	
	// If no common selectors matched, try to find similar patterns based on the signature
	findSimilarPatterns(region);
}

// This function is no longer needed since we're not using site-specific selectors
// Keeping it as a placeholder in case we need to implement something similar in future
function findSimilarPatterns(region) {
	// Skip auto-accepting if this tab was opened by our extension
	if (openedByExtension && settings.autoAccept) {
		console.log('Cookie Consent Manager: Skipping pattern-based auto-accept on tab opened by extension');
		return;
	}
	
	// Filter for patterns based on DOM structure and classes
	const patterns = cloudDatabase.common.filter(item => 
		item.signature && (!item.region || item.region === region)
	);
	
	for (const pattern of patterns) {
		if (!pattern.signature) continue;
		
		// Try to find elements matching the signature patterns
		const elements = document.querySelectorAll(`[class*="${pattern.signature.classPatterns[0]}"]`);
		for (const element of elements) {
			// Check if this element matches our pattern
			const classes = element.className.toLowerCase();
			const matchesAllPatterns = pattern.signature.classPatterns.every(
				classPattern => classes.includes(classPattern)
			);
			
			if (matchesAllPatterns) {
				console.log('Cookie Consent Manager: Found element via signature pattern matching', classes);
				captureDialog(element, `signature-match-${pattern.patternId}`, 'cloud-signature');
				
				// Only click if autoAccept is enabled - with longer delay to ensure capture completes
				if (settings.autoAccept) {
					setTimeout(() => clickElement(element), 800);
				}
				return;
			}
		}
	}
}

function runSmartMode() {
	// First check if elements already exist on page
	checkExistingElements();
	
	// Set up a mutation observer to detect new elements
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			// Check for added nodes
			if (mutation.addedNodes && mutation.addedNodes.length > 0) {
				// Check each added node
				for (let i = 0; i < mutation.addedNodes.length; i++) {
					const node = mutation.addedNodes[i];
					// Only process element nodes
					if (node.nodeType === 1) {
						checkElementForCookieBanner(node);
					}
				}
			}
			
			// Also check for attribute changes that might make a hidden element visible
			if (mutation.type === 'attributes' && 
				(mutation.attributeName === 'style' || 
				 mutation.attributeName === 'class' || 
				 mutation.attributeName === 'hidden' ||
				 mutation.attributeName === 'aria-hidden')) {
				checkElementForCookieBanner(mutation.target);
			}
		});
	});
	
	// Configure the observer to watch for:
	// - New elements added to the DOM
	// - Changes to style, class, hidden attributes
	observer.observe(document.body, { 
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['style', 'class', 'hidden', 'aria-hidden', 'display', 'visibility']
	});
	
	// Add a delayed check for dynamic banners that load after a few seconds
	setTimeout(() => {
		checkExistingElements();
	}, 1500);
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
	// Only process if enabled in smart mode
	if (!settings.enabled || !settings.smartMode) return false;
	
	// Check element and all its descendants
	if (!element) return false;
	
	// Skip non-element nodes
	if (element.nodeType !== Node.ELEMENT_NODE) return false;
	
	// Skip elements that are not visible
	if (!isElementVisible(element)) return false;
	
	// Skip really small elements (likely not cookie dialogs)
	if (element.offsetWidth < 200 || element.offsetHeight < 50) return false;
	
	// Skip elements that we've already processed
	if (element.dataset.cookieConsentProcessed) return false;
	element.dataset.cookieConsentProcessed = true;
	
	let foundCookieDialog = false;
	
	// Check element content for cookie-related terms first
	const textContent = element.textContent.toLowerCase();
	const elementHTML = element.innerHTML.toLowerCase();
	
	// Check if it contains cookie-related terms
	const hasPrivacyTerms = ukPrivacyTerms.some(term => 
		textContent.includes(term) || elementHTML.includes(term)
	);
	
	if (hasPrivacyTerms) {
		// Look for interactive elements (buttons or links)
		const hasButtons = element.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]').length > 0;
		
		if (hasButtons) {
			// Verify there's an accept button
			const acceptButton = findAcceptButton(element);
			if (acceptButton) {
				// Process this as a cookie element
				console.log('Cookie Consent Manager: Detected cookie consent dialog via smart formula', element);
				processCookieElement(element, 'smart-formula', 'smart-detection');
				foundCookieDialog = true;
			}
		}
	}
	
	// If we didn't find one on this element, check children too
	if (!foundCookieDialog) {
		// Check children recursively (major dialogs only)
		if (element.children.length > 0 && element.querySelectorAll('*').length < 500) {
			for (const child of element.children) {
				// Check large, visible children only
				if (child.nodeType === Node.ELEMENT_NODE && 
					isElementVisible(child) &&
					child.offsetWidth >= 200 && child.offsetHeight >= 50) {
					const childResult = checkElementForCookieBanner(child);
					if (childResult) {
						foundCookieDialog = true;
						break;
					}
				}
			}
		}
	}
	
	return foundCookieDialog;
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
		
		// No longer checking for consent here as dialog capture is considered essential functionality
		// and the data is only stored locally until explicit submission
		
		// Create a simplified clone of the container
		const clonedHtml = container.cloneNode(true);
		
		// Remove scripts and unnecessary attributes to make it lighter
		const scripts = clonedHtml.querySelectorAll('script');
		scripts.forEach(script => script.remove());
		
		// Store the original HTML without redaction
		// Sanitization will occur only when submitting with good/bad ratings
		
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
			url: window.location.href, // Store the original URL, we'll sanitize when needed
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
		'functional', 'reject all', 'reject', 'decline', 'refuse',
		'only necessary', 'only essential'
	];
	
	// First check for OneTrust specific patterns (very common)
	// This ensures the ETH Zurich pattern and similar ones are correctly detected
	const onetrustRejectBtn = container.querySelector('#onetrust-reject-all-handler');
	if (onetrustRejectBtn) {
		return onetrustRejectBtn;
	}
	
	// Improved ID-based detection with priority order - look for reject/essential patterns in IDs
	const idSpecificElements = container.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
	for (const element of idSpecificElements) {
		const id = element.id?.toLowerCase() || '';
		
		// First check for most explicit reject/essential ID patterns - highest priority
		if (id.includes('reject-all') || id.includes('reject-cookie') || 
		    id.includes('decline-all') || id.includes('refuse-all') ||
		    id.includes('essential-only') || id.includes('necessary-only') ||
		    id.includes('onetrust-reject') || id.includes('reject-cookies')) {
			return element;
		}
	}
	
	// First try buttons with explicit "reject cookies" text
	const buttons = container.querySelectorAll('button');
	for (const button of buttons) {
		const text = button.textContent?.toLowerCase().trim() || '';
		
		// Direct match for reject cookies patterns
		if (text.includes('reject all cookie') || 
		    text.includes('reject cookie') || 
		    text.includes('decline cookie') || 
		    text.includes('refuse cookie')) {
			return button;
		}
		
		// Check for button text that contains both a reject term and "cookie"
		if (text.includes('cookie') && 
		   (text.includes('reject') || text.includes('decline') || text.includes('refuse'))) {
			return button;
		}
	}
	
	// Then try buttons with explicit necessary-related text
	const clickables = container.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
	
	// First prioritize "reject all" or "decline all" buttons which are clearest
	for (const element of clickables) {
		const text = element.textContent?.toLowerCase().trim() || '';
		
		// More comprehensive text matching for "Reject all Cookies"
		if (text.includes('reject') || text.includes('decline') || text.includes('refuse')) {
			// Prioritize those with "all" or "cookie" in text
			if (text.includes('all') || text.includes('cookie')) {
				return element;
			}
		}
		
		// Explicitly check for common patterns
		if (text.includes('reject all') || text.includes('decline all') || text.includes('refuse all') ||
		    text.includes('reject cookie') || text.includes('decline cookie') || text.includes('refuse cookie')) {
			return element;
		}
		
		// Check ID for reject-related terms - with high priority
		const id = element.id?.toLowerCase() || '';
		if (id.includes('reject') || id.includes('refuse') || id.includes('decline')) {
			return element;
		}
	}
	
	// Then check for other necessary/reject buttons
	for (const element of clickables) {
		const text = element.textContent?.toLowerCase().trim() || '';
		
		// Skip if the link is informational
		if (element.tagName === 'A') {
			const href = element.getAttribute('href') || '';
			if (href && href !== '#' && !href.startsWith('javascript:') && 
				(text.includes('learn more') || text.includes('more about') || 
				text.includes('privacy policy') || text.includes('cookie policy'))) {
				continue;
			}
		}
		
		// Check if the text contains any necessary terms
		if (necessaryTerms.some(term => text.includes(term))) {
			// Make sure it's not a settings button
			if (text.includes('settings') || text.includes('preferences') || 
				text.includes('customize') || text.includes('customise') || 
				text.includes('manage')) {
				continue;
			}
			return element;
		}
		
		// Check the element class and ID
		const className = element.className?.toLowerCase() || '';
		const id = element.id?.toLowerCase() || '';
		
		if (className.includes('reject') || className.includes('decline') || 
			className.includes('refuse') || className.includes('necessary') || 
			className.includes('essential') || className.includes('secondary') ||
			id.includes('necessary') || id.includes('essential')) {
			
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
	
	// First check for OneTrust specific patterns (very common)
	// This ensures the ETH Zurich pattern and similar ones are correctly detected
	const onetrustAcceptBtn = container.querySelector('#onetrust-accept-btn-handler');
	if (onetrustAcceptBtn) {
		return onetrustAcceptBtn;
	}
	
	// Improved ID-based detection with clear priority - MAKE SURE we don't catch essential/necessary buttons
	const acceptIdElements = container.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
	for (const element of acceptIdElements) {
		const id = element.id?.toLowerCase() || '';
		const buttonText = element.textContent?.toLowerCase().trim() || '';
		
		// Skip if it's an essential/necessary/reject button - ensure correct detection order
		if (id.includes('essential') || id.includes('necessary') || 
		    id.includes('reject') || id.includes('decline') || id.includes('refuse')) {
			continue;
		}
		
		// Check for explicit accept/agree IDs - high priority pattern
		if (id.includes('accept-all') || id.includes('accept-cookie') || 
		    id.includes('allow-all') || id.includes('agree-all') ||
		    id.includes('onetrust-accept') || id.includes('accept-btn') ||
		    id.includes('agree-btn')) {
			// Skip if it's a settings, preferences or "more info" button
			if (buttonText.includes('settings') || buttonText.includes('preferences') || 
				buttonText.includes('customize') || buttonText.includes('customise') || 
				buttonText.includes('manage') || buttonText.includes('more about')) {
				continue;
			}
			return element;
		}
	}
	
	// First try buttons with explicit text about accepting cookies
	const buttons = container.querySelectorAll('button');
	for (const button of buttons) {
		const text = button.textContent?.toLowerCase().trim() || '';
		
		// Direct match for the most common accept cookie patterns
		if (text.includes('accept all cookie') || 
		    text.includes('accept cookie') || 
		    text.includes('allow cookie') || 
		    text.includes('agree to cookie')) {
			return button;
		}
		
		// Check for button text that contains both an accept term and "cookie"
		if (text.includes('cookie') && acceptTexts.some(term => text.includes(term))) {
			// Skip if it's settings or preferences
			if (text.includes('settings') || text.includes('preferences') || 
				text.includes('customize') || text.includes('customise') || 
				text.includes('manage') || text.includes('more about')) {
				continue;
			}
			return button;
		}
	}
	
	// Then try the simplest and most reliable approach - direct button ID matching
	// Many implementations use clear IDs for their buttons
	const directIdMatches = container.querySelectorAll('button[id*="accept"], button[id*="agree"], button[id*="allow"]');
	for (const button of directIdMatches) {
		// Skip if it's a settings, preferences or "more info" button
		const buttonText = button.textContent?.toLowerCase().trim() || '';
		
		// Skip if it's actually a reject/necessary button - ensure correct detection order
		const buttonId = button.id?.toLowerCase() || '';
		if (buttonId.includes('essential') || buttonId.includes('necessary') || 
		    buttonId.includes('reject') || buttonId.includes('decline') || buttonId.includes('refuse')) {
			continue;
		}
		
		if (buttonText.includes('settings') || buttonText.includes('preferences') || 
			buttonText.includes('customize') || buttonText.includes('customise') || 
			buttonText.includes('manage') || buttonText.includes('more about')) {
			continue;
		}
		return button;
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
		
		// Look for buttons that are often nested in spans
		const buttonInputs = container.querySelectorAll('.a-button-input, [type="button"]');
		for (const button of buttonInputs) {
			const parentText = button.parentElement?.textContent?.toLowerCase() || '';
			if (acceptTexts.some(text => parentText.includes(text))) {
				return button;
			}
		}
	}
	
	// Now try other buttons with clear accept text
	for (const button of buttons) {
		const text = button.textContent?.toLowerCase().trim() || '';
		
		// More comprehensive text matching for variations like "Accept all" 
		if (acceptTexts.some(term => text.includes(term))) {
			// Skip if it's settings or preferences
			if (text.includes('settings') || text.includes('preferences') || 
				text.includes('customize') || text.includes('customise') || 
				text.includes('manage') || text.includes('more about')) {
				continue;
			}
			
			// Higher priority for buttons with "all" 
			if (text.includes('all')) {
				return button;
			}
		}
		
		// Also check for accept all patterns
		if (text.includes('accept all') || text.includes('allow all')) {
			return button;
		}
	}
	
	// Check other HTML elements with explicit accept IDs or attributes
	const genericElements = container.querySelectorAll('*');
	for (const element of genericElements) {
		// Check ID for accept-related terms (only for non-links or links with button role)
		const id = element.id?.toLowerCase() || '';
		if (id.includes('accept') || id.includes('agree') || id.includes('allow')) {
			// Verify it's not just in "more about" link by checking tag and content
			if (element.tagName !== 'A' || 
			   (element.getAttribute('role') === 'button' && 
				!element.textContent.toLowerCase().includes('more about'))) {
				return element;
			}
		}
		
		// Check aria-label for accept
		const ariaLabel = element.getAttribute('aria-label');
		if (ariaLabel && acceptTexts.some(text => ariaLabel.toLowerCase().includes(text))) {
			// Skip links with informational content
			if (element.tagName === 'A' && element.textContent.toLowerCase().includes('more about')) {
				continue;
			}
			return element;
		}
		
		// Check other attributes
		const dataAction = element.getAttribute('data-action');
		if (dataAction && acceptTexts.some(text => dataAction.toLowerCase().includes(text))) {
			return element;
		}
	}
	
	// Then try all clickable elements with explicit accept-related text
	const clickables = container.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
	
	for (const element of clickables) {
		const text = element.textContent?.toLowerCase().trim() || '';
		
		// Check if the button text includes one of the accept texts
		if (acceptTexts.some(acceptText => text.includes(acceptText))) {
			// Skip if it contains "settings", "preferences", "customize" or "more about"
			if (text.includes('settings') || text.includes('preferences') || 
				text.includes('customize') || text.includes('customise') || 
				text.includes('manage') || text.includes('more about')) {
				continue;
			}
			return element;
		}
	}
	
	// Look for anchors with role="button" and appropriate text (but not informational links)
	const buttonAnchors = container.querySelectorAll('a[role="button"]');
	for (const anchor of buttonAnchors) {
		const text = anchor.textContent?.toLowerCase().trim() || '';
		const href = anchor.getAttribute('href') || '';
		
		// Skip information links with real paths
		if (href && href !== '#' && !href.startsWith('javascript:') && 
			(text.includes('learn more') || text.includes('more about') || 
			text.includes('privacy policy') || text.includes('cookie policy'))) {
			continue;
		}
		
		// Check if it has accept-related text
		if (acceptTexts.some(acceptText => text.includes(acceptText))) {
			// Skip if it contains "settings", etc.
			if (text.includes('settings') || text.includes('preferences') || 
				text.includes('customize') || text.includes('customise') || 
				text.includes('manage')) {
				continue;
			}
			return anchor;
		}
	}
	
	// If no explicit accept button found, look for primary buttons (usually styled as blue/green)
	for (const element of clickables) {
		const classes = element.className?.toLowerCase() || '';
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
	// Check if the element has already been clicked
	if (clickedElements.has(element)) {
		console.log('Cookie Consent Manager: Button already clicked, ignoring this click attempt');
		return false;
	}
	
	// Extra safety check for informational links that shouldn't be clicked
	if (element.tagName === 'A') {
		const text = element.textContent.toLowerCase().trim();
		const href = element.getAttribute('href') || '';
		const target = element.getAttribute('target') || '';
		const rel = element.getAttribute('rel') || '';
		const ariaLabel = element.getAttribute('aria-label') || '';
		
		// Informational link indicators
		const informationalPhrases = [
			'more about', 'learn more', 'read more', 'cookie policy', 'privacy policy',
			'cookie information', 'more information', 'our cookies', 'data protection',
			'learn about', 'find out more', 'privacy statement'
		];
		
		// Don't click if:
		// 1. It's a link with target="_blank" (opens in new tab)
		// 2. Contains text that suggests it's informational
		// 3. Has rel="noopener" which often indicates external links
		// 4. Points to a URL with "policy", "cookies", "privacy", etc.
		if ((target === '_blank' || rel.includes('noopener')) && 
			(informationalPhrases.some(phrase => text.includes(phrase) || ariaLabel.includes(phrase)) ||
			 href.includes('policy') || href.includes('cookie') || href.includes('privacy') || 
			 href.includes('data-protection') || href.includes('legal'))) {
			
			console.log('Cookie Consent Manager: Detected informational link, not clicking:', text);
			return false;
		}
	}
	
	// Mark this element as clicked before proceeding
	clickedElements.set(element, true);
	
	if (element && isElementVisible(element)) {
		// Check if this element might open a new tab or page
		const mightOpenNewTab = (element.tagName === 'A' && 
			(element.getAttribute('target') === '_blank' || 
			 element.getAttribute('rel')?.includes('noopener'))) ||
			(element.getAttribute('onclick') && 
			(element.getAttribute('onclick').includes('window.open') || 
			 element.getAttribute('onclick').includes('open(')));
		
		if (mightOpenNewTab) {
			// Do a final safety check - don't click links with phrases that suggest information pages
			const text = element.textContent.toLowerCase().trim();
			const informationalPhrases = ['more about', 'learn more', 'read more', 'cookie policy', 'privacy policy'];
			
			if (informationalPhrases.some(phrase => text.includes(phrase))) {
				console.log('Cookie Consent Manager: Skipping link that appears to be informational:', text);
				return false;
			}
			
			// Record this as a potential new tab trigger
			const currentUrl = window.location.href;
			chrome.storage.local.get(['recentlyOpenedTabs'], (result) => {
				const recentlyOpenedTabs = result.recentlyOpenedTabs || [];
				recentlyOpenedTabs.push({
					url: currentUrl,
					timestamp: Date.now()
				});
				chrome.storage.local.set({ recentlyOpenedTabs: recentlyOpenedTabs });
			});
		}
		
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
				
				// Simulate the click but prevent default behavior
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
		} else if (isInDialog || element.tagName === 'BUTTON' || element.tagName === 'A' || 
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

/**
 * Analyzes the source code of a cookie consent box to evaluate the smart formula's effectiveness
 * @param {string} source - HTML source code of the cookie consent box
 * @returns {Object} Analysis result with recommendations
 */
function analyzeBoxSource(source) {
	try {
		// Validate input
		if (!source || typeof source !== 'string') {
			console.error('Invalid source input:', source);
			return {
				error: true,
				errorDetails: 'Invalid source input. Expected a string but received: ' + 
					(source === null ? 'null' : typeof source)
			};
		}
		
		// Create a temporary container to parse the source
		const container = document.createElement('div');
		container.innerHTML = source;
		
		// Check if the source contains cookie consent related terms
		const text = container.textContent.toLowerCase();
		const innerHTML = container.innerHTML.toLowerCase();
		
		// Check for cookie-related terms
		const hasCookieTerms = ukPrivacyTerms.some(term => 
			text.includes(term) || innerHTML.includes(term)
		);
		
		// Check for buttons
		const buttons = container.querySelectorAll('button, a[role="button"], [type="button"], [type="submit"], [class*="button"], [class*="btn"]');
		const hasButtons = buttons.length > 0;
		
		// Look for accept button
		let acceptButton, hasAcceptButton;
		try {
			acceptButton = findAcceptButton(container);
			hasAcceptButton = !!acceptButton;
		} catch (buttonError) {
			console.error('Error finding accept button:', buttonError);
			return {
				error: true,
				errorDetails: 'Error finding accept button: ' + buttonError.message
			};
		}
		
		// Look for necessary cookies button
		let necessaryButton, hasNecessaryButton;
		try {
			necessaryButton = findNecessaryCookiesButton(container);
			hasNecessaryButton = !!necessaryButton;
		} catch (buttonError) {
			console.error('Error finding necessary button:', buttonError);
			return {
				error: true,
				errorDetails: 'Error finding necessary button: ' + buttonError.message
			};
		}
		
		// Check if this is a form
		const isForm = container.querySelector('form') !== null;
		
		// Evaluate smart formula effectiveness
		const effective = hasCookieTerms && (hasAcceptButton || hasNecessaryButton);
		
		// Generate recommendations for formula improvements
		let recommendations = [];
		
		if (!hasCookieTerms) {
			recommendations.push('Add more cookie/privacy-related terms to detection patterns');
		}
		
		if (!hasButtons && !isForm) {
			recommendations.push('Improve detection of non-standard interactive elements');
		}
		
		if (!hasAcceptButton && !hasNecessaryButton) {
			recommendations.push('Enhance button detection for non-standard naming patterns');
			// Check what text the buttons have to provide specific recommendations
			if (buttons.length > 0) {
				const buttonTexts = Array.from(buttons)
					.map(b => b.textContent.trim())
					.filter(t => t.length > 0);
				if (buttonTexts.length > 0) {
					recommendations.push(`Add pattern matching for button texts like: ${buttonTexts.join(', ')}`);
				}
			}
		}
		
		// Check for common structures that might be missed
		let missingStructures = [];
		try {
			missingStructures = identifyMissingStructures(container);
		} catch (structureError) {
			console.error('Error identifying missing structures:', structureError);
			// Don't fail the whole analysis, just log the error
		}
		
		if (missingStructures.length > 0) {
			recommendations = [...recommendations, ...missingStructures];
		}
		
		return {
			detected: effective,
			hasCookieTerms,
			hasButtons,
			hasAcceptButton,
			hasNecessaryButton,
			isForm,
			acceptButtonText: acceptButton ? acceptButton.textContent.trim() : null,
			necessaryButtonText: necessaryButton ? necessaryButton.textContent.trim() : null,
			recommendations
		};
	} catch (error) {
		console.error('Error analyzing box source:', error);
		return {
			error: true,
			errorDetails: error.message || 'An unknown error occurred during analysis'
		};
	}
}

/**
 * Identifies missing patterns or structures in the smart formula
 * @param {HTMLElement} container - The parsed content container
 * @returns {Array} List of recommendations for missing patterns
 */
function identifyMissingStructures(container) {
	const recommendations = [];
	
	// Check for unusual but recognizable cookie consent structures
	
	// 1. Check for iframe-based cookie notices
	if (container.querySelector('iframe')) {
		recommendations.push('Add support for iframe-based cookie notices');
	}
	
	// 2. Check for shadow DOM usage (can only detect hints of it in source)
	if (container.innerHTML.includes('shadowroot') || 
		container.innerHTML.includes('shadow-root') ||
		container.querySelector('[data-shadow]')) {
		recommendations.push('Consider adding shadow DOM traversal for cookie notices');
	}
	
	// 3. Check for unusual class naming patterns
	const classes = Array.from(container.querySelectorAll('[class]'))
		.map(el => el.className)
		.join(' ');
	
	if (classes.includes('privacy') && !classes.includes('cookie')) {
		recommendations.push('Add more privacy-focused class detection patterns');
	}
	
	if (classes.includes('gdpr') && !classes.includes('cookie')) {
		recommendations.push('Enhance GDPR-specific element detection');
	}
	
	if (classes.includes('cmp') || classes.includes('cmpbox')) {
		recommendations.push('Add detection for CMP (Consent Management Platform) standard elements');
	}
	
	return recommendations;
}

/**
 * Process an element that has been identified as a cookie consent dialog
 * @param {Element} element - The element containing the cookie consent dialog
 * @param {string} selector - The selector used to identify the element
 * @param {string} method - The method used to detect the dialog
 */
function processCookieElement(element, selector, method) {
	// Skip auto-accepting if this tab was opened by our extension
	if (openedByExtension && settings.autoAccept) {
		console.log('Cookie Consent Manager: Skipping auto-accept on tab opened by extension');
		captureDialog(element, selector, method + '-no-autoaccept');
		return true;
	}
	
	// First, check for buttons
	const isPremiumUser = settings.gdprCompliance; // This would be replaced with actual premium check
	
	if (isPremiumUser && settings.gdprCompliance && detectRegion(window.location.hostname) === 'uk') {
		// For GDPR compliance, try to find necessary-only button first
		const necessaryButton = findNecessaryCookiesButton(element);
		if (necessaryButton) {
			// Extra safety check - don't click if it's an informational link
			if (necessaryButton.tagName === 'A' && 
				((necessaryButton.getAttribute('target') === '_blank') ||
				 (necessaryButton.getAttribute('rel')?.includes('noopener')))) {
				
				const buttonText = necessaryButton.textContent.toLowerCase().trim();
				const informationalPhrases = ['more about', 'learn more', 'read more', 'cookie policy', 'privacy policy'];
				
				if (informationalPhrases.some(phrase => buttonText.includes(phrase))) {
					console.log('Cookie Consent Manager: Not clicking button that appears to be informational:', buttonText);
					captureDialog(element, 'smart-detection-skipped', 'smart-gdpr-informational');
					return true;
				}
			}
			
			console.log('Cookie Consent Manager: Found necessary cookies button in banner', element);
			captureDialog(element, 'smart-detection-necessary', 'smart-gdpr');
			
			// Only click if autoAccept is enabled - with longer delay
			if (settings.autoAccept) {
				setTimeout(() => clickElement(necessaryButton), 800);
			}
			return true;
		}
	}
	
	// If no necessary button found or GDPR compliance is off, try the regular accept button
	const acceptButton = findAcceptButton(element);
	if (acceptButton) {
		// Extra safety check - don't click if it's an informational link
		if (acceptButton.tagName === 'A' && 
			((acceptButton.getAttribute('target') === '_blank') ||
			 (acceptButton.getAttribute('rel')?.includes('noopener')))) {
			
			const buttonText = acceptButton.textContent.toLowerCase().trim();
			const href = acceptButton.getAttribute('href') || '';
			const informationalPhrases = [
				'more about', 'learn more', 'read more', 'cookie policy', 'privacy policy',
				'cookie information', 'more information', 'our cookies', 'data protection'
			];
			
			if (informationalPhrases.some(phrase => buttonText.includes(phrase)) || 
				href.includes('policy') || href.includes('cookie') || href.includes('privacy')) {
				console.log('Cookie Consent Manager: Not clicking button that appears to be informational:', buttonText);
				captureDialog(element, 'smart-detection-skipped', 'smart-informational');
				return true;
			}
		}
		
		console.log('Cookie Consent Manager: Found accept button in banner', element);
		captureDialog(element, 'smart-detection', 'smart');
		
		// Only click if autoAccept is enabled - with longer delay
		if (settings.autoAccept) {
			setTimeout(() => clickElement(acceptButton), 800);
		}
		return true;
	}
	
	return false;
}