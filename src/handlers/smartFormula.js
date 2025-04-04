// Import required modules
const { ukPrivacyTerms } = require('../modules/cloudDatabase.js');
const { isElementVisible, hasHighZIndex } = require('../utils/elementInteraction.js');
const { findAcceptButton, findNecessaryCookiesButton } = require('../utils/buttonFinders.js');
const { processCookieElement } = require('./dialogCapture.js');

/**
 * Check if element was added by JavaScript (not in original source)
 * @param {Element} element - The element to check
 * @returns {boolean} Whether the element was likely added by JavaScript
 */
function isJavaScriptAdded(element) {
	// Elements in the original HTML typically don't have dataset attributes
	// or high number of inline styles
	const hasDataAttributes = Object.keys(element.dataset).length > 0;
	
	// Check for dynamic positioning styles
	const style = window.getComputedStyle(element);
	const hasPositionStyles = style.position === 'fixed' || style.position === 'absolute';
	const hasZIndexStyle = parseInt(style.zIndex, 10) > 100;
	
	// Check for certain class patterns common in dynamically added elements
	const className = element.className || '';
	const hasDynamicClasses = /modal|popup|overlay|banner|notice|consent/i.test(className);
	
	// Check if the element uses certain JS frameworks' patterns
	const hasFrameworkPatterns = element.hasAttribute('data-reactid') || 
		element.hasAttribute('ng-') || 
		element.hasAttribute('v-') || 
		element.querySelector('[data-reactid], [ng-], [v-]');
	
	// If it meets several criteria, it's likely JS-added
	let score = 0;
	if (hasDataAttributes) score += 1;
	if (hasPositionStyles) score += 1;
	if (hasZIndexStyle) score += 1;
	if (hasDynamicClasses) score += 1;
	if (hasFrameworkPatterns) score += 1;
	
	return score >= 2; // Return true if it meets at least 2 criteria
}

/**
 * Check an element for cookie banner characteristics
 * @param {Element} element - The element to check
 * @returns {boolean} Whether the element is a cookie banner
 */
function checkElementForCookieBanner(element) {
	// Import settings
	const { settings } = require('../modules/settings.js');
	
	// Only process if enabled in smart mode
	if (!settings.enabled || !settings.smartMode) return false;
	
	// Check element and all its descendants
	if (!element) return false;
	
	// Skip non-element nodes
	if (element.nodeType !== Node.ELEMENT_NODE) return false;
	
	// Skip elements that are not visible
	if (!isElementVisible(element)) return false;
	
	// Skip really small elements (likely not cookie dialogs)
	if (element.offsetWidth < 200 || element.offsetHeight < 50) return false;
	
	// Skip elements that we've already processed
	if (element.dataset.cookieConsentProcessed) return false;
	element.dataset.cookieConsentProcessed = true;
	
	let foundCookieDialog = false;
	
	// Check element content for cookie-related terms first
	const textContent = element.textContent.toLowerCase();
	const elementHTML = element.innerHTML.toLowerCase();
	
	// Check if it contains cookie-related terms
	const hasPrivacyTerms = ukPrivacyTerms.some(term => 
		textContent.includes(term) || elementHTML.includes(term)
	);
	
	// Check if element was likely added by JavaScript (improves accuracy)
	const likelyJsAdded = isJavaScriptAdded(element);
	
	if (hasPrivacyTerms) {
		// Look for interactive elements (buttons or links)
		const hasButtons = element.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]').length > 0;
		
		// Increase confidence if the element was added by JavaScript
		if (hasButtons && (likelyJsAdded || hasHighZIndex(element))) {
			// Verify there's an accept button
			const acceptButton = findAcceptButton(element);
			if (acceptButton) {
				// Process this as a cookie element
				console.log('Cookie Consent Manager: Detected cookie consent dialog via smart formula', element);
				processCookieElement(element, 'smart-formula', 'smart-detection');
				foundCookieDialog = true;
			}
		}
	}
	
	// If we didn't find one on this element, check children too
	if (!foundCookieDialog) {
		// Check children recursively (major dialogs only)
		if (element.children.length > 0 && element.querySelectorAll('*').length < 500) {
			for (const child of element.children) {
				// Check large, visible children only
				if (child.nodeType === Node.ELEMENT_NODE && 
					isElementVisible(child) &&
					child.offsetWidth >= 200 && child.offsetHeight >= 50) {
					const childResult = checkElementForCookieBanner(child);
					if (childResult) {
						foundCookieDialog = true;
						break;
					}
				}
			}
		}
	}
	
	return foundCookieDialog;
}

