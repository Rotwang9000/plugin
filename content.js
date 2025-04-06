// Import modules
import { findAcceptButton, findRejectButton, findNecessaryCookiesButton, findSettingsButton } from './src/detection/button-recognition.js';
import { isCookieConsentDialog, findCookieConsentDialogs, analyzeDialogSource, extractDialogElements } from './src/detection/smart-detection.js';
import { matchDialogWithCloudPatterns, detectWithCloudPatterns, findButtonInDialog } from './src/detection/cloud-detection.js';
import { formatHtmlWithLineNumbers, escapeHtml, safeGetHtmlContent, createViewableHtmlDocument } from './src/modules/html-utils.js';
import { createElement, clearElement, toggleClass, queryAndProcess, addDebouncedEventListener } from './src/modules/dom-utils.js';
import { getSettings, saveSettings, saveDialogToHistory, dataCollectionConsent } from './src/modules/storage.js';
import { sendMessageToBackground } from './src/api/messaging.js';

// Configuration
let settings = {
	enabled: true,
	autoAccept: true,
	smartMode: true,
	cloudMode: true,
	privacyMode: true,  // New privacy setting to control data collection
	gdprCompliance: true, // UK/EU GDPR compliance mode
	devMode: false
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

// Store click timestamps to avoid multiple clicks
let lastClickTime = 0;
const MIN_CLICK_INTERVAL = 1000; // 1 second

// Store element references to avoid re-querying
let dialogElements = [];

/**
 * Check if this is first visit to the domain today
 * @returns {boolean} - Whether this is the first visit to the domain today
 */
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

/**
 * Check if we're on a GET request page (not POST)
 * @returns {boolean} - Whether this is a GET request page
 */
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

/**
 * Load settings from storage
 * @param {Function} callback - Callback function with settings
 */
function loadSettings(callback) {
	try {
		chrome.storage.sync.get({
			enabled: true,
			autoAccept: true,
			smartMode: true,
			cloudMode: false,
			privacyMode: false,
			gdprCompliance: false,
			devMode: false
		}, function(loadedSettings) {
			try {
				settings = loadedSettings;
				if (callback && typeof callback === 'function') {
					callback(settings);
				}
			} catch (err) {
				console.log('Error processing Chrome storage settings, falling back to localStorage', err);
				loadFromLocalStorage(callback);
			}
		});
	} catch (error) {
		console.log('Error accessing Chrome storage, falling back to localStorage', error);
		loadFromLocalStorage(callback);
	}
}

/**
 * Alternative localStorage implementation as fallback
 * @param {Function} callback - Callback function with settings
 */
function loadFromLocalStorage(callback) {
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
				gdprCompliance: false,
				devMode: false
			};
			console.log('Using default settings (no localStorage fallback found)');
		}
		if (callback && typeof callback === 'function') {
			callback(settings);
		}
	} catch (e) {
		console.error('Error parsing localStorage settings', e);
		// Use defaults in case of any error
		settings = {
			enabled: true,
			autoAccept: true,
			smartMode: true,
			cloudMode: false,
			privacyMode: false,
			gdprCompliance: false,
			devMode: false
		};
		if (callback && typeof callback === 'function') {
			callback(settings);
		}
	}
}

/**
 * Get data collection consent status
 * @param {Function} callback - Callback with consent status
 */
function getDataCollectionConsent(callback) {
	chrome.storage.local.get(['dataCollectionConsent'], (result) => {
		dataCollectionConsent = result.dataCollectionConsent === true;
		if (callback && typeof callback === 'function') {
			callback(dataCollectionConsent);
		}
	});
}

/**
 * Detect region based on domain and other factors
 * @param {string} domain - Domain name
 * @returns {string} - Detected region code
 */
