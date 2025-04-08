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
			return 'international'; // Default fallback
		}

		try {
			const text = dialog.textContent.toLowerCase();
			const regions = this.config?.regionDetection || {};
			
			// Check for text pattern matches first (highest confidence)
			for (const [regionCode, regionConfig] of Object.entries(regions)) {
				if (regionConfig.textPatterns) {
					for (const pattern of regionConfig.textPatterns) {
						if (text.includes(pattern.pattern.toLowerCase())) {
							return regionCode;
						}
					}
				}
			}
			
			// Then check domain patterns
			for (const [regionCode, regionConfig] of Object.entries(regions)) {
				if (regionConfig.locationPatterns) {
					for (const pattern of regionConfig.locationPatterns) {
						if (domain.includes(pattern)) {
							return regionCode;
						}
					}
				}
			}
			
			// Default to international if no match
			return 'international';
		} catch (e) {
			console.error('Error in detectRegion:', e);
			this.lastError = e;
			return 'international';
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
	 * Detect the region based on domain TLD
	 * @param {string} domain - The domain to check
	 * @returns {string|null} The detected region or null
	 */
	detectRegionByTld(domain) {
		if (!domain || !this.config.tldPatterns) {
			return null;
		}

		try {
			// Check each region's TLD patterns
			for (const [region, patterns] of Object.entries(this.config.tldPatterns)) {
				for (const pattern of patterns) {
					if (domain.endsWith(pattern)) {
						return region;
					}
				}
			}
		} catch (e) {
			console.error('Error in detectRegionByTld:', e);
			this.lastError = e;
		}

		return null;
	}

	/**
	 * Detect the region based on document language
	 * @param {string} language - The language code (e.g., 'en-US', 'de', etc.)
	 * @returns {string|null} The detected region or null
	 */
	detectRegionByLanguage(language) {
		if (!language || !this.config.languagePatterns) {
			return null;
		}

		try {
			// Clean up language code
			const lang = language.trim().toLowerCase();
			
			// Check each region's language patterns
			for (const [region, patterns] of Object.entries(this.config.languagePatterns)) {
				// Check full match (e.g., 'en-GB')
				if (patterns.includes(lang)) {
					return region;
				}
				
				// Check language part only (e.g., 'en' from 'en-US')
				const baseLang = lang.split('-')[0];
				if (baseLang !== lang && patterns.includes(baseLang)) {
					return region;
				}
			}
		} catch (e) {
			console.error('Error in detectRegionByLanguage:', e);
			this.lastError = e;
		}

		return null;
	}

	/**
	 * Detect region based on page content
	 * @param {string} pageContent - The text content of the page
	 * @returns {string|null} The detected region or null
	 */
	detectRegionByContent(pageContent) {
		if (!pageContent || !this.config.contentPatterns) {
			return null;
		}

		try {
			const lowerContent = pageContent.toLowerCase();
			
			// Check each region's content patterns
			for (const [region, patterns] of Object.entries(this.config.contentPatterns)) {
				for (const pattern of patterns) {
					if (lowerContent.includes(pattern.toLowerCase())) {
						return region;
					}
				}
			}
		} catch (e) {
			console.error('Error in detectRegionByContent:', e);
			this.lastError = e;
		}

		return null;
	}

	/**
	 * Detect the region using all available methods
	 * @param {Document} document - The document to analyze
	 * @returns {string} The detected region ('eu', 'us', 'global')
	 */
	detectRegion(document) {
		try {
			// Extract domain from URL
			const domain = document.location.hostname;
			
			// Extract language from HTML or navigator
			const htmlLang = document.documentElement.lang || '';
			const navLang = navigator.language || navigator.userLanguage || '';
			
			// Extract page content (from visible text only)
			const bodyText = document.body.textContent || '';
			const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
			const pageContent = bodyText + ' ' + metaDescription;
			
			// Try detection methods in order of confidence
			const regionByTld = this.detectRegionByTld(domain);
			if (regionByTld) return regionByTld;
			
			const regionByHtmlLang = this.detectRegionByLanguage(htmlLang);
			if (regionByHtmlLang) return regionByHtmlLang;
			
			const regionByNavLang = this.detectRegionByLanguage(navLang);
			if (regionByNavLang) return regionByNavLang;
			
			const regionByContent = this.detectRegionByContent(pageContent);
			if (regionByContent) return regionByContent;
			
			// Default to global if no region detected
			return 'global';
		} catch (e) {
			console.error('Error in detectRegion:', e);
			this.lastError = e;
			return 'global'; // Default to global on error
		}
	}

	/**
	 * Get the last error that occurred during detection
	 * @returns {Error|null} The last error or null if no error occurred
	 */
	getLastError() {
		return this.lastError;
	}
} 