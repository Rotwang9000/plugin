// Import modules
import { findAcceptButton, findRejectButton, findNecessaryCookiesButton, findSettingsButton, findAcceptButtonSync } from './src/detection/button-recognition.js';
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
	preferEssential: false, // Prefer essential cookies (basic mode)
	buttonPreferences: {    // Advanced preferences for premium users
		order: ["essential", "reject", "accept"],
		enabled: {
			essential: true,
			reject: true,
			accept: true
		}
	},
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

// Selectors will be loaded from JSON file
let selectors = {
	cookieDialogSelectors: [],
	dialogTypes: {},
	buttonTypes: {}
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

// Session tracking to prevent closing the same popup twice
const processedDialogsInSession = new Set();

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

// Detection timeout settings
const DETECTION_TIMEOUT = 10000; // 10 seconds
const processedPopupDomains = new Set(); // Track domains where we've already closed a popup
let detectionTimer = null; // Timer to stop detection

// Add this after the existing MutationObserver variables at the top
let allObservers = []; // Store all observers to disconnect them when needed

/**
 * Load selectors from external JSON file
 * @returns {Promise} Promise that resolves when selectors are loaded
 */
function loadSelectors() {
	return fetch('selectors.json')
		.then(response => {
			if (!response.ok) {
				throw new Error(`Failed to load selectors: ${response.status} ${response.statusText}`);
			}
			return response.json();
		})
		.then(data => {
			selectors = data;
			console.log('Selectors loaded successfully');
		})
		.catch(error => {
			console.error('Error loading selectors:', error);
			// Fall back to default selectors if loading fails
		});
}

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
			preferEssential: false,
			buttonPreferences: {
				order: ["essential", "reject", "accept"],
				enabled: {
					essential: true,
					reject: true,
					accept: true
				}
			},
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
				preferEssential: false,
				buttonPreferences: {
					order: ["essential", "reject", "accept"],
					enabled: {
						essential: true,
						reject: true,
						accept: true
					}
				},
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
	// IMMEDIATELY check if disabled before doing anything
	if (!settings || !settings.enabled) {
		console.log('Cookie Consent Manager is disabled, aborting initialization');
		return;
	}
	
	// Load selectors first
	loadSelectors()
		.then(() => {
			// Then load settings
			loadSettings(settings => {
				// Double-check enabled status after settings load
				if (!settings.enabled) {
					console.log('Cookie Consent Manager is disabled after settings load, aborting');
					return;
				}
				
				// Check for data collection consent
				getDataCollectionConsent(() => {
					// Only run if enabled
					if (settings.enabled) {
						// Check if cookie banner detection should run (first visit + GET request)
						if (isFirstVisitToday() && isGetRequest()) {
							// Run cookie banner detection modes based on settings
							// Note: Cloud mode is a coming soon feature - disabled for now
							// if (settings.cloudMode) {
							//    runCloudMode();
							// }
							
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
		})
		.catch(error => {
			console.error('Error initializing cookie consent manager:', error);
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
						
						// If auto-accept is enabled, click appropriate button based on preferences
						if (settings.autoAccept) {
							clickAppropriateButton(element);
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
	// Skip if smart mode is disabled or extension is disabled
	if (!settings.smartMode || !settings.enabled) return;
	
	// First check existing elements
	checkExistingElements();
	
	// Set up MutationObserver to watch for new elements
	const observer = new MutationObserver(mutations => {
		// Skip if extension is disabled
		if (!settings.enabled) return;
		
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
	
	// Store the observer so we can disconnect it later if needed
	allObservers.push(observer);
	
	// Listen for page load complete and start the detection timeout
	if (document.readyState === 'complete') {
		startDetectionTimeout();
	} else {
		window.addEventListener('load', startDetectionTimeout);
	}
}

/**
 * Start detection timeout after page load
 */
function startDetectionTimeout() {
	// Skip if extension is disabled
	if (!settings || !settings.enabled) return;
	
	// Clear any existing timer
	if (detectionTimer) {
		clearTimeout(detectionTimer);
	}
	
	// Set new timer to stop detection after DETECTION_TIMEOUT milliseconds
	detectionTimer = setTimeout(() => {
		// Aggressively stop all detection with no exceptions
		stopAllDetection();
		console.log(`Cookie detection forcibly stopped after ${DETECTION_TIMEOUT/1000} seconds`);
	}, DETECTION_TIMEOUT);
	
	// Also set a secondary failsafe timer for extra protection
	setTimeout(() => {
		if (allObservers.length > 0 || detectionTimer) {
			console.log('Failsafe timer triggered - forcing detection shutdown');
			stopAllDetection();
		}
	}, DETECTION_TIMEOUT + 1000); // 1 second after the primary timeout
}

/**
 * Check existing elements for cookie banners
 */
function checkExistingElements() {
	// Skip if extension is disabled - hardened check
	if (!settings || !settings.enabled) {
		console.log('Cookie Consent Manager: Extension disabled, skipping detection');
		return;
	}
	
	// Skip if detection has been explicitly stopped
	if (window.__cookieDetectionStopped) {
		console.log('Cookie Consent Manager: Detection explicitly stopped, skipping detection');
		return;
	}
	
	// Strict timeout check - skip if more than DETECTION_TIMEOUT milliseconds have passed since page load
	// This ensures we never check for cookies after the 10 second window
	if (window.performance && window.performance.timing) {
		const loadTime = window.performance.timing.loadEventEnd || 
			window.performance.timing.domContentLoadedEventEnd || 
			window.performance.timing.navigationStart;
		const currentTime = Date.now();
		
		// If page has been loaded for more than 10 seconds, skip detection
		if (loadTime && (currentTime - loadTime) > DETECTION_TIMEOUT) {
			console.log(`Cookie Consent Manager: Page loaded more than ${DETECTION_TIMEOUT/1000} seconds ago, detection stopped`);
			// Set detection stopped flag to prevent future checks
			window.__cookieDetectionStopped = true;
			return;
		}
	}
	
	// If we have loaded selectors, use those
	let bannerSelectors = selectors.cookieDialogSelectors || [
		'div[class*="cookie"]',
		'div[id*="cookie"]',
		'div[class*="gdpr"]',
		'div[id*="gdpr"]',
		'div[class*="consent"]',
		'div[id*="consent"]',
		'div[class*="privacy"]',
		'div[id*="privacy"]'
	];
	
	// AVOID data-* selectors that aren't specifically for cookie consent
	// Filter out any inadvertently added data attribute selectors
	bannerSelectors = bannerSelectors.filter(selector => {
		// Keep all non-data-attribute selectors
		if (!selector.includes('data-')) return true;
		
		// Only keep data attribute selectors that are specifically for cookies
		return selector.includes('data-cookie') || 
			selector.includes('data-consent') || 
			selector.includes('data-gdpr');
	});
	
	// Join selectors and query all
	const elements = document.querySelectorAll(bannerSelectors.join(','));
	
	// Check each element
	elements.forEach(element => {
		checkElementForCookieBanner(element);
	});
	
	// Check for X/Grok history windows - but only if explicitly in selectors
	if (selectors.dialogTypes && selectors.dialogTypes.xGrokHistory) {
		const xGrokSelectors = selectors.dialogTypes.xGrokHistory.selectors || [];
		
		// Skip if on Twitter/X domain
		const isTwitterOrX = window.location.hostname.includes('twitter.com') || 
							window.location.hostname.includes('x.com');
		
		if (!isTwitterOrX && xGrokSelectors.length > 0) {
			const xGrokElements = document.querySelectorAll(xGrokSelectors.join(','));
			
			xGrokElements.forEach(element => {
				// Process but do not close automatically
				processCookieElement(element, null, 'xGrok');
			});
		}
	}
}

/**
 * Check if an element is a cookie banner
 * @param {Element} element - Element to check
 */
function checkElementForCookieBanner(element) {
	// Skip if extension is disabled
	if (!settings.enabled) return;
	
	// Ignore certain elements
	if (!element || !element.tagName || element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
		return;
	}
	
	// Check if element or its children might be a cookie banner
	if (isCookieConsentDialog(element)) {
		processCookieElement(element, null, 'smart');
		
		// If auto-accept is enabled, click the appropriate button based on preferences
		if (settings.autoAccept && settings.enabled) {
			clickAppropriateButton(element);
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
	// Skip everything if the extension is disabled
	if (!settings.enabled) {
		console.log('Cookie Consent Manager is disabled, skipping dialog detection');
		return;
	}
	
	// Generate a unique identifier for this dialog
	const dialogId = generateDialogId(element);
	
	// Skip if we've already processed this exact dialog in this session
	if (processedDialogsInSession.has(dialogId)) {
		console.log('Dialog already processed in this session, skipping:', dialogId);
		return;
	}
	
	// Get current domain to check if we've already processed a popup on this domain
	const currentDomain = window.location.hostname;
	const isDomainProcessed = processedPopupDomains.has(currentDomain);
	
	// Mark this dialog as processed in this session
	processedDialogsInSession.add(dialogId);
	
	// Capture the dialog before taking action
	const dialog = captureDialog(element, selector, method);
	
	// Add to captured dialogs
	if (!capturedDialogs.some(d => d.id === dialog.id)) {
		capturedDialogs.push(dialog);
	}
	
	// Send message to background script - always do this for reporting purposes
	// even if autoAccept is disabled
	sendMessageToBackground({
		action: 'cookieDialogDetected',
		dialog: dialog
	});
	
	// Only auto-accept if:
	// 1. It's not an X/Grok history window
	// 2. Auto-accept is enabled in settings
	// 3. We haven't already processed a popup on this domain in this session
	if (method !== 'xGrok' && settings.autoAccept && !isDomainProcessed) {
		console.log('Auto-accepting cookie dialog:', 
			method, selector ? selector : '[detected element]');
		processedPopupDomains.add(currentDomain); // Mark this domain as processed
		clickAppropriateButton(element);
	} else if (!settings.autoAccept) {
		console.log('Auto-accept is disabled, only detecting dialog for reporting');
	} else if (isDomainProcessed) {
		console.log('Already processed a dialog on this domain, skipping auto-accept');
	} else if (method === 'xGrok') {
		console.log('X/Grok dialog detected, skipping auto-accept');
	}
}

/**
 * Generate a unique identifier for a dialog element
 * @param {Element} element - The dialog element
 * @returns {string} A unique identifier
 */
function generateDialogId(element) {
	// Create a signature based on element properties
	const tag = element.tagName || '';
	const id = element.id || '';
	const classes = Array.from(element.classList || []).join('');
	const rect = element.getBoundingClientRect();
	const position = `${Math.round(rect.top)}_${Math.round(rect.left)}_${Math.round(rect.width)}_${Math.round(rect.height)}`;
	const textContent = element.textContent?.substring(0, 100) || '';
	
	// Create a hash of these properties
	return `${tag}_${id}_${classes}_${position}_${textContent.replace(/\s+/g, '')}`.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Click an element
 * @param {Element} element - Element to click
 * @returns {boolean} Whether the click was successful
 */
function clickElement(element) {
	// IMMEDIATELY abort if disabled
	if (!settings || !settings.enabled) {
		console.log('Cookie Consent Manager is disabled, aborting click');
		return false;
	}
	
	// Add more stringent duplicate click prevention
	// Check if element is null or already clicked
	if (!element) {
		console.log('Cannot click null element');
		return false;
	}
	
	if (clickedElements.has(element)) {
		console.log('Element already clicked, refusing to click again:', element.outerHTML.substring(0, 100));
		return false;
	}
	
	// Check if this is the same element by content (not just reference)
	// This handles cases where the DOM is recreated but visually the same button
	const elementSignature = generateElementSignature(element);
	if (elementSignature) {
		// Check if we've clicked anything with the same signature
		let alreadyClickedSimilar = false;
		clickedElements.forEach((value, key) => {
			const keySignature = generateElementSignature(key);
			if (keySignature && keySignature === elementSignature) {
				alreadyClickedSimilar = true;
			}
		});
		
		if (alreadyClickedSimilar) {
			console.log('Element with identical signature already clicked, refusing to click again');
			return false;
		}
	}
	
	// Mark as clicked BEFORE attempting the click
	clickedElements.set(element, true);
	
	// Extract button text for reporting
	const buttonText = element.textContent.trim().substring(0, 50);
	let buttonType = 'unknown';
	
	// Try to determine button type
	const text = element.textContent.toLowerCase();
	if (text.includes('accept') || text.includes('agree') || text.includes('allow')) {
		buttonType = 'accept';
	} else if (text.includes('reject') || text.includes('decline') || text.includes('refuse')) {
		buttonType = 'reject';
	} else if (text.includes('necessary') || text.includes('essential') || text.includes('required')) {
		buttonType = 'essential';
	} else if (text.includes('settings') || text.includes('preferences') || text.includes('customize')) {
		buttonType = 'customize';
	}
	
	let success = false;
	
	// Try different click methods
	try {
		// Method 1: Native click
		element.click();
		success = true;
	} catch (e1) {
		try {
			// Method 2: Synthetic click event
			const event = new MouseEvent('click', {
				view: window,
				bubbles: true,
				cancelable: true
			});
			success = element.dispatchEvent(event);
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
				success = element.dispatchEvent(event);
			} catch (e3) {
				console.error('All click methods failed', e1, e2, e3);
				success = false;
			}
		}
	}
	
	// If successful, notify background script
	if (success) {
		sendMessageToBackground({
			action: 'buttonClicked',
			buttonType: buttonType,
			buttonText: buttonText,
			timestamp: new Date().toISOString()
		});
		
		console.log(`Cookie Consent Manager: Successfully clicked ${buttonType} button: "${buttonText}"`);
	}
	
	return success;
}

/**
 * Generate a signature for an element to detect duplicates with different references
 * @param {Element} element - The element to generate a signature for
 * @returns {string} A signature string
 */
function generateElementSignature(element) {
	if (!element || !element.tagName) return null;
	
	try {
		// Create signature from element properties
		const tag = element.tagName || '';
		const id = element.id || '';
		const classes = Array.from(element.classList || []).join('');
		const text = element.textContent?.trim().substring(0, 50) || '';
		const rect = element.getBoundingClientRect();
		const position = `${Math.round(rect.width)}_${Math.round(rect.height)}`;
		
		return `${tag}_${id}_${classes}_${text}_${position}`.replace(/\s+/g, '');
	} catch (e) {
		console.error('Error generating element signature:', e);
		return null;
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
		// Store old enabled state for change detection
		const wasEnabled = settings ? settings.enabled : false;
		const wasAutoAccept = settings ? settings.autoAccept : false;
		
		// Update settings
		settings = message.settings;
		
		// Get the specific setting that was changed
		const changedSetting = message.changedSetting;
		const isEnabledChange = changedSetting === 'enabled';
		const isAutoAcceptChange = changedSetting === 'autoAccept';
		const isSmartModeChange = changedSetting === 'smartMode';
		
		console.log('Settings updated:', changedSetting, 'new value:', settings[changedSetting]);
		
		// CRITICAL ENABLED STATE HANDLING
		// If enabled was changed to false, aggressively stop all detection immediately
		if (isEnabledChange && !settings.enabled) {
			console.log('Extension was disabled, forcefully stopping all detection');
			stopAllDetection();
			// Send disabled state event for UI updates
			document.dispatchEvent(new CustomEvent('ccm-enabled-changed', { detail: false }));
			// Send confirmation of shutdown
			sendResponse({ success: true, action: 'detection_stopped' });
			return true;
		}
		
		// If the extension is now disabled (whether it was before or not), stop detection
		if (!settings.enabled) {
			console.log('Extension is disabled, ensuring detection is stopped');
			stopAllDetection();
			sendResponse({ success: true, action: 'detection_stopped' });
			return true;
		}
		
		// If the extension was just enabled (changed from disabled)
		if (settings.enabled && !wasEnabled) {
			console.log('Extension was just enabled, starting detection');
			// Force a clean start by stopping any existing detection first
			stopAllDetection();
			// Then start fresh
			initCookieConsentManager();
			// Send enabled state event for UI updates
			document.dispatchEvent(new CustomEvent('ccm-enabled-changed', { detail: true }));
			sendResponse({ success: true, action: 'detection_started' });
			return true;
		}
		
		// If auto-accept was just disabled but the extension is still enabled
		if (wasAutoAccept && !settings.autoAccept && settings.enabled) {
			console.log('Auto-accept was disabled, continuing detection without clicking');
			// No need to stop detection entirely, just won't auto-click
			sendResponse({ success: true, action: 'auto_accept_disabled' });
			return true;
		}
		
		// If auto-accept was just enabled and extension is enabled
		if (!wasAutoAccept && settings.autoAccept && settings.enabled) {
			console.log('Auto-accept was enabled, will now click on cookie banners');
			sendResponse({ success: true, action: 'auto_accept_enabled' });
			return true;
		}
		
		// If smart mode was toggled while extension is enabled
		if (isSmartModeChange && settings.enabled) {
			if (settings.smartMode) {
				console.log('Smart mode enabled, starting detection');
				runSmartMode();
			} else {
				console.log('Smart mode disabled, but extension still active');
				// Just don't run smart mode, but keep other detection active
			}
			sendResponse({ success: true, action: 'smart_mode_toggled' });
			return true;
		}
		
		// For any other setting changes while enabled
		if (settings.enabled) {
			console.log('Settings updated while extension is enabled');
			sendResponse({ success: true, action: 'settings_updated' });
			return true;
		}
		
		// Default success response
		sendResponse({ success: true });
	}
	
	// Handle immediate stop detection request (triggered when extension is disabled)
	else if (message.action === 'stopDetection') {
		// Update settings first
		if (message.settings) {
			settings = message.settings;
		} else {
			// If settings not provided, force disabled state
			if (settings) settings.enabled = false;
		}
		
		// Get the specific setting that was changed
		const changedSetting = message.changedSetting || 'enabled';
		
		console.log(`Received explicit stop detection due to ${changedSetting} change`);
		
		// Forcefully stop all detection
		stopAllDetection();
		
		// Send confirmation with explicit action
		sendResponse({ success: true, action: 'detection_force_stopped' });
		return true;
	}
	
	// Handle check for cookie boxes request
	else if (message.action === 'checkForCookieBoxes') {
		try {
			// Skip detection if extension is disabled
			if (!settings || !settings.enabled) {
				sendResponse({ dialogFound: false, disabled: true });
				return true;
			}
			
			// Enhanced timeout detection - don't process if we've been loaded for > 10 seconds
			if (window.performance && window.performance.timing) {
				const loadTime = window.performance.timing.loadEventEnd || window.performance.timing.domContentLoadedEventEnd;
				const currentTime = Date.now();
				
				if (loadTime && (currentTime - loadTime) > DETECTION_TIMEOUT) {
					console.log('Page loaded more than 10 seconds ago, skipping cookie box detection');
					sendResponse({ dialogFound: false, timedOut: true });
					return true;
				}
			}
			
			// Also respect the explicit detection stopped flag
			if (window.__cookieDetectionStopped) {
				console.log('Detection has been explicitly stopped, ignoring cookie box check');
				sendResponse({ dialogFound: false, stopped: true });
				return true;
			}
			
			const cookieElements = findCookieElements();
			const dialogFound = cookieElements.length > 0;
			let buttonClicked = null;
			let buttonText = null;
			
			// If dialog found and autoAccept is enabled, try to click the appropriate button
			if (dialogFound && settings.autoAccept) {
				for (const element of cookieElements) {
					// Try to click the button based on user preferences
					let clickSuccess = false;
					
					// Process asynchronously but return response immediately
					(async () => {
						// Check if we have advanced button preferences (premium users)
						if (settings.buttonPreferences && settings.buttonPreferences.order) {
							// Follow the preference order defined by the user
							for (const buttonType of settings.buttonPreferences.order) {
								// Skip disabled button types
								if (settings.buttonPreferences.enabled[buttonType] === false) {
									continue;
								}
								
								let button = null;
								
								// Find the appropriate button based on type
								switch (buttonType) {
									case 'essential':
										button = await findNecessaryCookiesButton(element);
										break;
									case 'reject':
										button = await findRejectButton(element);
										break;
									case 'accept':
										button = await findAcceptButton(element);
										break;
								}
								
								// If button found, click it and exit
								if (button) {
									buttonClicked = buttonType;
									buttonText = button.textContent.trim().substring(0, 50);
									clickSuccess = clickElement(button);
									if (clickSuccess) break;
								}
							}
						} else if (settings.preferEssential) {
							// Basic mode - prefer essential cookies if setting is enabled
							const necessaryButton = await findNecessaryCookiesButton(element);
							if (necessaryButton) {
								buttonClicked = 'essential';
								buttonText = necessaryButton.textContent.trim().substring(0, 50);
								clickSuccess = clickElement(necessaryButton);
							}
							
							// Fallback to accept button if necessary button not found
							if (!clickSuccess) {
								const acceptButton = await findAcceptButton(element);
								if (acceptButton) {
									buttonClicked = 'accept';
									buttonText = acceptButton.textContent.trim().substring(0, 50);
									clickSuccess = clickElement(acceptButton);
								}
							}
						} else {
							// Non-Pro mode default behavior:
							// 1. First try accept button (accept all cookies)
							const acceptButton = await findAcceptButton(element);
							if (acceptButton) {
								buttonClicked = 'accept';
								buttonText = acceptButton.textContent.trim().substring(0, 50);
								clickSuccess = clickElement(acceptButton);
								if (clickSuccess) return;
							}
							
							// 2. If accept button not found, try necessary cookies button
							if (!clickSuccess) {
								const necessaryButton = await findNecessaryCookiesButton(element);
								if (necessaryButton) {
									buttonClicked = 'essential';
									buttonText = necessaryButton.textContent.trim().substring(0, 50);
									clickSuccess = clickElement(necessaryButton);
								}
							}
							
							// 3. Reject buttons are not used in non-Pro mode
						}
					})();
					
					// For synchronous response, use findAcceptButtonSync
					// This ensures we can still respond quickly while the async process runs in background
					const syncAcceptButton = findAcceptButtonSync(element);
					if (syncAcceptButton) {
						buttonClicked = 'accept';
						buttonText = syncAcceptButton.textContent.trim().substring(0, 50);
						clickElement(syncAcceptButton);
						break;
					}
				}
			}
			
			// Send response with detailed information
			sendResponse({ 
				dialogFound, 
				count: cookieElements.length,
				buttonClicked: buttonClicked,
				buttonText: buttonText,
				timeChecked: new Date().toISOString()
			});
		} catch (error) {
			console.error('Error checking for cookie boxes:', error);
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
			
			// Process asynchronously but return response immediately
			(async () => {
				for (const element of cookieElements) {
					if (cookieAction === 'accept') {
						// Try to find accept button
						success = await clickAcceptButton(element);
					} else if (cookieAction === 'customize') {
						// Try to find customize/settings button
						success = await clickCustomizeButton(element);
					}
					
					if (success) break;
				}
			})();
			
			// Return a synchronous response
			sendResponse({ success: true });
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
	
	// Use loaded selectors if available
	const commonSelectors = selectors.cookieDialogSelectors || [
		// Common selectors for cookie consent dialogs
		'[id*="cookie"],[class*="cookie"]', 
		'[id*="gdpr"],[class*="gdpr"]',
		'[id*="consent"],[class*="consent"]',
		'[id*="privacy"],[class*="privacy"]',
		'.cc-window', // Common cookieconsent class
		'#CybotCookiebotDialog', // Common cookiebot ID
		'#onetrust-banner-sdk', // OneTrust
		'#cookie-law-info-bar', // Cookie Law Info
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
 * Click the appropriate button based on the user's preferences
 * @param {Element} element - The cookie dialog element
 */
async function clickAppropriateButton(element) {
	// IMMEDIATELY abort if disabled - hardened check
	if (!settings || !settings.enabled || !settings.autoAccept) {
		console.log('Cookie Consent Manager is disabled or auto-accept is off, aborting click');
		return;
	}
	
	// Check if we have advanced button preferences (premium users)
	if (settings.buttonPreferences && settings.buttonPreferences.order) {
		// Follow the preference order defined by the user
		for (const buttonType of settings.buttonPreferences.order) {
			// Skip disabled button types
			if (settings.buttonPreferences.enabled[buttonType] === false) {
				continue;
			}
			
			let button = null;
			
			// Find the appropriate button based on type
			switch (buttonType) {
				case 'essential':
					button = await findNecessaryCookiesButton(element);
					break;
				case 'reject':
					button = await findRejectButton(element);
					break;
				case 'accept':
					button = await findAcceptButton(element);
					break;
			}
			
			// If button found, click it and exit
			if (button) {
				console.log(`Cookie Consent Manager: Clicking ${buttonType} button based on user preferences`);
				clickElement(button);
				return;
			}
		}
	} else if (settings.preferEssential) {
		// Basic mode - prefer essential cookies if setting is enabled
		const necessaryButton = await findNecessaryCookiesButton(element);
		if (necessaryButton) {
			console.log('Cookie Consent Manager: Clicking essential cookies button');
			clickElement(necessaryButton);
			return;
		}
		
		// Fallback to accept button if necessary button not found
		const acceptButton = await findAcceptButton(element);
		if (acceptButton) {
			console.log('Cookie Consent Manager: No essential button found, clicking accept button');
			clickElement(acceptButton);
		}
	} else {
		// Non-Pro mode default behavior: 
		// 1. First try to click the accept button (accept all cookies)
		const acceptButton = await findAcceptButton(element);
		if (acceptButton) {
			console.log('Cookie Consent Manager: Clicking accept button (non-Pro default)');
			clickElement(acceptButton);
			return;
		}
		
		// 2. If accept button not found, try necessary cookies button as fallback
		const necessaryButton = await findNecessaryCookiesButton(element);
		if (necessaryButton) {
			console.log('Cookie Consent Manager: No accept button found, clicking essential cookies button');
			clickElement(necessaryButton);
			return;
		}
		
		// 3. Reject buttons are not used in non-Pro mode by default
	}
}

/**
 * Attempt to click an accept button within a cookie dialog
 * @param {Element} dialogElement - The cookie dialog element
 * @returns {boolean} True if successfully clicked an accept button
 */
async function clickAcceptButton(dialogElement) {
	// Try to find the button using the button-recognition module
	const acceptButton = await findAcceptButton(dialogElement);
	if (acceptButton) {
		return clickElement(acceptButton);
	}
	
	// Fall back to loaded selectors if no button found
	const acceptSelectors = selectors.buttonTypes?.accept?.selectors || [];
	const acceptTextPatterns = selectors.buttonTypes?.accept?.textPatterns || [];
	
	for (const selector of acceptSelectors) {
		try {
			const buttons = dialogElement.querySelectorAll(selector);
			for (const button of buttons) {
				// Check if the button text contains accept-related words
				const buttonText = button.textContent.toLowerCase();
				if (acceptTextPatterns.some(pattern => buttonText.includes(pattern))) {
					// Click the button
					return clickElement(button);
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
async function clickCustomizeButton(dialogElement) {
	// Try to find the button using the button-recognition module
	const settingsButton = await findSettingsButton(dialogElement);
	if (settingsButton) {
		return clickElement(settingsButton);
	}
	
	// Fall back to loaded selectors if no button found
	const customizeSelectors = selectors.buttonTypes?.customize?.selectors || [];
	const customizeTextPatterns = selectors.buttonTypes?.customize?.textPatterns || [];
	
	for (const selector of customizeSelectors) {
		try {
			const buttons = dialogElement.querySelectorAll(selector);
			for (const button of buttons) {
				// Check if the button text contains customize-related words
				const buttonText = button.textContent.toLowerCase();
				if (customizeTextPatterns.some(pattern => buttonText.includes(pattern))) {
					// Click the button
					return clickElement(button);
				}
			}
		} catch (e) {
			console.error('Error with customize selector', selector, e);
		}
	}
	
	return false;
}

/**
 * Completely stop all cookie detection
 * This is used when the extension is disabled or auto-accept is turned off
 */
function stopAllDetection() {
	console.log('Completely stopping all cookie detection mechanisms');
	
	// Clear detection timeout
	if (detectionTimer) {
		clearTimeout(detectionTimer);
		detectionTimer = null;
	}
	
	// Disconnect all observers we've tracked
	try {
		allObservers.forEach(observer => {
			if (observer && observer.disconnect) {
				observer.disconnect();
			}
		});
	} catch (e) {
		console.error('Error disconnecting tracked observers:', e);
	}
	
	// Clear the observers array
	allObservers = [];
	
	// Also clear any other observers that might be attached to elements
	try {
		const allElements = document.querySelectorAll('*');
		allElements.forEach(el => {
			// Try to find any stored observers on the element
			if (el._observer) {
				try {
					el._observer.disconnect();
					delete el._observer;
				} catch (err) {
					// Ignore errors, keep going
				}
			}
			
			// Try additional properties where observers might be stored
			['__observer', 'observer', 'mutationObserver', '_mutationObserver'].forEach(propName => {
				try {
					if (el[propName] && typeof el[propName].disconnect === 'function') {
						el[propName].disconnect();
						delete el[propName];
					}
				} catch (err) {
					// Ignore errors, keep going
				}
			});
		});
	} catch (e) {
		console.error('Error clearing element observers:', e);
	}
	
	// Clear any cookie elements we've already found to prevent later processing
	try {
		dialogElements = [];
		capturedDialogs = [];
		processedDialogsInSession.clear();
		processedPopupDomains.clear();
	} catch (e) {
		console.error('Error clearing tracked dialogs:', e);
	}
	
	// Remove ALL event listeners we can target
	try {
		window.removeEventListener('load', startDetectionTimeout);
		window.removeEventListener('DOMContentLoaded', initCookieConsentManager);
		document.removeEventListener('DOMContentLoaded', initCookieConsentManager);
		document.body.removeEventListener('DOMNodeInserted', checkElementForCookieBanner);
		document.body.removeEventListener('DOMNodeInserted', runSmartMode);
	} catch (e) {
		console.error('Error removing event listeners:', e);
	}
	
	// Set a flag that we've explicitly stopped detection to prevent restarts
	window.__cookieDetectionStopped = true;
	
	console.log('All cookie detection mechanisms stopped completely');
} 