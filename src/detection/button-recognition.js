/**
 * Button recognition module for identifying and classifying dialog buttons
 */

/**
 * Load selectors configuration
 * @returns {Promise<Object>} The selectors configuration object
 */
async function loadSelectorsConfig() {
	try {
		const response = await fetch('selectors.json');
		if (!response.ok) {
			throw new Error(`Failed to load selectors: ${response.status} ${response.statusText}`);
		}
		return await response.json();
	} catch (error) {
		console.error('Error loading selectors.json:', error);
		// Fallback to default configurations if file can't be loaded
		return {
			buttonTypes: {
				accept: {
					selectors: [
						'#acceptBtn', '#accept-button', '#accept_button', '#acceptAll', '#accept-all',
						'[id*="accept"]:not([id*="not"]):not([id*="never"])',
						'[id*="agree"]:not([id*="dis"])',
						'[id*="allow"]:not([id*="not"])',
						'.accept-button', '.accept_button', '.acceptBtn', '.accept-all', '.acceptAll',
						'[class*="accept"]:not([class*="not"]):not([class*="never"])',
						'[class*="agree"]:not([class*="dis"])',
						'[class*="allow"]:not([class*="not"])'
					],
					textPatterns: [
						'accept all', 'accept cookies', 'i accept', 'accept',
						'agree', 'i agree', 'agree all', 'agree to all',
						'allow all', 'allow cookies', 'allow',
						'got it', 'ok', 'okay', 'continue',
						'i understand', 'understood',
						'yes', 'consent', 'save choices'
					]
				},
				reject: {
					selectors: [
						'#rejectBtn', '#reject-button', '#reject_button', '#rejectAll', '#reject-all',
						'[id*="reject"]', '[id*="decline"]', '[id*="refuse"]', '[id*="deny"]',
						'[id*="no-thanks"]', '[id*="no_thanks"]',
						'.reject-button', '.reject_button', '.rejectBtn', '.reject-all', '.rejectAll',
						'[class*="reject"]', '[class*="decline"]', '[class*="refuse"]', '[class*="deny"]',
						'[class*="no-thanks"]', '[class*="no_thanks"]'
					],
					textPatterns: [
						'reject all', 'reject cookies', 'reject',
						'decline', 'decline all', 'refuse',
						'no thanks', 'no, thanks', 'no',
						'opt out', 'opt-out', 'disagree',
						'don\'t allow', 'do not allow', 'deny',
						'later', 'not now', 'cancel', 'close'
					]
				},
				necessary: {
					selectors: [
						'#necessary-only', '#necessaryOnly', '#only-necessary', '#essential-only',
						'[id*="necessary"]:not([id*="all"])', '[id*="essential"]:not([id*="all"])',
						'[id*="required"]:not([id*="all"])',
						'.necessary-only', '.necessaryOnly', '.only-necessary', '.essential-only',
						'[class*="necessary"]:not([class*="all"])', '[class*="essential"]:not([class*="all"])',
						'[class*="required"]:not([class*="all"])'
					],
					textPatterns: [
						'necessary cookies only', 'only necessary', 'necessary only',
						'essential cookies only', 'only essential', 'essential only',
						'required cookies only', 'only required', 'required only',
						'accept necessary', 'accept essential', 'accept required',
						'necessary cookies', 'essential cookies', 'required cookies',
						'save necessary', 'save essential', 'save required'
					]
				},
				settings: {
					selectors: [
						'#cookie-settings', '#cookieSettings', '#preferences', '#customize',
						'[id*="settings"]:not([id*="save"])', '[id*="preference"]:not([id*="save"])',
						'[id*="customize"]:not([id*="save"])', '[id*="manage"]',
						'.cookie-settings', '.cookieSettings', '.preferences', '.customize',
						'[class*="settings"]:not([class*="save"])', '[class*="preference"]:not([class*="save"])',
						'[class*="customize"]:not([class*="save"])', '[class*="manage"]'
					],
					textPatterns: [
						'cookie settings', 'settings', 'cookie preferences', 'preferences',
						'customize', 'customize cookies', 'manage cookies', 'manage preferences',
						'manage settings', 'more options', 'options', 'advanced', 'advanced settings',
						'select preferences', 'choose preferences', 'edit', 'edit choices'
					]
				}
			}
		};
	}
}

// Cache the selectors config after initial load
let selectorsConfig = null;

/**
 * Get button configuration for a specific button type
 * @param {string} buttonType - Type of button (accept, reject, necessary, settings)
 * @returns {Promise<Object>} Button configuration with selectors and text patterns
 */
