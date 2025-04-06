/**
 * Smart Detection module for identifying cookie consent dialogs
 */

import { safeGetHtmlContent } from '../modules/html-utils.js';

/**
 * Check if an element is likely a cookie consent dialog
 * @param {Element} element - DOM element to check
 * @returns {boolean} - Whether the element is likely a cookie consent dialog
 */
export function isCookieConsentDialog(element) {
	if (!element) return false;
	
	// Get element HTML content in lowercase
	const htmlContent = safeGetHtmlContent(element);
	
	// Check for common cookie consent terms
	const hasCookieTerms = (
		htmlContent.includes('cookie') ||
		htmlContent.includes('gdpr') ||
		htmlContent.includes('consent') ||
		htmlContent.includes('privacy') ||
		htmlContent.includes('data policy')
	);
	
	// Check for common button text
	const hasActionButtons = (
		htmlContent.includes('accept') ||
		htmlContent.includes('agree') ||
		htmlContent.includes('got it') ||
		htmlContent.includes('i understand') ||
		htmlContent.includes('ok') ||
		htmlContent.includes('allow') ||
		htmlContent.includes('reject') ||
		htmlContent.includes('preferences') ||
		htmlContent.includes('settings')
	);
	
	// Check for common dialog characteristics
	const isDialog = (
		element.classList.contains('cookie') ||
		element.classList.contains('consent') ||
		element.classList.contains('privacy') ||
		element.classList.contains('gdpr') ||
		element.id.includes('cookie') ||
		element.id.includes('consent') ||
		element.id.includes('privacy') ||
		element.id.includes('gdpr') ||
		element.getAttribute('aria-label')?.toLowerCase().includes('cookie') ||
		element.getAttribute('role') === 'dialog'
	);
	
	// Dialog is usually fixed position at top/bottom
	const isFixed = (
		window.getComputedStyle(element).position === 'fixed' ||
		window.getComputedStyle(element).position === 'sticky'
	);
	
	// Combination of factors
	return (hasCookieTerms && hasActionButtons) || (isDialog && (hasCookieTerms || hasActionButtons)) || (isFixed && hasCookieTerms);
}

/**
 * Find potential cookie consent dialogs in the page
 * @param {Function} callback - Callback with array of detected elements
 */
export function findCookieConsentDialogs(callback) {
	// Potential dialog container selectors
	const potentialSelectors = [
		'#cookieConsent', 
		'#cookie-consent',
		'#cookie-banner',
		'#cookie-notice',
		'#gdpr-banner',
		'#gdpr-consent',
		'.cookie-banner',
		'.cookie-notice',
		'.cookie-consent',
		'.gdpr-banner',
		'.gdpr-consent',
		'[aria-label*="cookie"]',
		'[aria-label*="consent"]',
		'[data-testid*="cookie"]',
		'div[class*="cookie"]',
		'div[class*="gdpr"]',
		'div[class*="consent"]',
		'div[id*="cookie"]',
		'div[id*="gdpr"]',
		'div[id*="consent"]'
	];
	
	// First try specific selectors
	let potentialDialogs = [];
	potentialSelectors.forEach(selector => {
		try {
			const elements = document.querySelectorAll(selector);
			elements.forEach(element => {
				if (isCookieConsentDialog(element)) {
					potentialDialogs.push(element);
				}
			});
		} catch (e) {
			// Ignore selector errors
		}
	});
	
	// If no dialogs found, try a broader approach
	if (potentialDialogs.length === 0) {
		// Look for fixed position elements that may be cookie banners
		const fixedElements = document.querySelectorAll('div[style*="position:fixed"], div[style*="position: fixed"]');
		fixedElements.forEach(element => {
			if (isCookieConsentDialog(element)) {
				potentialDialogs.push(element);
			}
		});
		
		// Look at body's immediate children for potential dialogs
		const bodyChildren = document.body.children;
		for (let i = 0; i < bodyChildren.length; i++) {
			const child = bodyChildren[i];
			if (child.tagName === 'DIV' && isCookieConsentDialog(child)) {
				potentialDialogs.push(child);
			}
		}
	}
	
	// Remove duplicates (child elements that are already included in parent)
	const uniqueDialogs = [];
	potentialDialogs.forEach(dialog => {
		let isDuplicate = false;
		for (const unique of uniqueDialogs) {
			if (unique.contains(dialog) || dialog.contains(unique)) {
				// If existing element contains this one or vice versa, it's a duplicate
				if (dialog.innerHTML.length > unique.innerHTML.length) {
					// Replace with the larger element
					const index = uniqueDialogs.indexOf(unique);
					uniqueDialogs[index] = dialog;
				}
				isDuplicate = true;
				break;
			}
		}
		if (!isDuplicate) {
			uniqueDialogs.push(dialog);
		}
	});
	
	callback(uniqueDialogs);
}