function detectRegion(domain) {
	// Check for regional TLDs
	if (domain.endsWith('.uk') || domain.endsWith('.co.uk') || domain.endsWith('.eu')) {
		return 'eu';  // Return EU for UK/EU domains
	}
	
	// Check for browser language
	const navigatorLanguage = navigator.language || navigator.userLanguage;
	if (navigatorLanguage) {
		const language = navigatorLanguage.split('-')[0].toLowerCase();
		if (['en', 'fr', 'de', 'es', 'it', 'nl', 'pt', 'da', 'sv', 'fi', 'el', 'cs', 'et', 'hu', 'lv', 'lt', 'mt', 'pl', 'sk', 'sl'].includes(language)) {
			return 'eu';  // European languages
		}
	}
	
	// Default to generic region if unknown
	return 'global';
}

/**
 * Initialize cookie consent manager
 */
function initCookieConsentManager() {
	// Load settings first
	loadSettings(settings => {
		// Check for data collection consent
		getDataCollectionConsent(() => {
			// Only run if enabled
			if (settings.enabled) {
				// Check if cookie banner detection should run (first visit + GET request)
				if (isFirstVisitToday() && isGetRequest()) {
					// Run cookie banner detection modes based on settings
					if (settings.cloudMode) {
						runCloudMode();
					}
					
					if (settings.smartMode) {
						runSmartMode();
					}
				} else {
					// Check for banners on the page already
					checkExistingElements();
				}
			}
		});
	});
}

/**
 * Run cloud mode detection
 */
function runCloudMode() {
	if (!settings.cloudMode) return;
	
	// Get the current domain
	const domain = window.location.hostname;
	
	// Detect region
	const region = detectRegion(domain);
	
	// Look for cloud database patterns
	const domainPatterns = findSimilarPatterns(region);
	
	// Check selectors from cloud database
	domainPatterns.forEach(pattern => {
		try {
			// Try to find elements matching this pattern
			if (pattern.selector) {
				const elements = document.querySelectorAll(pattern.selector);
				if (elements.length > 0) {
					// Process the first matching element
					const element = elements[0];
					
					// Verify it's a cookie dialog
					if (isCookieConsentDialog(element)) {
						// Process the dialog
						processCookieElement(element, pattern.selector, 'cloud');
						
						// If auto-accept is enabled, click the button
						if (settings.autoAccept) {
							if (settings.gdprCompliance && settings.privacyMode && pattern.necessary) {
								// For GDPR compliance with privacy mode, look for necessary-only option
								const necessaryButton = findNecessaryCookiesButton(element);
								if (necessaryButton) {
									clickElement(necessaryButton);
								}
							} else {
								// Otherwise, look for accept button
								const acceptButton = findAcceptButton(element);
								if (acceptButton) {
									clickElement(acceptButton);
								}
							}
						}
					}
				}
			}
		} catch (e) {
			// Ignore errors for individual patterns
			console.error('Error processing pattern', e);
		}
	});
}

/**
 * Find patterns similar to the current page
 * @param {string} region - Detected region code
 * @returns {Array} - Array of matching patterns
 */
function findSimilarPatterns(region) {
	const patterns = [];
	
	// Add default common patterns
	if (cloudDatabase.common) {
		patterns.push(...cloudDatabase.common);
	}
	
	// Add EU-specific patterns if in EU
	if (region === 'eu' && cloudDatabase.eu) {
		patterns.push(...cloudDatabase.eu);
	}
	
	// Sort by rating (highest first)
	return patterns.sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

/**
 * Run smart mode detection
 */
function runSmartMode() {
	if (!settings.smartMode) return;
	
	// First check existing elements
	checkExistingElements();
	
	// Set up MutationObserver to watch for new elements
	const observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			// Check for added nodes
			if (mutation.addedNodes && mutation.addedNodes.length > 0) {
				mutation.addedNodes.forEach(node => {
					// Only process Element nodes
					if (node.nodeType === Node.ELEMENT_NODE) {
						checkElementForCookieBanner(node);
					}
				});
			}
		});
	});
	
	// Start observing the document with the configured parameters
	observer.observe(document.body, { childList: true, subtree: true });
	
	// Stop observing after a reasonable time (30 seconds)
	setTimeout(() => {
		observer.disconnect();
	}, 30000);
}