async function getButtonConfig(buttonType) {
	if (!selectorsConfig) {
		selectorsConfig = await loadSelectorsConfig();
	}
	
	const defaultConfig = {
		selectors: [],
		textPatterns: []
	};
	
	return (selectorsConfig.buttonTypes && selectorsConfig.buttonTypes[buttonType]) || defaultConfig;
}

/**
 * Generic function to find a button by type in a dialog
 * @param {Element} dialogElement - Dialog element to search in
 * @param {string} buttonType - Type of button to find (accept, reject, necessary, settings)
 * @returns {Promise<Element|null>} Button element or null if not found
 */
async function findButtonByType(dialogElement, buttonType) {
	if (!dialogElement) return null;
	
	const config = await getButtonConfig(buttonType);
	const selectors = config.selectors || [];
	const textPatterns = config.textPatterns || [];
	
	// Add generic button selectors
	const genericSelectors = ['button', 'a[role="button"]', '[type="button"]', '[class*="button"]', '[class*="btn"]'];
	const allSelectors = [...selectors, ...genericSelectors];
	
	// Try each selector
	for (const selector of allSelectors) {
		try {
			const elements = dialogElement.querySelectorAll(selector);
			
			// Check each element
			for (const element of elements) {
				const text = element.textContent.trim().toLowerCase();
				
				// Check for exact matches first
				if (textPatterns.includes(text)) {
					return element;
				}
				
				// Then check for partial matches
				for (const pattern of textPatterns) {
					if (text.includes(pattern)) {
						return element;
					}
				}
			}
		} catch (e) {
			// Ignore selector errors
		}
	}
	
	// If no element found, try generic approach with aria attributes
	const genericButtons = dialogElement.querySelectorAll('button, [role="button"], [type="button"]');
	for (const button of genericButtons) {
		const text = button.textContent.trim().toLowerCase();
		const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
		
		for (const pattern of textPatterns) {
			if (text.includes(pattern) || ariaLabel.includes(pattern)) {
				return button;
			}
		}
	}
	
	return null;
}

/**
 * Find accept button in a dialog
 * @param {Element} dialogElement - Dialog element to search in
 * @returns {Promise<Element|null>} - Accept button element or null if not found
 */
export async function findAcceptButton(dialogElement) {
	return findButtonByType(dialogElement, 'accept');
}

/**
 * Find reject button in a dialog
 * @param {Element} dialogElement - Dialog element to search in
 * @returns {Promise<Element|null>} - Reject button element or null if not found
 */
export async function findRejectButton(dialogElement) {
	return findButtonByType(dialogElement, 'reject');
}

/**
 * Find necessary cookies only button in a dialog
 * @param {Element} dialogElement - Dialog element to search in
 * @returns {Promise<Element|null>} - Necessary cookies button or null if not found
 */
export async function findNecessaryCookiesButton(dialogElement) {
	return findButtonByType(dialogElement, 'necessary');
}

/**
 * Find cookie settings/preferences button in a dialog
 * @param {Element} dialogElement - Dialog element to search in
 * @returns {Promise<Element|null>} - Settings button or null if not found
 */
export async function findSettingsButton(dialogElement) {
	return findButtonByType(dialogElement, 'settings');
}

/**
 * Synchronous versions of the button finding functions for backward compatibility
 * These will use cached selectors config after first load
 */

/**
 * Find accept button in a dialog (sync version)
 * @param {Element} dialogElement - Dialog element to search in
 * @returns {Element|null} - Accept button element or null if not found
 */
export function findAcceptButtonSync(dialogElement) {
	if (!dialogElement) return null;
	
	// Use cached config if available, otherwise use default selectors
	const config = selectorsConfig?.buttonTypes?.accept || {
		selectors: [
			'#acceptBtn', '#accept-button', '#acceptAll',
			'[id*="accept"]', '[class*="accept"]'
		],
		textPatterns: ['accept', 'agree', 'allow', 'ok', 'got it']
	};
	
	// Use same logic as async version but with cached config
	const selectors = [...config.selectors, 'button', 'a[role="button"]'];
	const textPatterns = config.textPatterns;
	
	// Try each selector
	for (const selector of selectors) {
		try {
			const elements = dialogElement.querySelectorAll(selector);
			for (const element of elements) {
				const text = element.textContent.trim().toLowerCase();
				if (textPatterns.some(pattern => text.includes(pattern))) {
					return element;
				}
			}
		} catch (e) {
			// Ignore selector errors
		}
	}
	
	return null;
} 