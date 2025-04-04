// Configuration
const defaultSettings = {
	enabled: true,
	autoAccept: true,
	smartMode: true,
	cloudMode: true,
	privacyMode: true,  // New privacy setting to control data collection
	gdprCompliance: true // UK/EU GDPR compliance mode
};

// Current settings cache
let settings = {...defaultSettings};

// WeakMap to track elements that have been clicked
const clickedElements = new WeakMap();

// Domain visit tracking (for first visit detection)
const visitedDomains = new Set();

// Track tabs that were opened by our extension's clicks
let openedByExtension = false;

// Track data collection consent
let dataCollectionConsent = false;

/**
 * Load settings with fallback to localStorage if Chrome storage fails
 * @param {Function} callback - Callback function to run with loaded settings
 */
function loadSettings(callback) {
	try {
		chrome.storage.sync.get(defaultSettings, (loadedSettings) => {
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
 * Helper function to load settings from localStorage
 * @param {Function} callback - Callback function to run with loaded settings
 */
function loadFromLocalStorage(callback) {
	try {
		const savedSettings = localStorage.getItem('ccm_settings');
		if (savedSettings) {
			settings = JSON.parse(savedSettings);
			console.log('Loaded settings from localStorage fallback');
		} else {
			// Use defaults if nothing in localStorage either
			settings = {...defaultSettings};
			console.log('Using default settings (no localStorage fallback found)');
		}
		if (callback && typeof callback === 'function') {
			callback(settings);
		}
	} catch (e) {
		console.error('Error parsing localStorage settings', e);
		// Use defaults in case of any error
		settings = {...defaultSettings};
		if (callback && typeof callback === 'function') {
			callback(settings);
		}
	}
}

/**
 * Check if this is first visit to the domain today
 * @returns {boolean} True if this is the first visit today
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
 * @returns {boolean} True if this is likely a GET request
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
 * Safely get the text content of an element, handling null cases
 * @param {Element} element - The DOM element to get text from
 * @returns {string} - The text content, or empty string if element is null
 */
function safeGetTextContent(element) {
	return (element && typeof element.innerText === 'string') ? element.innerText.toLowerCase() : '';
}

/**
 * Safely get the HTML content of an element, handling null cases
 * @param {Element} element - The DOM element to get HTML from
 * @returns {string} - The HTML content, or empty string if element is null
 */
function safeGetHtmlContent(element) {
	return (element && typeof element.innerHTML === 'string') ? element.innerHTML.toLowerCase() : '';
}

/**
 * Detect region based on domain and page content
 * @param {string} domain - The domain to check
 * @returns {string} Detected region ('uk' or 'international')
 */
function detectRegion(domain) {
	// Check for UK/EU domains
	if (domain.endsWith('.uk') || domain.endsWith('.co.uk') || 
		domain.endsWith('.eu') || domain.includes('.uk.') ||
		document.documentElement.lang === 'en-GB') {
		return 'uk';
	}
	
	// Check for cookie notice text that's specific to UK/EU compliance
	// Use safe method to get text content
	const pageText = safeGetTextContent(document.body);
	const pageHtml = safeGetHtmlContent(document.body);
	
	// Search for key GDPR-related terms in both text and HTML
	const gdprTerms = ['gdpr', 'information commissioner', 'legitimate interest', 
		'ico', 'uk data protection', 'eu cookie law', 'european union', 
		'data protection'];
	
	for (const term of gdprTerms) {
		if (pageText.includes(term) || pageHtml.includes(term)) {
			return 'uk';
		}
	}
	
	// Default to international
	return 'international';
}

module.exports = { 
	settings, 
	loadSettings, 
	isFirstVisitToday, 
	isGetRequest, 
	detectRegion,
	clickedElements,
	visitedDomains,
	openedByExtension,
	dataCollectionConsent,
	safeGetTextContent,
	safeGetHtmlContent
}; 