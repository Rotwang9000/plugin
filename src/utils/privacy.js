/**
 * Sanitize potential private data from HTML
 * @param {Element} element - DOM element to sanitize
 */
function sanitizePrivateData(element) {
	// Remove all input values, emails, phone numbers
	const inputs = element.querySelectorAll('input, textarea');
	inputs.forEach(input => {
		if (input.value) input.value = '[REDACTED]';
		if (input.placeholder) input.placeholder = '[REDACTED]';
	});
	
	// Remove all attributes that might contain user data
	const allElements = element.querySelectorAll('*');
	const sensitiveAttributes = ['data-email', 'data-user', 'data-id', 'data-name', 'data-customer', 'data-account'];
	
	allElements.forEach(el => {
		sensitiveAttributes.forEach(attr => {
			if (el.hasAttribute(attr)) {
				el.setAttribute(attr, '[REDACTED]');
			}
		});
		
		// Check for email patterns in text content and attributes
		for (let i = 0; i < el.attributes.length; i++) {
			const attr = el.attributes[i];
			if (containsEmailPattern(attr.value) || containsUKPostcodePattern(attr.value)) {
				el.setAttribute(attr.name, '[REDACTED]');
			}
		}
	});
	
	// Redact text nodes that might contain emails or other private data
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	const textNodes = [];
	
	while (walker.nextNode()) {
		textNodes.push(walker.currentNode);
	}
	
	textNodes.forEach(node => {
		if (containsEmailPattern(node.nodeValue) || 
			containsPhonePattern(node.nodeValue) ||
			containsUKPostcodePattern(node.nodeValue)) {
			node.nodeValue = node.nodeValue
				.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED EMAIL]')
				.replace(/(\+?[\d\s\(\)-]{10,})/g, '[REDACTED PHONE]')
				.replace(/\b[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}\b/g, '[REDACTED POSTCODE]');
		}
	});
}

/**
 * Check if text contains email pattern
 * @param {string} text - Text to check
 * @returns {boolean} Whether text contains an email pattern
 */
function containsEmailPattern(text) {
	return /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
}

/**
 * Check if text contains phone number pattern
 * @param {string} text - Text to check
 * @returns {boolean} Whether text contains a phone number pattern
 */
function containsPhonePattern(text) {
	// More specific phone pattern that won't match as aggressively
	return /(\+?\d{1,3}[-\s\.]?)?\(?\d{3,4}\)?[-\s\.]?\d{3,4}[-\s\.]?\d{3,4}/.test(text);
}

/**
 * Check if text contains UK postcode pattern
 * @param {string} text - Text to check
 * @returns {boolean} Whether text contains a UK postcode pattern
 */
function containsUKPostcodePattern(text) {
	// UK postcode pattern
	return /\b[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}\b/.test(text);
}

/**
 * Sanitize URL to remove query parameters and hash which might contain private data
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
function sanitizeUrl(url) {
	try {
		const parsedUrl = new URL(url);
		return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
	} catch (e) {
		// If URL parsing fails, just return the domain
		return window.location.hostname;
	}
}

export { 
	sanitizePrivateData, 
	containsEmailPattern, 
	containsPhonePattern, 
	containsUKPostcodePattern, 
	sanitizeUrl 
}; 