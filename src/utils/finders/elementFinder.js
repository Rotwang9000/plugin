/**
 * Base ElementFinder class that provides functionality for finding elements based on
 * selectors, text patterns, and other attributes defined in selectors.json
 */
export class ElementFinder {
	/**
	 * Create a new ElementFinder
	 * @param {Object} selectors - The selectors configuration object
	 */
	constructor(selectors) {
		this.selectors = selectors || {};
		this.lastError = null;
	}

	/**
	 * Find an element by CSS selector
	 * @param {Element} container - Container element to search within
	 * @param {string} selector - CSS selector string
	 * @returns {Element|null} The found element or null
	 */
	findElementBySelector(container, selector) {
		if (!container || !selector) {
			this.lastError = new Error('Invalid container or selector');
			return null;
		}

		try {
			return container.querySelector(selector);
		} catch (e) {
			console.error(`Error with selector ${selector}:`, e);
			this.lastError = e;
			return null;
		}
	}

	/**
	 * Find an element by multiple selectors in priority order
	 * @param {Element} container - Container element to search within
	 * @param {Array} selectors - Array of selector objects with query and priority
	 * @returns {Element|null} The highest priority matching element or null
	 */
	findElementsBySelectors(container, selectors) {
		if (!container || !selectors || !Array.isArray(selectors)) {
			this.lastError = new Error('Invalid container or selectors');
			return null;
		}

		// Sort selectors by priority (highest first)
		const sortedSelectors = [...selectors].sort((a, b) => 
			(b.priority || 0) - (a.priority || 0)
		);

		// Try each selector in order
		for (const selector of sortedSelectors) {
			try {
				const element = this.findElementBySelector(container, selector.query);
				if (element) {
					return element;
				}
			} catch (e) {
				console.error(`Error with selector ${selector.query}:`, e);
			}
		}

		return null;
	}

	/**
	 * Find an element by text content
	 * @param {Element} container - Container element to search within
	 * @param {string} text - Text to search for
	 * @returns {Element|null} The matching element or null
	 */
	findElementByText(container, text) {
		if (!container || !text) {
			this.lastError = new Error('Invalid container or text');
			return null;
		}

		const normalizedText = this.normalizeText(text);
		
		try {
			// Get all elements with text content
			const elements = Array.from(container.querySelectorAll('*'));
			
			// Find elements containing the text
			for (const element of elements) {
				const elementText = this.getTextContent(element);
				if (elementText.includes(normalizedText)) {
					return element;
				}
			}
		} catch (e) {
			console.error('Error in findElementByText:', e);
			this.lastError = e;
		}

		return null;
	}

	/**
	 * Find elements by text patterns in priority order
	 * @param {Element} container - Container element to search within
	 * @param {Array} textPatterns - Array of pattern objects with pattern and priority
	 * @returns {Element|null} The highest priority matching element or null
	 */
	findElementsByTextPatterns(container, textPatterns) {
		if (!container || !textPatterns || !Array.isArray(textPatterns)) {
			this.lastError = new Error('Invalid container or text patterns');
			return null;
		}

		// Sort patterns by priority (highest first)
		const sortedPatterns = [...textPatterns].sort((a, b) => 
			(b.priority || 0) - (a.priority || 0)
		);

		try {
			// For each pattern, try to find a matching element
			for (const pattern of sortedPatterns) {
				const element = this.findElementByText(container, pattern.pattern);
				if (element) {
					return element;
				}
			}
		} catch (e) {
			console.error('Error in findElementsByTextPatterns:', e);
			this.lastError = e;
		}

		return null;
	}

