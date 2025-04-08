import { ElementFinder } from './elementFinder.js';

/**
 * ButtonFinder class for finding buttons in cookie consent dialogs
 * Extends the base ElementFinder with button-specific functionality
 */
export class ButtonFinder extends ElementFinder {
	/**
	 * Create a new ButtonFinder
	 * @param {Object} selectors - The selectors configuration object
	 */
	constructor(selectors) {
		super(selectors);
	}

	/**
	 * Find accept button in a dialog
	 * @param {Element} container - Container element to search within
	 * @returns {Element|null} The accept button or null
	 */
	findAcceptButton(container) {
		return this.findButtonByType(container, 'accept');
	}

	/**
	 * Find reject button in a dialog
	 * @param {Element} container - Container element to search within
	 * @returns {Element|null} The reject button or null
	 */
	findRejectButton(container) {
		return this.findButtonByType(container, 'reject');
	}

	/**
	 * Find customize/settings button in a dialog
	 * @param {Element} container - Container element to search within
	 * @returns {Element|null} The customize button or null
	 */
	findCustomizeButton(container) {
		return this.findButtonByType(container, 'customize');
	}

	/**
	 * Find a button by its type using selectors and text patterns
	 * @param {Element} container - Container element to search within
	 * @param {string} buttonType - Type of button to find (accept, reject, customize)
	 * @returns {Element|null} The button element or null
	 */
	findButtonByType(container, buttonType) {
		if (!container || !buttonType) {
			this.lastError = new Error('Invalid container or button type');
			return null;
		}

		try {
			// Get configuration for this button type
			const config = this.selectors?.buttonTypes?.[buttonType];
			if (!config) {
				this.lastError = new Error(`No configuration found for button type: ${buttonType}`);
				return null;
			}

			// Try selector-based detection (highest priority)
			if (config.selectors) {
				const element = this.findElementsBySelectors(container, config.selectors);
				if (element) return element;
			}

			// Try text-based detection
			if (config.textPatterns) {
				// Get all buttons in the container
				const buttons = this.findAllButtons(container);
				
				// Check each button for matching text
				for (const button of buttons) {
					const buttonText = this.getTextContent(button);
					
					// Skip empty text
					if (!buttonText) continue;
					
					// Skip if button text contains any exclude patterns
					if (config.excludePatterns) {
						const hasExcludePattern = config.excludePatterns.some(exclude => 
							buttonText.includes(this.normalizeText(exclude))
						);
						
						if (hasExcludePattern) continue;
					}
					
					// Check each text pattern
					for (const pattern of config.textPatterns) {
						if (buttonText.includes(this.normalizeText(pattern.pattern))) {
							return button;
						}
					}
				}
			}

			return null;
		} catch (e) {
			console.error(`Error in findButtonByType (${buttonType}):`, e);
			this.lastError = e;
			return null;
		}
	}

	/**
	 * Find all buttons in a container
	 * @param {Element} container - Container element to search within
	 * @returns {Element[]} Array of button elements
	 */
	findAllButtons(container) {
		if (!container) {
			this.lastError = new Error('Invalid container');
			return [];
		}

		try {
			// Find explicit buttons, elements with button role, and input buttons
			return Array.from(container.querySelectorAll(
				'button, [role="button"], input[type="button"], input[type="submit"], a[class*="button"], a[class*="btn"]'
			));
		} catch (e) {
			console.error('Error in findAllButtons:', e);
			this.lastError = e;
			return [];
		}
	}

	/**
	 * Determine the type of a button based on its text and attributes
	 * @param {Element} button - The button element
	 * @returns {string|null} The button type or null
	 */
	determineButtonType(button) {
		if (!button) {
			this.lastError = new Error('Invalid button element');
			return null;
		}

		try {
			const buttonText = this.getTextContent(button);
			const buttonId = button.id?.toLowerCase() || '';
			const buttonClass = button.className?.toLowerCase() || '';
			
			// Check each button type
			for (const [type, config] of Object.entries(this.selectors?.buttonTypes || {})) {
				// Check text patterns
				for (const pattern of config.textPatterns || []) {
					if (buttonText.includes(this.normalizeText(pattern.pattern))) {
						// Skip if button text contains any exclude patterns
						if (config.excludePatterns) {
							const hasExcludePattern = config.excludePatterns.some(exclude => 
								buttonText.includes(this.normalizeText(exclude))
							);
							
							if (hasExcludePattern) continue;
						}
						
						return type;
					}
				}
				
				// Check ID and class patterns
				if (buttonId && config.idPatterns) {
					for (const pattern of config.idPatterns) {
						if (buttonId.includes(pattern.toLowerCase())) {
							return type;
						}
					}
				}
				
				if (buttonClass && config.classPatterns) {
					for (const pattern of config.classPatterns) {
						if (buttonClass.includes(pattern.toLowerCase())) {
							return type;
						}
					}
				}
			}
			
			return null;
		} catch (e) {
			console.error('Error in determineButtonType:', e);
			this.lastError = e;
			return null;
		}
	}
} 