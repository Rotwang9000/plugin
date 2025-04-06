/**
 * Button recognition module for identifying and classifying dialog buttons
 */

/**
 * Find accept button in a dialog
 * @param {Element} dialogElement - Dialog element to search in
 * @returns {Element|null} - Accept button element or null if not found
 */
export function findAcceptButton(dialogElement) {
	if (!dialogElement) return null;
	
	// Common accept button selectors in priority order
	const acceptSelectors = [
		// ID-based selectors
		'#acceptBtn', '#accept-button', '#accept_button', '#acceptAll', '#accept-all',
		'[id*="accept"]:not([id*="not"]):not([id*="never"])',
		'[id*="agree"]:not([id*="dis"])',
		'[id*="allow"]:not([id*="not"])',
		
		// Class-based selectors
		'.accept-button', '.accept_button', '.acceptBtn', '.accept-all', '.acceptAll',
		'[class*="accept"]:not([class*="not"]):not([class*="never"])',
		'[class*="agree"]:not([class*="dis"])',
		'[class*="allow"]:not([class*="not"])',
		
		// Text-based selectors
		'button, a[role="button"], [type="button"], [class*="button"], [class*="btn"]'
	];
	
	// Accept button text patterns (lowercase)
	const acceptTextPatterns = [
		'accept all', 'accept cookies', 'i accept', 'accept',
		'agree', 'i agree', 'agree all', 'agree to all',
		'allow all', 'allow cookies', 'allow',
		'got it', 'ok', 'okay', 'continue',
		'i understand', 'understood',
		'yes', 'consent', 'save choices'
	];
	
	// Try each selector
	for (const selector of acceptSelectors) {
		try {
			const elements = dialogElement.querySelectorAll(selector);
			
			// Check each element
			for (const element of elements) {
				const text = element.textContent.trim().toLowerCase();
				
				// Check for exact matches first
				if (acceptTextPatterns.includes(text)) {
					return element;
				}
				
				// Then check for partial matches
				for (const pattern of acceptTextPatterns) {
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
		
		for (const pattern of acceptTextPatterns) {
			if (text.includes(pattern) || ariaLabel.includes(pattern)) {
				return button;
			}
		}
	}
	
	return null;
}

/**
 * Find reject button in a dialog
 * @param {Element} dialogElement - Dialog element to search in
 * @returns {Element|null} - Reject button element or null if not found
 */
export function findRejectButton(dialogElement) {
	if (!dialogElement) return null;
	
	// Common reject button selectors in priority order
	const rejectSelectors = [
		// ID-based selectors
		'#rejectBtn', '#reject-button', '#reject_button', '#rejectAll', '#reject-all',
		'[id*="reject"]', '[id*="decline"]', '[id*="refuse"]', '[id*="deny"]',
		'[id*="no-thanks"]', '[id*="no_thanks"]',
		
		// Class-based selectors
		'.reject-button', '.reject_button', '.rejectBtn', '.reject-all', '.rejectAll',
		'[class*="reject"]', '[class*="decline"]', '[class*="refuse"]', '[class*="deny"]',
		'[class*="no-thanks"]', '[class*="no_thanks"]',
		
		// Text-based selectors
		'button, a[role="button"], [type="button"], [class*="button"], [class*="btn"]'
	];
	
	// Reject button text patterns (lowercase)
	const rejectTextPatterns = [
		'reject all', 'reject cookies', 'reject',
		'decline', 'decline all', 'refuse',
		'no thanks', 'no, thanks', 'no',
		'opt out', 'opt-out', 'disagree',
		'don\'t allow', 'do not allow', 'deny',
		'later', 'not now', 'cancel', 'close'
	];
	
	// Try each selector
	for (const selector of rejectSelectors) {
		try {
			const elements = dialogElement.querySelectorAll(selector);
			
			// Check each element
			for (const element of elements) {
				const text = element.textContent.trim().toLowerCase();
				
				// Check for exact matches first
				if (rejectTextPatterns.includes(text)) {
					return element;
				}
				
				// Then check for partial matches
				for (const pattern of rejectTextPatterns) {
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
		
		for (const pattern of rejectTextPatterns) {
			if (text.includes(pattern) || ariaLabel.includes(pattern)) {
				return button;
			}
		}
	}
	
	return null;
}

/**
 * Find necessary cookies only button in a dialog
 * @param {Element} dialogElement - Dialog element to search in
 * @returns {Element|null} - Necessary cookies button or null if not found
 */
export function findNecessaryCookiesButton(dialogElement) {
	if (!dialogElement) return null;
	
	// Common selectors for necessary cookies buttons
	const necessarySelectors = [
		// ID-based selectors
		'#necessary-only', '#necessaryOnly', '#only-necessary', '#essential-only',
		'[id*="necessary"]:not([id*="all"])', '[id*="essential"]:not([id*="all"])',
		'[id*="required"]:not([id*="all"])',
		
		// Class-based selectors
		'.necessary-only', '.necessaryOnly', '.only-necessary', '.essential-only',
		'[class*="necessary"]:not([class*="all"])', '[class*="essential"]:not([class*="all"])',
		'[class*="required"]:not([class*="all"])',
		
		// Text-based selectors
		'button, a[role="button"], [type="button"], [class*="button"], [class*="btn"]'
	];
	
	// Necessary cookies button text patterns (lowercase)
	const necessaryTextPatterns = [
		'necessary cookies only', 'only necessary', 'necessary only',
		'essential cookies only', 'only essential', 'essential only',
		'required cookies only', 'only required', 'required only',
		'accept necessary', 'accept essential', 'accept required',
		'necessary cookies', 'essential cookies', 'required cookies',
		'save necessary', 'save essential', 'save required'
	];
	
	// Try each selector
	for (const selector of necessarySelectors) {
		try {
			const elements = dialogElement.querySelectorAll(selector);
			
			// Check each element
			for (const element of elements) {
				const text = element.textContent.trim().toLowerCase();
				
				// Check for exact matches first
				if (necessaryTextPatterns.includes(text)) {
					return element;
				}
				
				// Then check for partial matches
				for (const pattern of necessaryTextPatterns) {
					if (text.includes(pattern)) {
						return element;
					}
				}
			}
		} catch (e) {
			// Ignore selector errors
		}
	}
	
	// If no element found, try generic approach
	const genericButtons = dialogElement.querySelectorAll('button, [role="button"], [type="button"]');
	for (const button of genericButtons) {
		const text = button.textContent.trim().toLowerCase();
		const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
		
		for (const pattern of necessaryTextPatterns) {
			if (text.includes(pattern) || ariaLabel.includes(pattern)) {
				return button;
			}
		}
	}
	
	return null;
}

/**
 * Find cookie settings/preferences button in a dialog
 * @param {Element} dialogElement - Dialog element to search in
 * @returns {Element|null} - Settings button or null if not found
 */
export function findSettingsButton(dialogElement) {
	if (!dialogElement) return null;
	
	// Common selectors for settings buttons
	const settingsSelectors = [
		// ID-based selectors
		'#cookie-settings', '#cookieSettings', '#preferences', '#customize',
		'[id*="settings"]:not([id*="save"])', '[id*="preference"]:not([id*="save"])',
		'[id*="customize"]:not([id*="save"])', '[id*="manage"]',
		
		// Class-based selectors
		'.cookie-settings', '.cookieSettings', '.preferences', '.customize',
		'[class*="settings"]:not([class*="save"])', '[class*="preference"]:not([class*="save"])',
		'[class*="customize"]:not([class*="save"])', '[class*="manage"]',
		
		// Text-based selectors
		'button, a[role="button"], [type="button"], [class*="button"], [class*="btn"]'
	];
	
	// Settings button text patterns (lowercase)
	const settingsTextPatterns = [
		'cookie settings', 'settings', 'cookie preferences', 'preferences',
		'customize', 'customize cookies', 'manage cookies', 'manage preferences',
		'manage settings', 'more options', 'options', 'advanced', 'advanced settings',
		'select preferences', 'choose preferences', 'edit', 'edit choices'
	];
	
	// Try each selector
	for (const selector of settingsSelectors) {
		try {
			const elements = dialogElement.querySelectorAll(selector);
			
			// Check each element
			for (const element of elements) {
				const text = element.textContent.trim().toLowerCase();
				
				// Check for exact matches first
				if (settingsTextPatterns.includes(text)) {
					return element;
				}
				
				// Then check for partial matches
				for (const pattern of settingsTextPatterns) {
					if (text.includes(pattern)) {
						return element;
					}
				}
			}
		} catch (e) {
			// Ignore selector errors
		}
	}
	
	// If no element found, try generic approach
	const genericButtons = dialogElement.querySelectorAll('button, [role="button"], [type="button"]');
	for (const button of genericButtons) {
		const text = button.textContent.trim().toLowerCase();
		const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
		
		for (const pattern of settingsTextPatterns) {
			if (text.includes(pattern) || ariaLabel.includes(pattern)) {
				return button;
			}
		}
	}
	
	return null;
} 