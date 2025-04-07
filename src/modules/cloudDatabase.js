// Import required modules
import { settings, openedByExtension, dataCollectionConsent, detectRegion } from './settings.js';
import { clickElement } from '../utils/elementInteraction.js';

// Cloud database - Contains generic patterns, no site-specific entries
const cloudDatabase = {
	// Common selectors that work across many sites
	common: [
		// General cookie consent patterns
		{ 
			selector: '.cookie-accept-all', 
			type: 'button', 
			patternId: 'cookie-accept', 
			rating: 4.9,
			signature: {
				classPatterns: ['cookie-', 'accept'],
				structure: 'div > .cookie-accept-all'
			}
		},
		{ 
			selector: '.cookie-accept-necessary', 
			type: 'button', 
			patternId: 'cookie-necessary', 
			rating: 4.7,
			necessary: true // Marks this as a "necessary cookies only" option
		},
		{ 
			selector: '.fc-cta-consent', 
			type: 'button', 
			patternId: 'consent', 
			rating: 4.9,
			signature: {
				classPatterns: ['fc-', 'consent'],
				structure: 'div > div > button.fc-cta-consent'
			}
		},
		// Other common cookie consent selectors
		{ selector: '#onetrust-accept-btn-handler', type: 'button', rating: 4.7 },
		{ selector: '.cc-accept-all', type: 'button', rating: 4.5 },
		{ selector: '.js-accept-cookies', type: 'button', rating: 4.3 },
		{ selector: '#accept-cookies', type: 'button', rating: 4.6 },
		{ selector: '.consent-banner__button--primary', type: 'button', rating: 4.4 },
		{ selector: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', type: 'button', rating: 4.8 },
		// Common necessary-only options
		{ selector: '#onetrust-reject-all-handler', type: 'button', rating: 4.6, necessary: true },
		{ selector: '.cc-accept-necessary', type: 'button', rating: 4.4, necessary: true },
		{ selector: '.js-accept-essential', type: 'button', rating: 4.2, necessary: true },
		{ selector: '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll', type: 'button', rating: 4.7, necessary: true }
	]
};

// Privacy terms for detection
const ukPrivacyTerms = [
	'cookie', 'cookies', 'gdpr', 'data protection', 'privacy', 
	'consent', 'personal data', 'legitimate interest', 'ccpa', 
	'cpra', 'opt-out', 'opt out', 'policy', 'privacy policy', 
	'data privacy', 'privacy notice', 'cookie policy', 'accept cookies',
	'cookie preferences', 'cookie settings', 'privacy settings'
];

// Store captured dialogs
let capturedDialogs = [];

/**
 * Finds similar patterns in the DOM based on cloud signatures
 * @param {string} region - The detected region
 */
function findSimilarPatterns(region) {
	// Skip auto-accepting if this tab was opened by our extension
	if (openedByExtension && settings.autoAccept) {
		console.log('Cookie Consent Manager: Skipping pattern-based auto-accept on tab opened by extension');
		return;
	}
	
	// Filter for patterns based on DOM structure and classes
	const patterns = cloudDatabase.common.filter(item => 
		item.signature && (!item.region || item.region === region)
	);
	
	for (const pattern of patterns) {
		if (!pattern.signature) continue;
		
		// Try to find elements matching the signature patterns
		const elements = document.querySelectorAll(`[class*="${pattern.signature.classPatterns[0]}"]`);
		for (const element of elements) {
			// Check if this element matches our pattern
			const classes = element.className.toLowerCase();
			const matchesAllPatterns = pattern.signature.classPatterns.every(
				classPattern => classes.includes(classPattern)
			);
			
			if (matchesAllPatterns) {
				console.log('Cookie Consent Manager: Found element via signature pattern matching', classes);
				
				// Dynamically import to avoid circular dependency
				// Wrap import in try/catch to handle any potential errors
				try {
					import('../handlers/dialogCapture.js').then(module => {
						try {
							if (module && typeof module.captureDialog === 'function') {
								module.captureDialog(element, `signature-match-${pattern.patternId}`, 'cloud-signature');
							}
						} catch (importError) {
							console.error('Error with dialogCapture module:', importError);
						}
					}).catch(error => {
						console.error('Error importing dialogCapture module:', error);
					});
				} catch (error) {
					console.error('Error with dynamic import:', error);
				}
				
				// Only click if autoAccept is enabled - with longer delay to ensure capture completes
				if (settings.autoAccept) {
					setTimeout(() => clickElement(element), 800);
				}
				return;
			}
		}
	}
}

/**
 * Run the cloud mode detection
 * @returns {boolean} Whether a match was found
 */
function runCloudMode() {
	// Check if cloud mode is active
	if (!settings.cloudMode) {
		return false;
	}
	
	// Check if consent is given for cloud mode
	if (!dataCollectionConsent) {
		console.log('Cookie Consent Manager: Cloud mode requires consent.');
		return false;
	}
	
	// Skip auto-accepting if this tab was opened by our extension
	if (openedByExtension && settings.autoAccept) {
		console.log('Cookie Consent Manager: Skipping cloud auto-accept on tab opened by extension');
		return false;
	}
	
	const currentDomain = window.location.hostname;
	const region = detectRegion(currentDomain);
	
	// Try common selectors
	const selectors = cloudDatabase.common;
	
	// Check for premium access before allowing GDPR compliance mode
	// For now, we'll just check the setting, in the future this would check premium status
	const isPremiumUser = settings.gdprCompliance; // This will be replaced with actual premium status check
	
	// Prefer "necessary only" if in GDPR compliance mode and user has premium
	if (isPremiumUser && settings.gdprCompliance && region === 'uk') {
		// Look for necessary-only buttons first
		const necessarySelectors = selectors.filter(item => item.necessary);
		for (const item of necessarySelectors) {
			const element = document.querySelector(item.selector);
			if (element) {
				console.log('Cookie Consent Manager: Found necessary-only button via selector', item.selector);
				
				// Dynamically import to avoid circular dependency
				// Wrap import in try/catch to handle any potential errors
				try {
					import('../handlers/dialogCapture.js').then(module => {
						try {
							if (module && typeof module.captureDialog === 'function') {
								module.captureDialog(element, item.selector, 'cloud-common-necessary');
							}
						} catch (importError) {
							console.error('Error with dialogCapture module:', importError);
						}
					}).catch(error => {
						console.error('Error importing dialogCapture module:', error);
					});
				} catch (error) {
					console.error('Error with dynamic import:', error);
				}
				
				// Only click if autoAccept is enabled - with longer delay to ensure capture completes
				if (settings.autoAccept) {
					setTimeout(() => clickElement(element), 800);
				}
				return true;
			}
		}
	}
	
	// Then try standard accept buttons
	for (const item of selectors) {
		// Skip necessary-only buttons in this pass
		if (item.necessary) continue;
		
		const element = document.querySelector(item.selector);
		if (element) {
			console.log('Cookie Consent Manager: Found element via common selector', item.selector);
			
			// Dynamically import to avoid circular dependency
			// Wrap import in try/catch to handle any potential errors
			try {
				import('../handlers/dialogCapture.js').then(module => {
					try {
						if (module && typeof module.captureDialog === 'function') {
							module.captureDialog(element, item.selector, 'cloud-common');
						}
					} catch (importError) {
						console.error('Error with dialogCapture module:', importError);
					}
				}).catch(error => {
					console.error('Error importing dialogCapture module:', error);
				});
			} catch (error) {
				console.error('Error with dynamic import:', error);
			}
			
			// Only click if autoAccept is enabled - with longer delay to ensure capture completes
			if (settings.autoAccept) {
				setTimeout(() => clickElement(element), 800);
			}
			return true;
		}
	}
	
	// If no common selectors matched, try to find similar patterns based on the signature
	findSimilarPatterns(region);
	return false;
}

export { 
	cloudDatabase, 
	ukPrivacyTerms, 
	capturedDialogs, 
	findSimilarPatterns, 
	runCloudMode 
}; 