/**
 * Analyze a dialog's source code for cookie-related patterns
 * @param {string} html - Dialog HTML to analyze
 * @returns {Object} - Analysis results
 */
export function analyzeDialogSource(html) {
	if (!html) return { score: 0, details: [] };
	
	const lowerHtml = html.toLowerCase();
	let score = 0;
	const details = [];
	
	// Check for common cookie consent patterns
	const patterns = [
		{ name: 'Cookie mention', pattern: /cookie/gi, weight: 1 },
		{ name: 'Privacy mention', pattern: /privacy/gi, weight: 0.5 },
		{ name: 'GDPR mention', pattern: /gdpr|general data protection/gi, weight: 1.5 },
		{ name: 'Consent wording', pattern: /consent|agree|accept/gi, weight: 1 },
		{ name: 'Tracking mention', pattern: /track|analytics|monitor/gi, weight: 0.8 },
		{ name: 'Preferences option', pattern: /preferences|settings|customize/gi, weight: 0.7 },
		{ name: 'Accept button', pattern: /\b(accept( all)?|agree|allow|got it|i understand)\b/gi, weight: 1.5 },
		{ name: 'Reject button', pattern: /\b(reject( all)?|decline|refuse|no thanks)\b/gi, weight: 1.5 },
		{ name: 'Only necessary', pattern: /\b(only (necessary|essential|required)|essential only)\b/gi, weight: 2 },
		{ name: 'Cookie policy link', pattern: /\b(cookie policy|privacy policy)\b/gi, weight: 1 },
		{ name: 'Cookie settings', pattern: /\b(cookie settings|customize cookies)\b/gi, weight: 1.2 }
	];
	
	// Check each pattern
	patterns.forEach(patternInfo => {
		const matches = (lowerHtml.match(patternInfo.pattern) || []);
		if (matches.length > 0) {
			const patternScore = Math.min(matches.length * patternInfo.weight, patternInfo.weight * 3);
			score += patternScore;
			details.push({
				pattern: patternInfo.name,
				matches: matches.length,
				score: patternScore
			});
		}
	});
	
	// Normalize score from 0-10
	const normalizedScore = Math.min(Math.round(score), 10);
	
	return {
		score: normalizedScore,
		confidence: normalizedScore >= 7 ? 'high' : (normalizedScore >= 4 ? 'medium' : 'low'),
		details
	};
}

/**
 * Extract important elements from a dialog
 * @param {Element} dialogElement - Dialog DOM element
 * @returns {Array} - Array of important elements
 */
export function extractDialogElements(dialogElement) {
	if (!dialogElement) return [];
	
	const detectedElements = [];
	
	// Find buttons
	const buttons = dialogElement.querySelectorAll('button, a[role="button"], [type="button"], [class*="button"], [class*="btn"]');
	buttons.forEach(button => {
		detectedElements.push({
			tagName: button.tagName,
			text: button.textContent.trim(),
			type: 'button',
			html: button.outerHTML,
			classes: button.className,
			id: button.id
		});
	});
	
	// Find links
	const links = dialogElement.querySelectorAll('a:not([role="button"])');
	links.forEach(link => {
		detectedElements.push({
			tagName: link.tagName,
			text: link.textContent.trim(),
			href: link.href,
			type: 'link',
			html: link.outerHTML,
			classes: link.className,
			id: link.id
		});
	});
	
	// Find form inputs
	const inputs = dialogElement.querySelectorAll('input[type="checkbox"], input[type="radio"]');
	inputs.forEach(input => {
		const label = input.closest('label') || document.querySelector(`label[for="${input.id}"]`);
		detectedElements.push({
			tagName: input.tagName,
			type: 'input',
			inputType: input.type,
			text: label ? label.textContent.trim() : '',
			checked: input.checked,
			html: input.outerHTML,
			classes: input.className,
			id: input.id
		});
	});
	
	return detectedElements;
} 