	/**
	 * Check if an element should be excluded based on selectors
	 * @param {Element} element - Element to check
	 * @param {Array} excludeSelectors - Array of CSS selectors to exclude
	 * @returns {boolean} True if the element should be excluded
	 */
	isExcluded(element, excludeSelectors) {
		if (!element || !excludeSelectors || !Array.isArray(excludeSelectors)) {
			return false;
		}

		try {
			// Check if element matches any exclude selector
			for (const selector of excludeSelectors) {
				try {
					// Check if element matches or is a descendant of a matching element
					if (element.matches(selector) || element.closest(selector)) {
						return true;
					}
				} catch (e) {
					// Ignore invalid selectors
				}
			}
		} catch (e) {
			console.error('Error in isExcluded:', e);
			this.lastError = e;
		}

		return false;
	}

	/**
	 * Normalize text by removing extra whitespace and converting to lowercase
	 * @param {string} text - Text to normalize
	 * @returns {string} Normalized text
	 */
	normalizeText(text) {
		if (!text) return '';
		
		// Replace all whitespace (including newlines and tabs) with single spaces
		// Then trim and convert to lowercase
		return text.replace(/\s+/g, ' ').trim().toLowerCase();
	}

	/**
	 * Get the text content of an element, normalized
	 * @param {Element} element - Element to get text from
	 * @returns {string} Normalized text content
	 */
	getTextContent(element) {
		if (!element) return '';
		
		try {
			return this.normalizeText(element.textContent);
		} catch (e) {
			console.error('Error in getTextContent:', e);
			this.lastError = e;
			return '';
		}
	}

	/**
	 * Find an element by CSS selector
	 * @param {Element} container - Container element to search within
	 * @param {Array} selectorList - List of selector objects with query and priority
	 * @returns {Element|null} The found element or null
	 */
	findBySelector(container, selectorList) {
		if (!container || !selectorList || !Array.isArray(selectorList)) {
			this.lastError = new Error('Invalid container or selector list');
			return null;
		}

		// Sort selectors by priority (highest first)
		const sortedSelectors = [...selectorList].sort((a, b) => 
			(b.priority || 0) - (a.priority || 0)
		);

		for (const selectorObj of sortedSelectors) {
			try {
				const query = selectorObj.query;
				if (!query) continue;

				const elements = container.querySelectorAll(query);
				if (elements && elements.length > 0) {
					return elements[0]; // Return first match
				}
			} catch (e) {
				console.error(`Error with selector ${selectorObj.query}:`, e);
				this.lastError = e;
			}
		}

		return null;
	}

	/**
	 * Find an element by text content matching patterns
	 * @param {Element} container - Container element to search within
	 * @param {Array} patterns - List of pattern objects with pattern and priority
	 * @param {Array} elementTypes - Array of selectors for element types to consider
	 * @param {Array} excludePatterns - Optional array of patterns to exclude
	 * @returns {Element|null} The found element or null
	 */
	findByTextContent(container, patterns, elementTypes = ['button', '[role="button"]'], excludePatterns = []) {
		if (!container || !patterns || !Array.isArray(patterns)) {
			this.lastError = new Error('Invalid container or patterns');
			return null;
		}

		// Sort patterns by priority (highest first)
		const sortedPatterns = [...patterns].sort((a, b) => 
			(b.priority || 0) - (a.priority || 0)
		);

		try {
			// Get all elements of the specified types
			const elements = container.querySelectorAll(elementTypes.join(','));
			
			// For each element, check for pattern matches
			for (const pattern of sortedPatterns) {
				for (const element of elements) {
					const text = element.textContent.trim().toLowerCase();
					const patternText = pattern.pattern.toLowerCase();
					
					// Skip if empty text
					if (!text) continue;
					
					// Skip if text contains any exclude patterns
					const hasExcludePattern = excludePatterns.some(exclude => 
						text.includes(exclude.toLowerCase())
					);
					
					if (hasExcludePattern) continue;
					
					// Check for pattern match
					if (text.includes(patternText)) {
						return element;
					}
				}
			}
		} catch (e) {
			console.error('Error in findByTextContent:', e);
			this.lastError = e;
		}

		return null;
	}

