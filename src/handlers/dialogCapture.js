// Import required modules
const { sanitizeUrl } = require('../utils/privacy.js');
const { detectRegion } = require('../modules/settings.js');

/**
 * Capture a cookie dialog for analysis and reporting
 * @param {Element} element - The element (usually a button) that triggered the capture
 * @param {string} selector - The selector used to find the element
 * @param {string} method - The detection method used
 */
function captureDialog(element, selector, method) {
	try {
		// Get the parent container if it's just a button
		const container = (element.tagName === 'BUTTON' || element.tagName === 'A') 
			? element.closest('div[class*="cookie"], div[class*="consent"], div[class*="banner"], div[class*="popup"], div[class*="modal"], div[class*="gdpr"], div[class*="notice"]') || element.parentElement 
			: element;
		
		// No longer checking for consent here as dialog capture is considered essential functionality
		// and the data is only stored locally until explicit submission
		
		// Create a simplified clone of the container
		const clonedHtml = container.cloneNode(true);
		
		// Remove scripts and unnecessary attributes to make it lighter
		const scripts = clonedHtml.querySelectorAll('script');
		scripts.forEach(script => script.remove());
		
		// Store the original HTML without redaction
		// Sanitization will occur only when submitting with good/bad ratings
		
		// Determine button type based on the selector and method
		let buttonType = 'unknown';
		
		if (selector.includes('necessary-only') || selector.includes('smart-detection-necessary')) {
			buttonType = 'essential_only';
		} else if (require('../modules/settings.js').settings.gdprCompliance && method.includes('gdpr')) {
			buttonType = 'gdpr_necessary';
		} else if (element.textContent.toLowerCase().includes('accept') || 
				 element.textContent.toLowerCase().includes('agree') ||
				 element.textContent.toLowerCase().includes('allow')) {
			buttonType = 'accept_all';
		} else if (element.textContent.toLowerCase().includes('decline') || 
				 element.textContent.toLowerCase().includes('reject') ||
				 element.textContent.toLowerCase().includes('refuse')) {
			buttonType = 'decline';
		} else if (element.textContent.toLowerCase().includes('settings') || 
				 element.textContent.toLowerCase().includes('preferences') ||
				 element.textContent.toLowerCase().includes('customise') ||
				 element.textContent.toLowerCase().includes('customize')) {
			buttonType = 'customise';
		} else if (element.textContent.toLowerCase().includes('necessary') || 
				 element.textContent.toLowerCase().includes('essential') ||
				 element.textContent.toLowerCase().includes('required')) {
			buttonType = 'necessary_only';
		}
		
		// Create a dialog record
		const dialog = {
			id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
			url: window.location.href, // Store the original URL, we'll sanitize when needed
			domain: window.location.hostname,
			selector,
			method,
			buttonType,
			buttonText: element.textContent.trim().substring(0, 50), // Capture the button text (limited to 50 chars)
			html: clonedHtml.outerHTML,
			capturedAt: new Date().toISOString(),
			region: detectRegion(window.location.hostname)
		};
		
		// Add to captured dialogs cache
		const { capturedDialogs } = require('../modules/cloudDatabase.js');
		capturedDialogs.push(dialog);
		
		// Notify the background script that we captured a dialog
		chrome.runtime.sendMessage({ 
			action: 'dialogCaptured', 
			dialog: dialog
		});
		
		return dialog;
	} catch (error) {
		console.error('Cookie Consent Manager: Error capturing dialog', error);
		return null;
	}
}

/**
 * Process an element identified as a cookie consent dialog
 * @param {Element} element - The cookie consent element
 * @param {string} selector - The selector used to identify it
 * @param {string} method - The method used to detect it
 * @returns {boolean} Whether processing was successful
 */
function processCookieElement(element, selector, method) {
	// Import required dependencies
	const { settings, openedByExtension } = require('../modules/settings.js');
	const { detectRegion } = require('../modules/settings.js');
	const { findAcceptButton, findNecessaryCookiesButton } = require('../utils/buttonFinders.js');
	const { clickElement } = require('../utils/elementInteraction.js');
	
	// Skip auto-accepting if this tab was opened by our extension
	if (openedByExtension && settings.autoAccept) {
		console.log('Cookie Consent Manager: Skipping auto-accept on tab opened by extension');
		captureDialog(element, selector, method + '-no-autoaccept');
		return true;
	}
	
	// First, check for buttons
	const isPremiumUser = settings.gdprCompliance; // This would be replaced with actual premium check
	
	if (isPremiumUser && settings.gdprCompliance && detectRegion(window.location.hostname) === 'uk') {
		// For GDPR compliance, try to find necessary-only button first
		const necessaryButton = findNecessaryCookiesButton(element);
		if (necessaryButton) {
			// Extra safety check - don't click if it's an informational link
			if (necessaryButton.tagName === 'A' && 
				((necessaryButton.getAttribute('target') === '_blank') ||
				 (necessaryButton.getAttribute('rel')?.includes('noopener')))) {
				
				const buttonText = necessaryButton.textContent.toLowerCase().trim();
				const informationalPhrases = ['more about', 'learn more', 'read more', 'cookie policy', 'privacy policy'];
				
				if (informationalPhrases.some(phrase => buttonText.includes(phrase))) {
					console.log('Cookie Consent Manager: Not clicking button that appears to be informational:', buttonText);
					captureDialog(element, 'smart-detection-skipped', 'smart-gdpr-informational');
					return true;
				}
			}
			
			console.log('Cookie Consent Manager: Found necessary cookies button in banner', element);
			captureDialog(element, 'smart-detection-necessary', 'smart-gdpr');
			
			// Only click if autoAccept is enabled - with longer delay
			if (settings.autoAccept) {
				setTimeout(() => clickElement(necessaryButton), 800);
			}
			return true;
		}
	}
	
	// If no necessary button found or GDPR compliance is off, try the regular accept button
	const acceptButton = findAcceptButton(element);
	if (acceptButton) {
		// Extra safety check - don't click if it's an informational link
		if (acceptButton.tagName === 'A' && 
			((acceptButton.getAttribute('target') === '_blank') ||
			 (acceptButton.getAttribute('rel')?.includes('noopener')))) {
			
			const buttonText = acceptButton.textContent.toLowerCase().trim();
			const href = acceptButton.getAttribute('href') || '';
			const informationalPhrases = [
				'more about', 'learn more', 'read more', 'cookie policy', 'privacy policy',
				'cookie information', 'more information', 'our cookies', 'data protection'
			];
			
			if (informationalPhrases.some(phrase => buttonText.includes(phrase)) || 
				href.includes('policy') || href.includes('cookie') || href.includes('privacy')) {
				console.log('Cookie Consent Manager: Not clicking button that appears to be informational:', buttonText);
				captureDialog(element, 'smart-detection-skipped', 'smart-informational');
				return true;
			}
		}
		
		console.log('Cookie Consent Manager: Found accept button in banner', element);
		captureDialog(element, 'smart-detection', 'smart');
		
		// Only click if autoAccept is enabled - with longer delay
		if (settings.autoAccept) {
			setTimeout(() => clickElement(acceptButton), 800);
		}
		return true;
	}
	
	return false;
}

module.exports = {
	captureDialog,
	processCookieElement
}; 