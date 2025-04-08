/**
 * Unified element finders module for cookie consent handling
 * Exports all finder classes and provides a central loading mechanism
 */

// Import all finders
import { ElementFinder } from './elementFinder.js';
import { ButtonFinder } from './buttonFinder.js';
import { CheckboxFinder } from './checkboxFinder.js';
import { DialogFinder } from './dialogFinder.js';
import { RegionDetector } from './regionDetector.js';

// Export all finders
export {
	ElementFinder,
	ButtonFinder,
	CheckboxFinder,
	DialogFinder,
	RegionDetector
};

// Cache for loaded selectors
let cachedSelectors = null;

/**
 * Load selectors from JSON file
 * @returns {Promise<Object>} Promise resolving to selectors object
 */
export async function loadSelectors() {
	// Return cached selectors if available
	if (cachedSelectors) {
		return cachedSelectors;
	}

	try {
		// Try to fetch from different potential locations
		let response;
		const possiblePaths = [
			'selectors.json',
			'/selectors.json',
			'./selectors.json',
			chrome.runtime.getURL('selectors.json')
		];
		
		// Try each path until one works
		for (const path of possiblePaths) {
			try {
				response = await fetch(path);
				if (response.ok) break;
			} catch (e) {
				console.debug(`Fetch failed for path: ${path}`);
				// Continue to next path
			}
		}
		
		// If no successful response, throw error
		if (!response || !response.ok) {
			throw new Error(`Failed to load selectors from any location`);
		}
		
		// Parse JSON
		const selectors = await response.json();
		
		// Cache the selectors
		cachedSelectors = selectors;
		
		console.debug(`Loaded selectors.json (version ${selectors.version})`);
		return selectors;
	} catch (error) {
		console.error('Error loading selectors.json:', error);
		// Return basic default selectors if loading fails
		return getDefaultSelectors();
	}
}

/**
 * Get default selectors for fallback
 * @returns {Object} Default selectors object
 */
function getDefaultSelectors() {
	return {
		version: '1.0.0',
		dialogSelectors: [
			{ query: '#cookie-banner', priority: 10 },
			{ query: '.cookie-banner', priority: 9 },
			{ query: '#cookie-notice', priority: 10 },
			{ query: '.cookie-notice', priority: 9 },
			{ query: '#consent-banner', priority: 10 },
			{ query: '#gdpr-banner', priority: 10 },
			{ query: '#onetrust-banner-sdk', priority: 10 },
			{ query: '#CybotCookiebotDialog', priority: 10 }
		],
		buttonTypes: {
			accept: {
				selectors: [
					{ query: '#onetrust-accept-btn-handler', priority: 10 },
					{ query: '#acceptBtn', priority: 10 },
					{ query: 'button[id*="accept"]', priority: 8 },
					{ query: '[class*="accept"]', priority: 7 }
				],
				textPatterns: [
					{ pattern: 'accept all cookies', priority: 10 },
					{ pattern: 'accept all', priority: 9 },
					{ pattern: 'accept', priority: 5 },
					{ pattern: 'agree', priority: 5 },
					{ pattern: 'ok', priority: 4 }
				]
			},
			reject: {
				selectors: [
					{ query: '#onetrust-reject-all-handler', priority: 10 },
					{ query: '#rejectBtn', priority: 10 },
					{ query: 'button[id*="reject"]', priority: 8 },
					{ query: '[id*="necessary"]', priority: 8 }
				],
				textPatterns: [
					{ pattern: 'reject all', priority: 10 },
					{ pattern: 'necessary only', priority: 9 },
					{ pattern: 'reject', priority: 6 },
					{ pattern: 'decline', priority: 6 }
				]
			},
			customize: {
				selectors: [
					{ query: '#onetrust-pc-btn-handler', priority: 10 },
					{ query: 'button[id*="settings"]', priority: 8 },
					{ query: 'button[id*="custom"]', priority: 8 }
				],
				textPatterns: [
					{ pattern: 'cookie settings', priority: 10 },
					{ pattern: 'customize', priority: 8 },
					{ pattern: 'settings', priority: 8 }
				]
			}
		}
	};
}

/**
 * Create finder instances with loaded selectors
 * @returns {Promise<Object>} Promise resolving to object with all finder instances
 */
export async function createFinders() {
	// Load selectors
	const selectors = await loadSelectors();
	
	// Create finders
	return {
		elementFinder: new ElementFinder(selectors),
		buttonFinder: new ButtonFinder(selectors),
		checkboxFinder: new CheckboxFinder(selectors),
		dialogFinder: new DialogFinder(selectors),
		regionDetector: new RegionDetector(selectors.regionDetection || {})
	};
}

/**
 * Get synchronous finders using cached selectors (for backward compatibility)
 * @returns {Object} Object with all finder instances
 */
export function getSyncFinders() {
	// Use cached selectors or default selectors
	const selectors = cachedSelectors || getDefaultSelectors();
	
	// Create finders
	return {
		elementFinder: new ElementFinder(selectors),
		buttonFinder: new ButtonFinder(selectors),
		checkboxFinder: new CheckboxFinder(selectors),
		dialogFinder: new DialogFinder(selectors),
		regionDetector: new RegionDetector(selectors.regionDetection || {})
	};
} 