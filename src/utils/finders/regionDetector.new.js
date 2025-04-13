/**
 * RegionDetector class for determining the region of a website based on
 * TLD, language, and content patterns from selectors.json
 */
export class RegionDetector {
	/**
	 * Create a new RegionDetector
	 * @param {Object} regionConfig - Region detection configuration from selectors.json
	 */
	constructor(regionConfig) {
		this.config = regionConfig || {};
		this.lastError = null;
	}

	/**
	 * Detect the region for a dialog based on content and domain
	 * @param {Element} dialog - The dialog element to analyze
	 * @param {string} domain - The current domain
	 * @returns {string} The detected region code
	 */
	detectRegion(dialog, domain) {
		if (!dialog || !domain) {
			return 'global'; // Default fallback
		}

		try {
			// Get dialog text content
			const text = dialog ? dialog.textContent.toLowerCase() : '';
			
			// Check text patterns for each region from config
			const regions = ['eu', 'us', 'california', 'global'];
			
			// Check for content patterns first (highest priority)
			for (const region of regions) {
				const patterns = this.config?.contentPatterns?.[region] || [];
				for (const pattern of patterns) {
					if (text.includes(pattern.toLowerCase())) {
						return region;
					}
				}
			}
			
			// Then check TLDs for region matching
			if (domain) {
				for (const region of regions) {
					const tldPatterns = this.config?.tldPatterns?.[region] || [];
					for (const tld of tldPatterns) {
						if (domain.endsWith(tld)) {
							return region;
						}
					}
				}
			}
			
			// Check language patterns
			const docLang = document.documentElement.lang || '';
			if (docLang) {
				for (const region of regions) {
					const langPatterns = this.config?.languagePatterns?.[region] || [];
					for (const lang of langPatterns) {
						if (docLang.toLowerCase() === lang.toLowerCase()) {
							return region;
						}
					}
				}
			}
			
			// Default to global if no specific match found
			return 'global';
		} catch (e) {
			console.error('Error in detectRegion:', e);
			this.lastError = e;
			return 'global';
		}
	}

	/**
	 * Detect visual variation of a dialog (standard, dark pattern, no-choice)
	 * @param {Element} dialog - The dialog element
	 * @param {Element} acceptButton - The accept button element
	 * @param {Element} rejectButton - The reject button element (may be null)
	 * @returns {string} The variation type
	 */
	detectRegionVariation(dialog, acceptButton, rejectButton) {
		if (!dialog || !acceptButton) {
			return 'unknown';
		}

		try {
			// No-choice variation: only accept button available
			if (!rejectButton) {
				return 'no-choice';
			}
			
			// Check if the reject button isn't actually a reject button
			// For example, it might be a settings button instead
			const rejectText = rejectButton.textContent.toLowerCase();
			const isActualRejectBtn = 
				/reject|decline|necessary|essential|only|no thanks/i.test(rejectText) ||
				rejectButton.id.toLowerCase().includes('reject') ||
				rejectButton.className.toLowerCase().includes('reject');
				
			if (!isActualRejectBtn) {
				return 'unknown';
			}
			
			// Check for dark pattern variation
			const hasDarkPattern = this.compareButtonStyles(acceptButton, rejectButton);
			
			return hasDarkPattern ? 'dark-pattern' : 'standard';
		} catch (e) {
			console.error('Error in detectRegionVariation:', e);
			this.lastError = e;
			return 'unknown';
		}
	}

	/**
	 * Compare styles of two buttons to detect dark patterns
	 * @param {Element} button1 - First button (usually accept)
	 * @param {Element} button2 - Second button (usually reject)
	 * @returns {boolean} True if significant style differences exist (dark pattern)
	 */
	compareButtonStyles(button1, button2) {
		if (!button1 || !button2) {
			return false;
		}

		try {
			const style1 = window.getComputedStyle(button1);
			const style2 = window.getComputedStyle(button2);
			
			// Check for significant size differences
			const fontSize1 = parseFloat(style1.fontSize);
			const fontSize2 = parseFloat(style2.fontSize);
			const fontSizeDiff = Math.abs(fontSize1 - fontSize2);
			
			// Check for color/visibility differences
			const color1 = style1.color;
			const color2 = style2.color;
			const bgColor1 = style1.backgroundColor;
			const bgColor2 = style2.backgroundColor;
			
			// Check for placement or emphasis differences
			const padding1 = style1.padding;
			const padding2 = style2.padding;
			
			// Calculate an overall difference score
			let darkPatternScore = 0;
			
			// Font size difference > 2px is significant
			if (fontSizeDiff > 2) {
				darkPatternScore += 1;
			}
			
			// Color differences
			if (color1 !== color2 || bgColor1 !== bgColor2) {
				// Check for low contrast (making text harder to read)
				const isLowContrast = (col) => {
					// Simple check for muted colors like #999, rgba(0,0,0,0.3), etc.
					return col.includes('rgb(') && col.match(/\d+/g).some(val => val > 150 && val < 230);
				};
				
				if (isLowContrast(color2) && !isLowContrast(color1)) {
					darkPatternScore += 1;
				}
				
				// Bright/bold background vs. no background
				if (bgColor1 !== 'rgba(0, 0, 0, 0)' && bgColor2 === 'rgba(0, 0, 0, 0)') {
					darkPatternScore += 1;
				}
			}
			
			// Size/prominence differences
			if (padding1 !== padding2) {
				darkPatternScore += 0.5;
			}
			
			// Position - check if the accept button is more prominent
			// (This is a simplified check - in real implementation would need more context)
			const positionalAdvantage = button1.offsetLeft < button2.offsetLeft && 
				!(button2.parentElement === button1.parentElement);
			
			if (positionalAdvantage) {
				darkPatternScore += 0.5;
			}
			
			// A score of 1.5+ indicates significant differences
			return darkPatternScore >= 1.5;
		} catch (e) {
			console.error('Error in compareButtonStyles:', e);
			this.lastError = e;
			return false;
		}
	}

	/**
	 * Get the last error that occurred during region detection
	 * @returns {Error|null} The last error or null if no error occurred
	 */
	getLastError() {
		return this.lastError;
	}
} 