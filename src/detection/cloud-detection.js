/**
 * Cloud detection module for cookie consent dialogs
 */

/**
 * Check if a dialog matches any known patterns in the cloud database
 * @param {string} html - Dialog HTML content
 * @param {Array} patterns - Cloud patterns to match against
 * @returns {Object|null} - Matched pattern or null if no match
 */
function matchDialogWithCloudPatterns(html, patterns) {
	if (!html || !patterns || !Array.isArray(patterns) || patterns.length === 0) {
		return null;
	}
	
	// Convert HTML to lowercase for case-insensitive matching
	const lowerHtml = html.toLowerCase();
	
	// Sort patterns by specificity (more specific patterns first)
	// This gives preference to more exact matches
	const sortedPatterns = [...patterns].sort((a, b) => {
		// More markers means more specific pattern
		if (a.markers.length !== b.markers.length) {
			return b.markers.length - a.markers.length;
		}
		
		// If same number of markers, longer pattern text is more specific
		return b.pattern.length - a.pattern.length;
	});
	
	// Try to match each pattern
	for (const pattern of sortedPatterns) {
		// Check if all markers are present
		const allMarkersPresent = pattern.markers.every(marker => 
			lowerHtml.includes(marker.toLowerCase())
		);
		
		if (allMarkersPresent) {
			// Check for additional positive markers
			let positiveMarkers = 0;
			if (pattern.positiveMarkers && Array.isArray(pattern.positiveMarkers)) {
				pattern.positiveMarkers.forEach(marker => {
					if (lowerHtml.includes(marker.toLowerCase())) {
						positiveMarkers++;
					}
				});
			}
			
			// Check for negative markers (disqualifiers)
			let hasNegativeMarker = false;
			if (pattern.negativeMarkers && Array.isArray(pattern.negativeMarkers)) {
				hasNegativeMarker = pattern.negativeMarkers.some(marker => 
					lowerHtml.includes(marker.toLowerCase())
				);
			}
			
			// If no negative markers present, we have a match
			if (!hasNegativeMarker) {
				return {
					patternId: pattern.id,
					confidence: calculateConfidence(pattern, positiveMarkers, lowerHtml),
					pattern
				};
			}
		}
	}
	
	return null;
}

/**
 * Calculate confidence level for a pattern match
 * @param {Object} pattern - The matched pattern
 * @param {number} positiveMarkers - Count of positive markers found
 * @param {string} html - The HTML content
 * @returns {string} - Confidence level (high, medium, low)
 */
function calculateConfidence(pattern, positiveMarkers, html) {
	// Start with base confidence from pattern
	const baseConfidence = pattern.confidence || 'medium';
	
	// Adjust based on positive markers present
	if (positiveMarkers >= 3) {
		// High confidence with many positive markers
		return 'high';
	} else if (positiveMarkers >= 1) {
		// Boost low to medium, keep medium and high
		return baseConfidence === 'low' ? 'medium' : baseConfidence;
	} else if (pattern.markers.length >= 4) {
		// Many required markers present is a good sign
		return baseConfidence === 'low' ? 'medium' : baseConfidence;
	}
	
	// No adjustment needed
	return baseConfidence;
}

/**
 * Detect cookie consent dialogs using cloud patterns
 * @param {string} html - Page HTML content
 * @param {Array} cloudPatterns - Patterns from the cloud database
 * @param {Function} callback - Callback with detected dialogs
 */
function detectWithCloudPatterns(html, cloudPatterns, callback) {
	if (!html || !cloudPatterns) {
		callback([]);
		return;
	}
	
	// Match with cloud patterns
	const match = matchDialogWithCloudPatterns(html, cloudPatterns);
	
	if (match) {
		// Create detected dialog object
		const detectedDialog = {
			type: 'cloud',
			patternId: match.patternId,
			confidence: match.confidence,
			html,
			timestamp: Date.now(),
			pattern: match.pattern
		};
		
		callback([detectedDialog]);
	} else {
		callback([]);
	}
}

