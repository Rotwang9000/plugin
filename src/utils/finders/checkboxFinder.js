import { ElementFinder } from './elementFinder.js';

/**
 * CheckboxFinder class for finding and configuring cookie consent checkboxes
 * Extends the base ElementFinder with checkbox-specific functionality
 */
export class CheckboxFinder extends ElementFinder {
	/**
	 * Create a new CheckboxFinder
	 * @param {Object} selectors - The selectors configuration object
	 */
	constructor(selectors) {
		super(selectors);
	}

	/**
	 * Generic method to find a checkbox by type
	 * @param {Element} container - Container element to search within
	 * @param {string} checkboxType - Type of checkbox to find
	 * @returns {Element|null} The checkbox element or null
	 */
	findCheckboxByType(container, checkboxType) {
		if (!container || !checkboxType) {
			this.lastError = new Error('Invalid container or checkbox type');
			return null;
		}

		try {
			// Get configuration for this checkbox type
			const config = this.selectors?.checkboxTypes?.[checkboxType];
			if (!config) {
				this.lastError = new Error(`No configuration found for checkbox type: ${checkboxType}`);
				return null;
			}

			// Try selector-based detection (highest priority)
			if (config.selectors) {
				for (const selectorObj of config.selectors) {
					try {
						const elements = container.querySelectorAll(selectorObj.query);
						if (elements.length > 0) {
							return elements[0];
						}
					} catch (e) {
						console.error(`Error with selector ${selectorObj.query}:`, e);
					}
				}
			}

			// Try finding by associated label text
			if (config.textPatterns) {
				const checkboxes = this.findAllCheckboxes(container);
				
				for (const checkbox of checkboxes) {
					const label = this.findLabelForCheckbox(checkbox);
					if (!label) continue;
					
					const labelText = label.textContent.trim().toLowerCase();
					
					for (const pattern of config.textPatterns) {
						if (labelText.includes(pattern.pattern.toLowerCase())) {
							return checkbox;
						}
					}
				}
			}

			return null;
		} catch (e) {
			console.error(`Error in findCheckboxByType (${checkboxType}):`, e);
			this.lastError = e;
			return null;
		}
	}

	/**
	 * Find the analytics checkbox
	 * @param {Element} container - Container element to search within
	 * @returns {Element|null} The analytics checkbox or null
	 */
	findAnalyticsCheckbox(container) {
		return this.findCheckboxByType(container, 'analytics');
	}

	/**
	 * Find the advertising checkbox
	 * @param {Element} container - Container element to search within
	 * @returns {Element|null} The advertising checkbox or null
	 */
	findAdvertisingCheckbox(container) {
		return this.findCheckboxByType(container, 'advertising');
	}

	/**
	 * Find the necessary/essential checkbox
	 * @param {Element} container - Container element to search within
	 * @returns {Element|null} The necessary checkbox or null
	 */
	findNecessaryCheckbox(container) {
		return this.findCheckboxByType(container, 'necessary');
	}

	/**
	 * Find and toggle checkboxes according to configuration
	 * @param {Element} container - Container element to search within
	 * @param {Object} config - Configuration object with boolean flags for each checkbox type
	 * @returns {Object} Object with found status for each checkbox type
	 */
	findAndToggleCheckboxes(container, config) {
		if (!container || !config) {
			this.lastError = new Error('Invalid container or config');
			return {};
		}

		const result = {
			necessary: false,
			analytics: false,
			advertising: false
		};

		try {
			// Process each checkbox type
			Object.entries(config).forEach(([type, checked]) => {
				const checkbox = this.findCheckboxByType(container, type);
				if (checkbox) {
					// Mark as found
					result[type] = true;
					
					// Set checked state if different
					if (checkbox.checked !== checked) {
						checkbox.checked = checked;
						
						// Dispatch change event
						const event = new Event('change', { bubbles: true });
						checkbox.dispatchEvent(event);
					}
				}
			});

			return result;
		} catch (e) {
			console.error('Error in findAndToggleCheckboxes:', e);
			this.lastError = e;
			return result;
		}
	}

	/**
	 * Find a label element for a checkbox
	 * @param {Element} checkbox - The checkbox element
	 * @returns {Element|null} The associated label or null
	 */
	findLabelForCheckbox(checkbox) {
		if (!checkbox) {
			this.lastError = new Error('Invalid checkbox element');
			return null;
		}

		try {
			// Method 1: Check for explicit label using 'for' attribute
			if (checkbox.id) {
				const label = document.querySelector(`label[for="${checkbox.id}"]`);
				if (label) return label;
			}

			// Method 2: Check if checkbox is nested inside a label
			let parent = checkbox.parentElement;
			while (parent) {
				if (parent.tagName === 'LABEL') {
					return parent;
				}
				// Don't go too far up the DOM tree
				if (parent.tagName === 'FORM' || parent.tagName === 'BODY') {
					break;
				}
				parent = parent.parentElement;
			}

			// Method 3: Check for labels immediately after the checkbox
			const nextSibling = checkbox.nextElementSibling;
			if (nextSibling && nextSibling.tagName === 'LABEL') {
				return nextSibling;
			}

			// Method 4: Look for any nearby text that might be a label
			const siblingText = checkbox.nextSibling;
			if (siblingText && siblingText.nodeType === Node.TEXT_NODE && siblingText.textContent.trim()) {
				// Create a virtual label for the text
				const virtualLabel = document.createElement('span');
				virtualLabel.textContent = siblingText.textContent;
				return virtualLabel;
			}

			return null;
		} catch (e) {
			console.error('Error in findLabelForCheckbox:', e);
			this.lastError = e;
			return null;
		}
	}

