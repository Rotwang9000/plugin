/**
 * Utility functions for Cookie Consent Manager server
 */

/**
 * Sanitizes HTML to remove potentially sensitive information
 * @param {string} html - The HTML to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(html) {
	if (!html) return '';
	
	// Remove all scripts
	let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
	
	// Remove potentially sensitive attributes
	const sensitiveAttributes = [
		'id', 'name', 'data-', 'value', 'autocomplete', 'aria-',
		'placeholder', 'title', 'alt', 'href', 'src'
	];
	
	sensitiveAttributes.forEach(attr => {
		// Handle prefixes like data-* or aria-*
		const isPrefix = attr.endsWith('-');
		
		if (isPrefix) {
			const prefix = attr.slice(0, -1);
			// Use regex to match all attributes starting with the prefix
			const regex = new RegExp(`\\s${prefix}[^\\s"']*=["'][^"']*["']`, 'gi');
			sanitized = sanitized.replace(regex, '');
		} else {
			// Match exact attribute
			const regex = new RegExp(`\\s${attr}=["'][^"']*["']`, 'gi');
			sanitized = sanitized.replace(regex, '');
		}
	});
	
	// Remove email addresses
	sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
	
	// Remove phone numbers
	sanitized = sanitized.replace(/\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, '[PHONE]');
	
	// Remove URLs with query parameters
	sanitized = sanitized.replace(/https?:\/\/[^\s"']*\?[^\s"']*/g, match => {
		// Strip everything after the ? to remove query parameters
		return match.split('?')[0];
	});
	
	return sanitized;
}

/**
 * Sanitizes a URL by removing query parameters
 * @param {string} url - The URL to sanitize
 * @returns {string} Sanitized URL
 */
function sanitizeUrl(url) {
	if (!url) return '';
	
	// Remove query parameters
	const sanitized = url.split('?')[0];
	
	// Remove any hash fragments
	return sanitized.split('#')[0];
}

/**
 * Extracts domain from a URL
 * @param {string} url - The URL to extract domain from
 * @returns {string} The extracted domain
 */
function extractDomain(url) {
	try {
		if (!url) return '';
		
		// Create URL object
		const urlObj = new URL(url);
		
		// Extract hostname (domain)
		return urlObj.hostname;
	} catch (error) {
		console.error('Error extracting domain:', error);
		return url; // Return original if parsing fails
	}
}

/**
 * Analyzes HTML to extract additional information
 * @param {string} html - The HTML to analyze
 * @returns {Object} Analysis results
 */
function analyzeHtml(html) {
	if (!html) return {};
	
	// Extract all clickable elements
	const buttons = [];
	const buttonRegex = /<button[^>]*>([^<]*)<\/button>|<a[^>]*>([^<]*)<\/a>|<input[^>]*type=["']button["'][^>]*>|<input[^>]*type=["']submit["'][^>]*>/gi;
	
	let match;
	while ((match = buttonRegex.exec(html)) !== null) {
		// Try to extract the text content
		const buttonText = (match[1] || match[2] || '').trim();
		
		// Skip empty buttons
		if (!buttonText) continue;
		
		buttons.push(buttonText);
	}
	
	return {
		buttonCount: buttons.length,
		buttonTexts: buttons
	};
}

/**
 * Validates review data
 * @param {Object} data - The review data to validate
 * @returns {Object} Validation result with { valid, errors }
 */
function validateReviewData(data) {
	const errors = [];
	
	// Check required fields
	const requiredFields = ['url', 'domain', 'selector', 'html', 'buttonType'];
	
	requiredFields.forEach(field => {
		if (!data[field]) {
			errors.push(`Missing required field: ${field}`);
		}
	});
	
	// Validate URL format if present
	if (data.url && !isValidUrl(data.url)) {
		errors.push('Invalid URL format');
	}
	
	// Validate HTML size (should be reasonable)
	if (data.html && data.html.length > 1000000) { // 1MB limit
		errors.push('HTML content is too large');
	}
	
	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Checks if a string is a valid URL
 * @param {string} url - The URL to validate
 * @returns {boolean} Whether the URL is valid
 */
function isValidUrl(url) {
	try {
		new URL(url);
		return true;
	} catch (error) {
		return false;
	}
}

module.exports = {
	sanitizeHtml,
	sanitizeUrl,
	extractDomain,
	analyzeHtml,
	validateReviewData,
	isValidUrl
}; 