/**
 * Find the appropriate button based on dialog and button type
 * @param {Element} dialogElement - The dialog element
 * @param {string} buttonType - Type of button to find (accept, reject, necessary, settings)
 * @returns {Element|null} - The button element or null if not found
 */
function findButtonInDialog(dialogElement, buttonType) {
	if (!dialogElement || !buttonType) return null;
	
	// Button selectors based on type
	const buttonSelectors = {
		accept: [
			'[id*="accept"]:not([id*="not"]):not([id*="never"])', 
			'[class*="accept"]:not([class*="not"]):not([class*="never"])',
			'button:contains("Accept"), button:contains("Agree"), button:contains("Allow")',
			'a:contains("Accept"), a:contains("Agree"), a:contains("Allow")',
			'.btn:contains("Accept"), .btn:contains("Agree"), .btn:contains("Allow")',
			'[role="button"]:contains("Accept"), [role="button"]:contains("Agree")'
		],
		reject: [
			'[id*="reject"],[id*="decline"],[id*="refuse"]', 
			'[class*="reject"],[class*="decline"],[class*="refuse"]',
			'button:contains("Reject"), button:contains("Decline"), button:contains("No thanks")',
			'a:contains("Reject"), a:contains("Decline"), a:contains("No thanks")',
			'.btn:contains("Reject"), .btn:contains("Decline"), .btn:contains("No thanks")',
			'[role="button"]:contains("Reject"), [role="button"]:contains("Decline")'
		],
		necessary: [
			'[id*="necessary"],[id*="essential"]', 
			'[class*="necessary"],[class*="essential"]',
			'button:contains("Necessary"), button:contains("Essential"), button:contains("Required")',
			'a:contains("Necessary"), a:contains("Essential"), a:contains("Required")',
			'.btn:contains("Necessary"), .btn:contains("Essential"), .btn:contains("Required")',
			'[role="button"]:contains("Necessary"), [role="button"]:contains("Essential")'
		],
		settings: [
			'[id*="settings"],[id*="preferences"],[id*="options"]', 
			'[class*="settings"],[class*="preferences"],[class*="options"]',
			'button:contains("Settings"), button:contains("Preferences"), button:contains("Customize")',
			'a:contains("Settings"), a:contains("Preferences"), a:contains("Customize")',
			'.btn:contains("Settings"), .btn:contains("Preferences"), .btn:contains("Customize")',
			'[role="button"]:contains("Settings"), [role="button"]:contains("Preferences")'
		]
	};
	
	// Try each selector
	const selectors = buttonSelectors[buttonType] || [];
	for (const selector of selectors) {
		try {
			const elements = dialogElement.querySelectorAll(selector);
			if (elements && elements.length > 0) {
				return elements[0]; // Return first match
			}
		} catch (e) {
			// Ignore selector errors
		}
	}
	
	// No match found with selectors, try text content
	const buttonTexts = {
		accept: ['accept', 'agree', 'allow', 'got it', 'i understand', 'ok'],
		reject: ['reject', 'decline', 'refuse', 'no thanks', 'later'],
		necessary: ['necessary', 'essential', 'required'],
		settings: ['settings', 'preferences', 'customize', 'manage', 'options']
	};
	
	// Find buttons by text content
	const buttons = dialogElement.querySelectorAll('button, a[role="button"], [type="button"], [class*="button"], [class*="btn"]');
	const keywords = buttonTexts[buttonType] || [];
	
	for (const button of buttons) {
		const text = button.textContent.toLowerCase().trim();
		if (keywords.some(keyword => text.includes(keyword))) {
			return button;
		}
	}
	
	return null;
}

module.exports = {
	matchDialogWithCloudPatterns,
	detectWithCloudPatterns,
	findButtonInDialog
}; 