/**
 * Check existing elements on the page for cookie banners
 */
function checkExistingElements() {
	// Check all visible divs that might be cookie consent dialogs
	const potentialBanners = document.querySelectorAll(`
		div[class*="cookie"], div[class*="consent"], div[class*="privacy"], 
		div[id*="cookie"], div[id*="consent"], div[id*="privacy"], 
		div[class*="banner"], div[class*="popup"], div[class*="modal"],
		div[class*="gdpr"], div[id*="gdpr"], div[class*="notice"], 
		div[id*="notice"], div[aria-label*="cookie"], div[role="dialog"],
		div[aria-modal="true"], div[data-testid*="cookie"],
		form[id*="cookie"], form[action*="cookie"], form[action*="consent"],
		form[action*="privacy"], form[id*="cc"], form[class*="cookie"]
	`);
	
	potentialBanners.forEach(element => {
		checkElementForCookieBanner(element);
	});
}

/**
 * Run the smart mode detection
 */
function runSmartMode() {
	// First check if elements already exist on page
	checkExistingElements();
	
	// Set up a mutation observer to detect new elements
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			// Check for added nodes
			if (mutation.addedNodes && mutation.addedNodes.length > 0) {
				// Check each added node
				for (let i = 0; i < mutation.addedNodes.length; i++) {
					const node = mutation.addedNodes[i];
					// Only process element nodes
					if (node.nodeType === 1) {
						checkElementForCookieBanner(node);
					}
				}
			}
			
			// Also check for attribute changes that might make a hidden element visible
			if (mutation.type === 'attributes' && 
				(mutation.attributeName === 'style' || 
				 mutation.attributeName === 'class' || 
				 mutation.attributeName === 'hidden' ||
				 mutation.attributeName === 'aria-hidden')) {
				checkElementForCookieBanner(mutation.target);
			}
		});
	});
	
	// Configure the observer to watch for:
	// - New elements added to the DOM
	// - Changes to style, class, hidden attributes
	observer.observe(document.body, { 
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['style', 'class', 'hidden', 'aria-hidden', 'display', 'visibility']
	});
	
	// Add a delayed check for dynamic banners that load after a few seconds
	setTimeout(() => {
		checkExistingElements();
	}, 1500);
	
	return observer;
}

/**
 * Analyzes the source code of a cookie consent box
 * @param {string} source - HTML source code of the cookie consent box
 * @returns {Object} Analysis result with recommendations
 */