/**
 * Check existing elements for cookie banners
 */
function checkExistingElements() {
	// Look for common cookie banner elements
	const bannerSelectors = [
		'div[class*="cookie"]',
		'div[id*="cookie"]',
		'div[class*="gdpr"]',
		'div[id*="gdpr"]',
		'div[class*="consent"]',
		'div[id*="consent"]',
		'div[class*="privacy"]',
		'div[id*="privacy"]'
	];
	
	// Join selectors and query all
	const elements = document.querySelectorAll(bannerSelectors.join(','));
	
	// Check each element
	elements.forEach(element => {
		checkElementForCookieBanner(element);
	});
}

/**
 * Check if an element is a cookie banner
 * @param {Element} element - Element to check
 */
function checkElementForCookieBanner(element) {
	// Ignore certain elements
	if (!element || !element.tagName || element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
		return;
	}
	
	// Check if element or its children might be a cookie banner
	if (isCookieConsentDialog(element)) {
		processCookieElement(element, null, 'smart');
		
		// If auto-accept is enabled, click the button
		if (settings.autoAccept) {
			if (settings.gdprCompliance && settings.privacyMode) {
				// For GDPR compliance with privacy mode, look for necessary-only option
				const necessaryButton = findNecessaryCookiesButton(element);
				if (necessaryButton) {
					clickElement(necessaryButton);
				} else {
					// If no necessary button, try reject button as a fallback
					const rejectButton = findRejectButton(element);
					if (rejectButton) {
						clickElement(rejectButton);
					}
				}
			} else {
				// Otherwise, look for accept button
				const acceptButton = findAcceptButton(element);
				if (acceptButton) {
					clickElement(acceptButton);
				}
			}
		}
	} else {
		// Check if any child elements might be cookie banners
		const children = element.children;
		if (children && children.length > 0) {
			for (let i = 0; i < children.length; i++) {
				checkElementForCookieBanner(children[i]);
			}
		}
	}
}

/**
 * Check if an element has a high z-index
 * @param {Element} element - Element to check
 * @returns {boolean} - Whether the element has a high z-index
 */
function hasHighZIndex(element) {
	// Get computed style
	const style = window.getComputedStyle(element);
	
	// Check z-index
	const zIndex = parseInt(style.zIndex, 10);
	if (!isNaN(zIndex) && zIndex > 10) {
		return true;
	}
	
	// Check position (fixed or absolute are commonly used for overlays)
	const position = style.position;
	if (position === 'fixed' || position === 'absolute') {
		// Check if it's positioned near the edges
		const top = parseInt(style.top, 10);
		const bottom = parseInt(style.bottom, 10);
		const left = parseInt(style.left, 10);
		const right = parseInt(style.right, 10);
		
		// Elements positioned at edges are often banners/popups
		if (
			(!isNaN(top) && top <= 20) ||
			(!isNaN(bottom) && bottom <= 20) ||
			(!isNaN(left) && left <= 20) ||
			(!isNaN(right) && right <= 20)
		) {
			return true;
		}
	}
	
	return false;
}

/**
 * Capture a dialog element
 * @param {Element} element - Dialog element to capture
 * @param {string} selector - Selector used to find the element
 * @param {string} method - Detection method
 * @returns {Object} - Captured dialog object
 */
