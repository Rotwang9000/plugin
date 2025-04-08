import { ElementFinder } from './elementFinder.js';

/**
 * DialogFinder class for finding cookie consent dialogs on the page
 * Extends the base ElementFinder with dialog-specific functionality
 */
export class DialogFinder extends ElementFinder {
	/**
	 * Create a new DialogFinder
	 * @param {Object} selectors - The selectors configuration object
	 */
	constructor(selectors) {
		super(selectors);
	}

	/**
	 * Find the most likely cookie consent dialog on the page
	 * @param {Element} container - Container element (usually document) to search within
	 * @returns {Element|null} The most likely dialog element or null
	 */
	findDialog(container = document) {
		// This is a simplified alias for findBestDialog for test compatibility
		return this.findBestDialog(container);
	}

	/**
	 * Find all potential dialogs - alias for findAllDialogs for test compatibility
	 * @param {Element} container - Container element to search within
	 * @returns {Array} Array of potential dialog elements
	 */
	findAllPotentialDialogs(container = document) {
		return this.findAllDialogs(container);
	}

	/**
	 * Score a dialog element based on how likely it is to be a cookie consent dialog
	 * @param {Element} dialog - Dialog element to score
	 * @returns {number} Score (higher is more likely)
	 */
	scoreDialog(dialog) {
		if (!dialog) {
			this.lastError = new Error('Invalid dialog element');
			return 0;
		}

		let score = 0;

		try {
			// Check ID and class
			const id = dialog.id || '';
			const className = dialog.className || '';
			const textContent = dialog.textContent || '';
			
			// Score based on selectors
			const selectors = this.selectors?.dialogSelectors?.selectors || [];
			for (const selectorObj of selectors) {
				try {
					// Check if dialog matches this selector
					if (dialog.matches(selectorObj.query)) {
						score += selectorObj.priority || 5;
					}
				} catch (e) {
					// Ignore invalid selectors
				}
			}
			
			// Score based on text patterns
			const textPatterns = this.selectors?.dialogSelectors?.textPatterns || [];
			for (const patternObj of textPatterns) {
				if (textContent.toLowerCase().includes(patternObj.pattern.toLowerCase())) {
					score += patternObj.priority || 5;
				}
			}
			
			// Bonus for common cookie dialog indicators
			if (/cookie|consent|gdpr|privacy/i.test(id)) {
				score += 5;
			}
			
			if (/cookie|consent|gdpr|privacy/i.test(className)) {
				score += 5;
			}
			
			// Check for buttons (dialogs usually have buttons)
			const hasButtons = dialog.querySelectorAll('button, [role="button"], [type="button"], a[href="#"]').length > 0;
			if (hasButtons) {
				score += 3;
			}
			
			return score;
		} catch (e) {
			console.error('Error in scoreDialog:', e);
			this.lastError = e;
			return 0;
		}
	}

	/**
	 * Find all potential cookie consent dialogs on the page
	 * @param {Element} container - Container element (usually document) to search within
	 * @returns {Array} Array of dialog elements
	 */
	findAllDialogs(container = document.documentElement) {
		if (!container) {
			this.lastError = new Error('Invalid container');
			return [];
		}

		const dialogs = [];

		try {
			// Get direct selectors from config
			const dialogSelectors = this.selectors?.dialogSelectors || [];
			
			// Try each selector
			dialogSelectors.forEach(selectorObj => {
				try {
					const elements = container.querySelectorAll(selectorObj.query);
					if (elements && elements.length > 0) {
						// Add all matches to the result array
						elements.forEach(element => {
							// Add a priority score for ranking
							element._priority = selectorObj.priority || 5;
							dialogs.push(element);
						});
					}
				} catch (e) {
					console.error(`Error with dialog selector ${selectorObj.query}:`, e);
				}
			});
			
			// Try attribute patterns if direct selectors yield no results
			if (dialogs.length === 0 && this.selectors?.dialogPatterns) {
				this.findDialogsByPatterns(container, dialogs);
			}
			
			// Sort by priority score (highest first)
			return dialogs.sort((a, b) => (b._priority || 0) - (a._priority || 0));
		} catch (e) {
			console.error('Error in findAllDialogs:', e);
			this.lastError = e;
			return dialogs;
		}
	}