	/**
	 * Determine the type of a checkbox based on its label
	 * @param {Element} checkbox - The checkbox element
	 * @param {Element} label - The label element (optional)
	 * @returns {string|null} The checkbox type or null
	 */
	determineCheckboxType(checkbox, label) {
		if (!checkbox) {
			this.lastError = new Error('Invalid checkbox element');
			return null;
		}

		// If no label provided, try to find it
		if (!label) {
			label = this.findLabelForCheckbox(checkbox);
		}

		// Extract relevant text and attributes
		const labelText = label ? label.textContent.trim().toLowerCase() : '';
		const id = checkbox.id?.toLowerCase() || '';
		const name = checkbox.name?.toLowerCase() || '';
		const className = checkbox.className?.toLowerCase() || '';
		
		// Prepare scores for each type
		const scores = {
			essential: 0,
			analytics: 0,
			marketing: 0
		};

		try {
			// Check against patterns in selectors.json
			Object.entries(this.selectors.checkboxTypes || {}).forEach(([type, config]) => {
				// Check selectors
				config.selectors?.forEach(selector => {
					try {
						// Simple check for ID pattern
						if (selector.query.includes('id') && id) {
							const idPattern = selector.query.match(/\[id\*='([^']+)'\]/);
							if (idPattern && id.includes(idPattern[1])) {
								scores[type] += selector.priority || 5;
							}
						}
						
						// Check name attribute
						if (name && selector.query.includes('name')) {
							const namePattern = selector.query.match(/\[name\*='([^']+)'\]/);
							if (namePattern && name.includes(namePattern[1])) {
								scores[type] += selector.priority || 5;
							}
						}
					} catch (e) {
						console.error(`Error checking selector ${selector.query}:`, e);
					}
				});
				
				// Check label text patterns
				if (labelText) {
					config.labelPatterns?.forEach(pattern => {
						if (labelText.includes(pattern.pattern.toLowerCase())) {
							scores[type] += pattern.priority || 5;
						}
					});
				}
			});
			
			// Find type with highest score
			let maxScore = 0;
			let maxType = null;
			
			for (const [type, score] of Object.entries(scores)) {
				if (score > maxScore) {
					maxScore = score;
					maxType = type;
				}
			}
			
			// Return type if score is above threshold
			return maxScore >= 5 ? maxType : null;
		} catch (e) {
			console.error('Error in determineCheckboxType:', e);
			this.lastError = e;
			return null;
		}
	}

	/**
	 * Find all checkboxes in a container
	 * @param {Element} container - Container element to search within
	 * @returns {Element[]} Array of checkbox elements
	 */
	findAllCheckboxes(container) {
		if (!container) {
			this.lastError = new Error('Invalid container');
			return [];
		}

		try {
			// Find all checkboxes and radio buttons
			return Array.from(container.querySelectorAll('input[type="checkbox"], input[type="radio"]'));
		} catch (e) {
			console.error('Error in findAllCheckboxes:', e);
			this.lastError = e;
			return [];
		}
	}

	/**
	 * Configure a checkbox according to its type
	 * @param {Element} checkbox - The checkbox element
	 * @param {string} type - The checkbox type
	 * @returns {boolean} True if the checkbox was configured successfully
	 */
	configureCheckbox(checkbox, type) {
		if (!checkbox || !type) {
			this.lastError = new Error('Invalid checkbox or type');
			return false;
		}

		try {
			// Get configuration for this checkbox type
			const config = this.selectors?.checkboxTypes?.[type];
			if (!config) {
				this.lastError = new Error(`No configuration found for checkbox type: ${type}`);
				return false;
			}

			// Configure checkbox based on settings
			if (config.shouldBeChecked !== undefined) {
				// Don't change if disabled
				if (checkbox.disabled && config.disabled) {
					return true;
				}
				
				// Set checked state
				checkbox.checked = !!config.shouldBeChecked;
				
				// Dispatch change event to trigger any listeners
				const event = new Event('change', { bubbles: true });
				checkbox.dispatchEvent(event);
				
				return true;
			}
			
			return false;
		} catch (e) {
			console.error('Error in configureCheckbox:', e);
			this.lastError = e;
			return false;
		}
	}

	/**
	 * Find and configure all checkboxes in a container
	 * @param {Element} container - Container element to search within
	 * @returns {Object} Result object with success count and configured checkboxes
	 */
	findAndConfigureCheckboxes(container) {
		if (!container) {
			this.lastError = new Error('Invalid container');
			return { success: 0, configured: [] };
		}

		const result = {
			success: 0,
			configured: []
		};

		try {
			// Find all checkboxes
			const checkboxes = this.findAllCheckboxes(container);
			
			// Process each checkbox
			checkboxes.forEach(checkbox => {
				// Find label
				const label = this.findLabelForCheckbox(checkbox);
				
				// Determine type
				const type = this.determineCheckboxType(checkbox, label);
				
				// Configure if type found
				if (type) {
					const configured = this.configureCheckbox(checkbox, type);
					if (configured) {
						result.success++;
						result.configured.push({
							element: checkbox,
							type: type,
							label: label ? label.textContent.trim() : ''
						});
					}
				}
			});
			
			return result;
		} catch (e) {
			console.error('Error in findAndConfigureCheckboxes:', e);
			this.lastError = e;
			return result;
		}
	}
} 