function captureDialog(element, selector, method) {
	// Get the element's HTML
	const html = element.outerHTML;
	
	// Create a sanitized clone for capture
	let sanitizedElement = element.cloneNode(true);
	
	// Apply privacy sanitization if enabled and consent is given
	if (settings.privacyMode && dataCollectionConsent) {
		sanitizedElement = sanitizePrivateData(sanitizedElement);
	}
	
	// Extract key information
	const domain = window.location.hostname;
	const url = sanitizeUrl(window.location.href);
	const timestamp = Date.now();
	const id = `dialog_${domain}_${timestamp}_${Math.random().toString(36).substring(2, 10)}`;
	
	// Extract important elements
	const detectedElements = extractDialogElements(element);
	
	// Analyze the dialog content
	const analysis = analyzeDialogSource(html);
	
	// Create captured dialog object
	const dialog = {
		id: id,
		domain: domain,
		url: url,
		timestamp: timestamp,
		html: sanitizedElement.outerHTML,
		selector: selector,
		method: method,
		score: analysis.score,
		confidence: analysis.confidence,
		detectedElements: detectedElements,
		reviewed: false
	};
	
	// Store in local array
	capturedDialogs.push(dialog);
	
	// Store in local storage for persistence
	saveDialogToHistory(dialog);
	
	// Send to background script to update badge
	sendMessageToBackground({ action: 'dialogCaptured', dialog });
	
	return dialog;
}

/**
 * Sanitize private data from an element
 * @param {Element} element - Element to sanitize
 * @returns {Element} - Sanitized element
 */