	/**
	 * Find dialogs based on attribute patterns
	 * @param {Element} container - Container element to search within
	 * @param {Array} results - Array to add results to
	 */
	findDialogsByPatterns(container, results) {
		const dialogPatterns = this.selectors?.dialogPatterns || [];
		
		dialogPatterns.forEach(pattern => {
			try {
				// Process attribute patterns
				if (pattern.attributes) {
					for (const [attrName, valuePatterns] of Object.entries(pattern.attributes)) {
						const selector = `[${attrName}*="${valuePatterns[0]}"]`;
						try {
							const elements = container.querySelectorAll(selector);
							elements.forEach(element => {
								// Check if element has the attribute and it matches any pattern
								const attrValue = element.getAttribute(attrName)?.toLowerCase() || '';
								const matches = valuePatterns.some(valPattern => 
									attrValue.includes(valPattern.toLowerCase())
								);
								
								if (matches) {
									element._priority = pattern.priority || 5;
									results.push(element);
								}
							});
						} catch (e) {
							console.error(`Error with attribute selector ${selector}:`, e);
						}
					}
				}
				
				// Process content patterns
				if (pattern.contentPatterns) {
					// Get visible elements with text content
					const textElements = Array.from(container.querySelectorAll('div, section, aside, header, footer, main, article, nav'));
					
					textElements.forEach(element => {
						const textContent = element.textContent.toLowerCase();
						
						// Check if text contains privacy-related terms
						const matches = pattern.contentPatterns.some(contentPattern =>
							textContent.includes(contentPattern.toLowerCase())
						);
						
						// Check for more specific criteria to determine if it's a cookie dialog
						if (matches) {
							// Additional checks:
							// 1. Has buttons
							const hasButtons = element.querySelectorAll('button, [role="button"], [type="button"]').length > 0;
							
							// 2. Contains "cookie" or "privacy" terms
							const hasCookieTerms = /cookie|consent|privacy|gdpr|data protection/i.test(textContent);
							
							// 3. Is visible and reasonably sized
							const rect = element.getBoundingClientRect();
							const isVisible = rect.width > 50 && rect.height > 30 && 
								window.getComputedStyle(element).display !== 'none' &&
								window.getComputedStyle(element).visibility !== 'hidden';
							
							if (hasButtons && hasCookieTerms && isVisible) {
								element._priority = pattern.priority || 3;
								results.push(element);
							}
						}
					});
				}
			} catch (e) {
				console.error('Error processing dialog pattern:', e);
			}
		});
	}

	/**
	 * Find the most likely cookie consent dialog on the page
	 * @param {Element} container - Container element (usually document) to search within
	 * @returns {Element|null} The most likely dialog element or null
	 */
	findBestDialog(container = document.documentElement) {
		const dialogs = this.findAllDialogs(container);
		return dialogs.length > 0 ? dialogs[0] : null;
	}

	/**
	 * Generate a unique ID for a dialog based on its properties
	 * @param {Element} dialog - The dialog element
	 * @returns {string} A unique ID for the dialog
	 */
	generateDialogId(dialog) {
		if (!dialog) {
			this.lastError = new Error('Invalid dialog element');
			return '';
		}

		try {
			// Create a signature from dialog attributes
			const id = dialog.id || '';
			const className = dialog.className || '';
			const tagName = dialog.tagName || '';
			const textContent = dialog.textContent || '';
			
			// Get first 50 chars of text content and remove whitespace
			const textSample = textContent.substr(0, 50).replace(/\s+/g, ' ').trim();
			
			// Create a hash from these properties
			const signature = `${tagName}_${id}_${className}_${textSample}`;
			
			// Create a simple hash
			let hash = 0;
			for (let i = 0; i < signature.length; i++) {
				hash = ((hash << 5) - hash) + signature.charCodeAt(i);
				hash |= 0; // Convert to 32bit integer
			}
			
			return `dialog_${Math.abs(hash)}`;
		} catch (e) {
			console.error('Error in generateDialogId:', e);
			this.lastError = e;
			return `dialog_${Date.now()}`; // Fallback to timestamp
		}
	}

	/**
	 * Determine if a dialog is a cookie consent dialog
	 * @param {Element} dialog - The dialog element to check
	 * @returns {boolean} True if the dialog is a cookie consent dialog
	 */
	isCookieConsentDialog(dialog) {
		if (!dialog) {
			this.lastError = new Error('Invalid dialog element');
			return false;
		}

		try {
			// Check text content for cookie-related terms
			const textContent = dialog.textContent.toLowerCase();
			const cookieTerms = [
				'cookie', 'cookies', 'gdpr', 'data protection', 'privacy', 
				'consent', 'personal data', 'legitimate interest'
			];
			
			const hasCookieTerms = cookieTerms.some(term => textContent.includes(term));
			
			// Check for interactive elements
			const hasButtons = dialog.querySelectorAll('button, [role="button"], [type="button"]').length > 0;
			
			// Check if it has checkboxes
			const hasCheckboxes = dialog.querySelectorAll('input[type="checkbox"]').length > 0;
			
			// Check if dialog has cookie-related classes or IDs
			const hasRelatedAttributes = 
				/cookie|consent|gdpr|privacy|data-/i.test(dialog.id || '') || 
				/cookie|consent|gdpr|privacy|data-/i.test(dialog.className || '');
			
			// It's likely a cookie dialog if it has cookie terms + interactive elements
			return hasCookieTerms && (hasButtons || hasCheckboxes || hasRelatedAttributes);
		} catch (e) {
			console.error('Error in isCookieConsentDialog:', e);
			this.lastError = e;
			return false;
		}
	}
} 