	/**
	 * Find element by attribute patterns
	 * @param {Element} container - Container element to search within 
	 * @param {Object} attributePatterns - Object with attribute names and pattern arrays
	 * @param {number} priority - Minimum priority to consider
	 * @returns {Element|null} The found element or null
	 */
	findByAttributePatterns(container, attributePatterns, priority = 0) {
		if (!container || !attributePatterns) {
			this.lastError = new Error('Invalid container or attribute patterns');
			return null;
		}

		try {
			// Get all elements
			const elements = container.querySelectorAll('*');
			
			// Check each element for attribute matches
			for (const element of elements) {
				for (const [attrName, patterns] of Object.entries(attributePatterns)) {
					// Skip if no attribute value
					const attrValue = element.getAttribute(attrName);
					if (!attrValue) continue;
					
					// Convert to lowercase for case-insensitive matching
					const lowerAttrValue = attrValue.toLowerCase();
					
					// Check if any pattern matches
					for (const pattern of patterns) {
						if (lowerAttrValue.includes(pattern)) {
							return element;
						}
					}
				}
			}
		} catch (e) {
			console.error('Error in findByAttributePatterns:', e);
			this.lastError = e;
		}

		return null;
	}

	/**
	 * Find element by visual/style properties
	 * @param {Element} container - Container element to search within
	 * @param {Array} stylePatterns - Array of style pattern objects
	 * @param {Array} elementTypes - Array of selectors for element types to consider
	 * @returns {Element|null} The found element or null
	 */
	findByStylePatterns(container, stylePatterns, elementTypes = ['button', '[role="button"]']) {
		if (!container || !stylePatterns || !Array.isArray(stylePatterns)) {
			this.lastError = new Error('Invalid container or style patterns');
			return null;
		}

		// Sort style patterns by priority (highest first)
		const sortedPatterns = [...stylePatterns].sort((a, b) => 
			(b.priority || 0) - (a.priority || 0)
		);

		try {
			// Get all elements of the specified types
			const elements = container.querySelectorAll(elementTypes.join(','));
			
			// For each element, check for style matches
			for (const pattern of sortedPatterns) {
				for (const element of elements) {
					const style = window.getComputedStyle(element);
					const propertyValue = style[pattern.property] || '';
					
					// Check if any of the specified values match
					const hasMatch = pattern.values.some(value => 
						propertyValue.includes(value)
					);
					
					if (hasMatch) {
						return element;
					}
				}
			}
		} catch (e) {
			console.error('Error in findByStylePatterns:', e);
			this.lastError = e;
		}

		return null;
	}

	/**
	 * Find element using all available techniques
	 * @param {Element} container - Container element to search within
	 * @param {string} elementType - Type of element to find (from selectors.json)
	 * @returns {Element|null} The found element or null
	 */
	findElement(container, elementType) {
		if (!container || !elementType) {
			this.lastError = new Error('Invalid container or element type');
			return null;
		}

		// Get configuration for this element type
		const config = this.selectors?.buttonTypes?.[elementType];
		if (!config) {
			this.lastError = new Error(`No configuration found for element type: ${elementType}`);
			return null;
		}

		// Try selector-based detection (highest priority)
		const element = this.findBySelector(container, config.selectors);
		if (element) return element;

		// Try text content matching
		const textElement = this.findByTextContent(
			container, 
			config.textPatterns, 
			['button', 'a[role="button"]', '[type="button"]', '[class*="button"]', '[class*="btn"]'],
			config.excludePatterns
		);
		if (textElement) return textElement;

		// Try style-based detection (lowest priority)
		if (config.stylePatterns) {
			const styleElement = this.findByStylePatterns(container, config.stylePatterns);
			if (styleElement) return styleElement;
		}

		return null;
	}

	/**
	 * Get the last error that occurred during element finding
	 * @returns {Error|null} The last error or null if no error occurred
	 */
	getLastError() {
		return this.lastError;
	}
} 