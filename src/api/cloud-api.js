/**
 * Cloud API module for interacting with remote services
 */

import { sendMessageToBackground } from './messaging.js';
import { sanitizeUrl } from '../utils/privacy.js';

// Default API endpoint (can be overridden in settings)
const DEFAULT_API_ENDPOINT = 'https://api.cookieconsentmanager.com/';

/**
 * Fetch cookie pattern database from cloud
 * @param {Function} callback - Callback with pattern data
 */
export function fetchCloudPatterns(callback) {
	sendMessageToBackground({ 
		action: 'fetchCloudPatterns' 
	}, response => {
		if (response && response.patterns) {
			callback(response.patterns);
		} else {
			callback([]);
		}
	});
}

/**
 * Report a detected dialog to the cloud service
 * @param {Object} dialog - Dialog data to report
 * @param {Function} callback - Callback with result
 */
export function reportDialogToCloud(dialog, callback) {
	if (!dialog) {
		callback({ success: false, error: 'No dialog data provided' });
		return;
	}
	
	// Ensure we have sanitized data
	const sanitizedDialog = {
		...dialog,
		url: sanitizeUrl(dialog.url || window.location.href),
		timestamp: Date.now()
	};
	
	// Don't send full HTML in automatic reports
	delete sanitizedDialog.html;
	
	sendMessageToBackground({
		action: 'reportDialogToCloud',
		dialog: sanitizedDialog
	}, callback);
}

/**
 * Submit a user rating for a dialog
 * @param {string} dialogId - ID of the dialog
 * @param {number} rating - User rating (1-5)
 * @param {boolean} isGoodMatch - Whether pattern match was accurate
 * @param {Object} dialogData - Additional dialog data
 * @param {Function} callback - Callback with result
 */
export function submitDialogRating(dialogId, rating, isGoodMatch, dialogData, callback) {
	if (!dialogId) {
		callback({ success: false, error: 'No dialog ID provided' });
		return;
	}
	
	// Sanitize URL if present
	if (dialogData && dialogData.url) {
		dialogData.url = sanitizeUrl(dialogData.url);
	}
	
	sendMessageToBackground({
		action: 'submitDialogRating',
		data: {
			dialogId,
			rating,
			isGoodMatch,
			dialogData
		}
	}, callback);
}

/**
 * Check for new cloud patterns and updates
 * @param {Function} callback - Callback with result
 */
export function checkForUpdates(callback) {
	sendMessageToBackground({
		action: 'checkForUpdates'
	}, callback);
}

/**
 * Fetch statistics about dialog detections
 * @returns {Promise<Object>} Promise resolving to statistics data
 */
export function fetchCloudStatistics() {
	return new Promise((resolve) => {
		sendMessageToBackground({
			action: 'fetchCloudStatistics'
		}, response => {
			const stats = response && response.statistics ? response.statistics : {
				totalDialogsDetected: 0,
				successfulClicks: 0,
				cloudMatches: 0,
				smartMatches: 0
			};
			
			resolve(stats);
		});
	});
}

/**
 * Set API endpoint for cloud services
 * @param {string} endpoint - API endpoint URL
 * @param {Function} callback - Callback with result
 */
export function setApiEndpoint(endpoint, callback) {
	if (!endpoint) {
		endpoint = DEFAULT_API_ENDPOINT;
	}
	
	sendMessageToBackground({
		action: 'setApiEndpoint',
		endpoint
	}, callback);
}

/**
 * Check for region-specific regulations
 * @param {string} url - URL to check
 * @returns {string} Detected region (UK, EU, or unknown)
 */
export function checkRegionCompliance(url) {
	const domain = new URL(url).hostname;
	
	// Check for UK domains
	const isUKDomain = domain.endsWith('.uk') || domain.endsWith('.co.uk') || 
		domain.endsWith('.org.uk') || domain.endsWith('.gov.uk');
	
	// Check for EU domains
	const isEUDomain = domain.endsWith('.eu') || domain.endsWith('.de') || 
		domain.endsWith('.fr') || domain.endsWith('.it') || 
		domain.endsWith('.es') || domain.endsWith('.nl');
	
	if (isUKDomain) {
		return 'UK';
	} else if (isEUDomain) {
		return 'EU';
	}
	
	return 'unknown';
}

/**
 * Submit data to the cloud service
 * @param {Object} data - Data to submit
 * @returns {Promise} Promise that resolves with the server response
 */
export function submitToCloud(data) {
	// Create submission with ID and timestamp
	const submission = {
		id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
		...data,
		status: 'pending',
		submittedAt: new Date().toISOString()
	};
	
	// Send message to background script to handle actual submission
	return new Promise((resolve, reject) => {
		sendMessageToBackground({
			action: 'submitToCloud',
			submission
		}, response => {
			if (response && !response.error) {
				resolve(response);
			} else {
				reject(response?.error || 'Unknown error submitting to cloud');
			}
		});
	});
} 