function analyzeBoxSource(source) {
	try {
		// Validate input
		if (!source || typeof source !== 'string') {
			console.error('Invalid source input:', source);
			return {
				error: true,
				errorDetails: 'Invalid source input. Expected a string but received: ' + 
					(source === null ? 'null' : typeof source)
			};
		}
		
		// Create a temporary container to parse the source
		const container = document.createElement('div');
		container.innerHTML = source;
		
		// Check if the source contains cookie consent related terms
		const text = container.textContent.toLowerCase();
		const innerHTML = container.innerHTML.toLowerCase();
		
		// Check for cookie-related terms
		const hasCookieTerms = ukPrivacyTerms.some(term => 
			text.includes(term) || innerHTML.includes(term)
		);
		
		// Check for buttons
		const buttons = container.querySelectorAll('button, a[role="button"], [type="button"], [type="submit"], [class*="button"], [class*="btn"]');
		const hasButtons = buttons.length > 0;
		
		// Look for accept button
		let acceptButton, hasAcceptButton;
		try {
			acceptButton = findAcceptButton(container);
			hasAcceptButton = !!acceptButton;
		} catch (buttonError) {
			console.error('Error finding accept button:', buttonError);
			return {
				error: true,
				errorDetails: 'Error finding accept button: ' + buttonError.message
			};
		}
		
		// Look for necessary cookies button
		let necessaryButton, hasNecessaryButton;
		try {
			necessaryButton = findNecessaryCookiesButton(container);
			hasNecessaryButton = !!necessaryButton;
		} catch (buttonError) {
			console.error('Error finding necessary button:', buttonError);
			return {
				error: true,
				errorDetails: 'Error finding necessary button: ' + buttonError.message
			};
		}
		
		// Check if this is a form
		const isForm = container.querySelector('form') !== null;
		
		// Evaluate smart formula effectiveness
		const effective = hasCookieTerms && (hasAcceptButton || hasNecessaryButton);
		
		// Generate recommendations for formula improvements
		let recommendations = [];
		
		if (!hasCookieTerms) {
			recommendations.push('Add more cookie/privacy-related terms to detection patterns');
		}
		
		if (!hasButtons && !isForm) {
			recommendations.push('Improve detection of non-standard interactive elements');
		}
		
		if (!hasAcceptButton && !hasNecessaryButton) {
			recommendations.push('Enhance button detection for non-standard naming patterns');
			// Check what text the buttons have to provide specific recommendations
			if (buttons.length > 0) {
				const buttonTexts = Array.from(buttons)
					.map(b => b.textContent.trim())
					.filter(t => t.length > 0);
				if (buttonTexts.length > 0) {
					recommendations.push(`Add pattern matching for button texts like: ${buttonTexts.join(', ')}`);
				}
			}
		}
		
		// Check for common structures that might be missed
		let missingStructures = [];
		try {
			missingStructures = identifyMissingStructures(container);
		} catch (structureError) {
			console.error('Error identifying missing structures:', structureError);
			// Don't fail the whole analysis, just log the error
		}
		
		if (missingStructures.length > 0) {
			recommendations = [...recommendations, ...missingStructures];
		}
		
		return {
			detected: effective,
			hasCookieTerms,
			hasButtons,
			hasAcceptButton,
			hasNecessaryButton,
			isForm,
			acceptButtonText: acceptButton ? acceptButton.textContent.trim() : null,
			necessaryButtonText: necessaryButton ? necessaryButton.textContent.trim() : null,
			recommendations
		};
	} catch (error) {
		console.error('Error analyzing box source:', error);
		return {
			error: true,
			errorDetails: error.message || 'An unknown error occurred during analysis'
		};
	}
}

/**
 * Identifies missing patterns or structures in the smart formula
 * @param {HTMLElement} container - The parsed content container
 * @returns {Array} List of recommendations for missing patterns
 */
function identifyMissingStructures(container) {
	const recommendations = [];
	
	// Check for unusual but recognizable cookie consent structures
	
	// 1. Check for iframe-based cookie notices
	if (container.querySelector('iframe')) {
		recommendations.push('Add support for iframe-based cookie notices');
	}
	
	// 2. Check for shadow DOM usage (can only detect hints of it in source)
	if (container.innerHTML.includes('shadowroot') || 
		container.innerHTML.includes('shadow-root') ||
		container.querySelector('[data-shadow]')) {
		recommendations.push('Consider adding shadow DOM traversal for cookie notices');
	}
	
	// 3. Check for unusual class naming patterns
	const classes = Array.from(container.querySelectorAll('[class]'))
		.map(el => el.className)
		.join(' ');
	
	if (classes.includes('privacy') && !classes.includes('cookie')) {
		recommendations.push('Add more privacy-focused class detection patterns');
	}
	
	if (classes.includes('gdpr') && !classes.includes('cookie')) {
		recommendations.push('Enhance GDPR-specific element detection');
	}
	
	if (classes.includes('cmp') || classes.includes('cmpbox')) {
		recommendations.push('Add detection for CMP (Consent Management Platform) standard elements');
	}
	
	return recommendations;
}

module.exports = {
	checkElementForCookieBanner,
	checkExistingElements,
	runSmartMode,
	analyzeBoxSource,
	identifyMissingStructures,
	isJavaScriptAdded
}; 