function sanitizePrivateData(element) {
	// Create a copy to avoid modifying the original
	const sanitized = element.cloneNode(true);
	
	// Sanitize text content in sensitive elements
	const textElements = sanitized.querySelectorAll('input, textarea, [contenteditable="true"]');
	textElements.forEach(el => {
		// Clear value attribute and content
		if (el.hasAttribute('value')) {
			el.setAttribute('value', '[REDACTED]');
		}
		el.textContent = '[REDACTED]';
	});
	
	// Look for email addresses in text nodes
	const walker = document.createTreeWalker(sanitized, NodeFilter.SHOW_TEXT);
	const textNodes = [];
	while (walker.nextNode()) {
		textNodes.push(walker.currentNode);
	}
	
	// Sanitize text nodes
	textNodes.forEach(node => {
		let text = node.nodeValue;
		
		// Replace email patterns
		if (containsEmailPattern(text)) {
			text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
		}
		
		// Replace phone patterns
		if (containsPhonePattern(text)) {
			text = text.replace(/(\+?\d{1,3}[\s-]?)?\(?\d{3,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, '[PHONE REDACTED]');
		}
		
		// Replace UK postcodes
		if (containsUKPostcodePattern(text)) {
			text = text.replace(/[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/gi, '[POSTCODE REDACTED]');
		}
		
		node.nodeValue = text;
	});
	
	return sanitized;
}

/**
 * Check if text contains email pattern
 * @param {string} text - Text to check
 * @returns {boolean} - Whether the text contains an email pattern
 */
function containsEmailPattern(text) {
	return /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
}

/**
 * Check if text contains phone pattern
 * @param {string} text - Text to check
 * @returns {boolean} - Whether the text contains a phone pattern
 */
function containsPhonePattern(text) {
	return /(\+?\d{1,3}[\s-]?)?\(?\d{3,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/.test(text);
}

/**
 * Check if text contains UK postcode pattern
 * @param {string} text - Text to check
 * @returns {boolean} - Whether the text contains a UK postcode pattern
 */
function containsUKPostcodePattern(text) {
	return /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i.test(text);
}

/**
 * Sanitize URL to remove query parameters
 * @param {string} url - URL to sanitize
 * @returns {string} - Sanitized URL
 */
function sanitizeUrl(url) {
	try {
		const urlObj = new URL(url);
		return urlObj.origin + urlObj.pathname;
	} catch (e) {
		return url.split('?')[0]; // Basic fallback
	}
}

/**
 * Process a cookie element
 * @param {Element} element - Element to process
 * @param {string} selector - Selector used to find the element
 * @param {string} method - Detection method
 */
function processCookieElement(element, selector, method) {
	// Capture the dialog before taking action
	const dialog = captureDialog(element, selector, method);
	
	// Add to captured dialogs
	if (!capturedDialogs.some(d => d.id === dialog.id)) {
		capturedDialogs.push(dialog);
	}
	
	// Send message to background script
	sendMessageToBackground({
		action: 'cookieDialogDetected',
		dialog: dialog
	});
}

/**
 * Click an element
 * @param {Element} element - Element to click
 */
function clickElement(element) {
	if (!element || clickedElements.has(element)) {
		return; // Avoid clicking the same element multiple times
	}
	
	// Mark as clicked
	clickedElements.set(element, true);
	
	// Try different click methods
	try {
		// Method 1: Native click
		element.click();
	} catch (e1) {
		try {
			// Method 2: Synthetic click event
			const event = new MouseEvent('click', {
				view: window,
				bubbles: true,
				cancelable: true
			});
			element.dispatchEvent(event);
		} catch (e2) {
			try {
				// Method 3: Focus and enter key
				element.focus();
				const event = new KeyboardEvent('keydown', {
					key: 'Enter',
					code: 'Enter',
					keyCode: 13,
					which: 13,
					bubbles: true,
					cancelable: true
				});
				element.dispatchEvent(event);
			} catch (e3) {
				console.error('All click methods failed', e1, e2, e3);
			}
		}
	}
}

/**
 * Check if an element is visible
 * @param {Element} element - Element to check
 * @returns {boolean} - Whether the element is visible
 */
function isElementVisible(element) {
	if (!element) return false;
	
	const style = window.getComputedStyle(element);
	return style.display !== 'none' && 
	       style.visibility !== 'hidden' && 
	       style.opacity !== '0' &&
	       element.offsetParent !== null;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
	// Initialize the cookie consent manager
	initCookieConsentManager();
});

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	// Handle settings updates
	if (message.action === 'settingsUpdated') {
		// Update settings
		settings = message.settings;
		
		// Apply new settings
		if (settings.enabled) {
			// Only apply settings if the extension is enabled
			if (settings.autoAccept) {
				// Rerun the detector with new settings
				initCookieConsentManager();
			}
		}
		
		// Send confirmation
		sendResponse({ success: true });
	}
	
	// Handle check for cookie boxes request
	else if (message.action === 'checkForCookieBoxes') {
		try {
			const cookieElements = findCookieElements();
			const dialogFound = cookieElements.length > 0;
			
			sendResponse({ 
				dialogFound, 
				count: cookieElements.length,
				timeChecked: new Date().toISOString()
			});
		} catch (error) {
			sendResponse({ dialogFound: false, error: error.message });
		}
	}
	
	// Handle cookie action from popup (accept/customize)
	else if (message.action === 'handleCookieAction') {
		try {
			const cookieAction = message.cookieAction;
			const cookieElements = findCookieElements();
			
			if (cookieElements.length === 0) {
				sendResponse({ success: false, message: 'No cookie dialogs found' });
				return true;
			}
			
			// Try to find the appropriate button based on action type
			let success = false;
			for (const element of cookieElements) {
				if (cookieAction === 'accept') {
					// Try to find accept button
					success = clickAcceptButton(element);
				} else if (cookieAction === 'customize') {
					// Try to find customize/settings button
					success = clickCustomizeButton(element);
				}
				
				if (success) break;
			}
			
			sendResponse({ success });
		} catch (error) {
			sendResponse({ success: false, error: error.message });
		}
	}
	
	// Handle get captured dialogs request
	else if (message.action === 'getCapturedDialogs') {
		sendResponse({ dialogs: capturedDialogs });
	}
	
	// Handle get page source request
	else if (message.action === 'getPageSource') {
		try {
			// Clone body to avoid modifications
			const bodyClone = document.body.cloneNode(true);
			
			// Apply privacy sanitization if enabled
			if (settings.privacyMode) {
				sanitizePrivateData(bodyClone);
			}
			
			sendResponse({ html: bodyClone.outerHTML });
		} catch (error) {
			sendResponse({ error: error.message });
		}
	}
	
	// Return true to indicate async response
	return true;
});

/**
 * Find cookie consent dialogs on the page
 * @returns {Array} Array of cookie dialog elements
 */
function findCookieElements() {
	const cookieElements = [];
	
	// Find potential cookie banners by common selectors
	const commonSelectors = [
		// Common selectors for cookie consent dialogs
		'[id*="cookie"],[class*="cookie"]', 
		'[id*="gdpr"],[class*="gdpr"]',
		'[id*="consent"],[class*="consent"]',
		'[id*="privacy"],[class*="privacy"]',
		'.cc-window', // Common cookieconsent class
		'#CybotCookiebotDialog', // Common cookiebot ID
		'#onetrust-banner-sdk', // OneTrust
		'#cookie-law-info-bar', // Cookie Law Info
		// Add other common selectors
	];
	
	for (const selector of commonSelectors) {
		try {
			const elements = document.querySelectorAll(selector);
			elements.forEach(el => {
				if (isElementVisible(el) && hasHighZIndex(el)) {
					cookieElements.push(el);
				}
			});
		} catch (e) {
			console.error('Error with selector', selector, e);
		}
	}
	
	return cookieElements;
}

/**
 * Attempt to click an accept button within a cookie dialog
 * @param {Element} dialogElement - The cookie dialog element
 * @returns {boolean} True if successfully clicked an accept button
 */
function clickAcceptButton(dialogElement) {
	const acceptSelectors = [
		// Common accept button selectors
		'button[id*="accept"],button[class*="accept"]',
		'a[id*="accept"],a[class*="accept"]',
		'button:not([id*="reject"]):not([class*="reject"]):not([id*="settings"]):not([class*="settings"]):not([id*="customize"]):not([class*="customize"])',
		'[id*="btnaccept"],[class*="btnaccept"]',
		'[id*="agree"],[class*="agree"]',
		// Add more accept button selectors
	];
	
	for (const selector of acceptSelectors) {
		try {
			const buttons = dialogElement.querySelectorAll(selector);
			for (const button of buttons) {
				// Check if the button text contains accept-related words
				const buttonText = button.textContent.toLowerCase();
				if (buttonText.includes('accept') || 
					buttonText.includes('agree') || 
					buttonText.includes('allow') ||
					buttonText.includes('ok') ||
					buttonText.includes('consent')) {
					
					// Click the button
					button.click();
					return true;
				}
			}
		} catch (e) {
			console.error('Error with accept selector', selector, e);
		}
	}
	
	return false;
}

/**
 * Attempt to click a customize/settings button within a cookie dialog
 * @param {Element} dialogElement - The cookie dialog element
 * @returns {boolean} True if successfully clicked a customize button
 */
function clickCustomizeButton(dialogElement) {
	const customizeSelectors = [
		// Common customize/settings button selectors
		'button[id*="settings"],button[class*="settings"]',
		'button[id*="customize"],button[class*="customize"]',
		'button[id*="preference"],button[class*="preference"]',
		'a[id*="settings"],a[class*="settings"]',
		'a[id*="customize"],a[class*="customize"]',
		'a[id*="preference"],a[class*="preference"]',
		'[id*="manage"],[class*="manage"]',
		// Add more customize button selectors
	];
	
	for (const selector of customizeSelectors) {
		try {
			const buttons = dialogElement.querySelectorAll(selector);
			for (const button of buttons) {
				// Check if the button text contains customize-related words
				const buttonText = button.textContent.toLowerCase();
				if (buttonText.includes('settings') || 
					buttonText.includes('customize') || 
					buttonText.includes('preference') ||
					buttonText.includes('manage') ||
					buttonText.includes('choose') ||
					buttonText.includes('select') ||
					buttonText.includes('cookie')) {
					
					// Click the button
					button.click();
					return true;
				}
			}
		} catch (e) {
			console.error('Error with customize selector', selector, e);
		}
	}
	
	return false;
} 