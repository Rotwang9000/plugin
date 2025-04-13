/**
 * DOM Helper functions for testing
 * Provides utilities for creating and manipulating DOM elements in tests
 */

/**
 * Create a DOM structure from HTML string
 * @param {string} html - HTML to use for setup
 * @returns {HTMLElement} - The created container
 */
export function setupDOM(html) {
	document.body.innerHTML = '';
	const container = document.createElement('div');
	container.innerHTML = html;
	document.body.appendChild(container);
	return container;
}

/**
 * Create a simple cookie banner for testing
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} - The created cookie banner
 */
export function createCookieBanner(options = {}) {
	const {
		id = 'cookie-banner',
		className = 'cookie-notice',
		text = 'This website uses cookies to improve your experience',
		showAccept = true,
		showReject = true,
		showSettings = true
	} = options;
	
	const banner = document.createElement('div');
	banner.id = id;
	banner.className = className;
	
	// Add content
	const contentDiv = document.createElement('div');
	contentDiv.className = 'cookie-content';
	
	// Add text
	const paragraph = document.createElement('p');
	paragraph.textContent = text;
	contentDiv.appendChild(paragraph);
	
	// Add buttons container
	const buttonsDiv = document.createElement('div');
	buttonsDiv.className = 'cookie-buttons';
	
	// Add accept button
	if (showAccept) {
		const acceptButton = document.createElement('button');
		acceptButton.id = 'accept-cookies';
		acceptButton.className = 'accept-button';
		acceptButton.textContent = 'Accept All';
		buttonsDiv.appendChild(acceptButton);
	}
	
	// Add reject button
	if (showReject) {
		const rejectButton = document.createElement('button');
		rejectButton.id = 'reject-cookies';
		rejectButton.className = 'reject-button';
		rejectButton.textContent = 'Reject All';
		buttonsDiv.appendChild(rejectButton);
	}
	
	// Add settings button
	if (showSettings) {
		const settingsButton = document.createElement('button');
		settingsButton.id = 'cookie-settings';
		settingsButton.className = 'settings-button';
		settingsButton.textContent = 'Cookie Settings';
		buttonsDiv.appendChild(settingsButton);
	}
	
	// Assemble banner
	contentDiv.appendChild(buttonsDiv);
	banner.appendChild(contentDiv);
	
	// Add to document
	document.body.appendChild(banner);
	
	return banner;
}

/**
 * Create a checkbox-based cookie settings panel
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} - The created settings panel
 */
export function createCookieSettingsPanel(options = {}) {
	const {
		id = 'cookie-settings-panel',
		className = 'settings-panel',
		includeNecessary = true,
		includeAnalytics = true,
		includeMarketing = true,
		necessaryDisabled = true
	} = options;
	
	const panel = document.createElement('div');
	panel.id = id;
	panel.className = className;
	
	// Create form
	const form = document.createElement('form');
	form.className = 'cookie-form';
	
	// Necessary cookies
	if (includeNecessary) {
		const necessaryDiv = document.createElement('div');
		necessaryDiv.className = 'cookie-group';
		
		const necessaryLabel = document.createElement('label');
		necessaryLabel.htmlFor = 'necessary-cookies';
		necessaryLabel.className = 'cookie-label';
		
		const necessaryCheckbox = document.createElement('input');
		necessaryCheckbox.type = 'checkbox';
		necessaryCheckbox.id = 'necessary-cookies';
		necessaryCheckbox.name = 'necessary';
		necessaryCheckbox.checked = true;
		if (necessaryDisabled) {
			necessaryCheckbox.disabled = true;
		}
		
		const necessaryText = document.createElement('span');
		necessaryText.textContent = 'Necessary Cookies (Required)';
		
		necessaryLabel.appendChild(necessaryCheckbox);
		necessaryLabel.appendChild(necessaryText);
		necessaryDiv.appendChild(necessaryLabel);
		form.appendChild(necessaryDiv);
	}
	
	// Analytics cookies
	if (includeAnalytics) {
		const analyticsDiv = document.createElement('div');
		analyticsDiv.className = 'cookie-group';
		
		const analyticsLabel = document.createElement('label');
		analyticsLabel.htmlFor = 'analytics-cookies';
		analyticsLabel.className = 'cookie-label';
		
		const analyticsCheckbox = document.createElement('input');
		analyticsCheckbox.type = 'checkbox';
		analyticsCheckbox.id = 'analytics-cookies';
		analyticsCheckbox.name = 'analytics';
		
		const analyticsText = document.createElement('span');
		analyticsText.textContent = 'Analytics Cookies';
		
		analyticsLabel.appendChild(analyticsCheckbox);
		analyticsLabel.appendChild(analyticsText);
		analyticsDiv.appendChild(analyticsLabel);
		form.appendChild(analyticsDiv);
	}
	
	// Marketing cookies
	if (includeMarketing) {
		const marketingDiv = document.createElement('div');
		marketingDiv.className = 'cookie-group';
		
		const marketingLabel = document.createElement('label');
		marketingLabel.htmlFor = 'marketing-cookies';
		marketingLabel.className = 'cookie-label';
		
		const marketingCheckbox = document.createElement('input');
		marketingCheckbox.type = 'checkbox';
		marketingCheckbox.id = 'marketing-cookies';
		marketingCheckbox.name = 'marketing';
		
		const marketingText = document.createElement('span');
		marketingText.textContent = 'Marketing Cookies';
		
		marketingLabel.appendChild(marketingCheckbox);
		marketingLabel.appendChild(marketingText);
		marketingDiv.appendChild(marketingLabel);
		form.appendChild(marketingDiv);
	}
	
	// Buttons
	const buttonsDiv = document.createElement('div');
	buttonsDiv.className = 'settings-buttons';
	
	const saveButton = document.createElement('button');
	saveButton.type = 'button';
	saveButton.id = 'save-preferences';
	saveButton.className = 'save-button';
	saveButton.textContent = 'Save Preferences';
	
	const acceptAllButton = document.createElement('button');
	acceptAllButton.type = 'button';
	acceptAllButton.id = 'accept-all';
	acceptAllButton.className = 'accept-button';
	acceptAllButton.textContent = 'Accept All';
	
	buttonsDiv.appendChild(saveButton);
	buttonsDiv.appendChild(acceptAllButton);
	
	form.appendChild(buttonsDiv);
	panel.appendChild(form);
	
	// Add to document
	document.body.appendChild(panel);
	
	return panel;
}

/**
 * Check if an element is visible based on its style
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - Whether the element is visible
 */
export function isElementVisible(element) {
	if (!element) return false;
	
	// Get computed style
	const style = window.getComputedStyle(element);
	
	// Check visibility
	return style.display !== 'none' && 
		style.visibility !== 'hidden' && 
		style.opacity !== '0';
}

/**
 * Create a mock element for testing
 * @param {string} tagName - Element tag name
 * @param {Object} attributes - Element attributes
 * @param {string} content - Element text content
 * @returns {HTMLElement} - The created element
 */
export function createMockElement(tagName, attributes = {}, content = '') {
	const element = document.createElement(tagName);
	
	// Set attributes
	Object.entries(attributes).forEach(([key, value]) => {
		if (key === 'class' || key === 'className') {
			element.className = value;
		} else if (key === 'style' && typeof value === 'object') {
			Object.entries(value).forEach(([styleKey, styleValue]) => {
				element.style[styleKey] = styleValue;
			});
		} else {
			element.setAttribute(key, value);
		}
	});
	
	// Set content
	if (content) {
		element.textContent = content;
	}
	
	return element;
} 