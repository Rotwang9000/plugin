/**
 * Database module for storing website data, statistics and managing cookie consent history
 */

const { log, objectToJson, jsonToObject } = require('./utils');

/**
 * Save website data to Chrome storage
 * @param {string} domain - Domain to save data for
 * @param {Object} data - Data to save for this domain
 * @param {Function} callback - Callback function to run when complete
 */
function saveWebsiteData(domain, data, callback) {
	chrome.storage.local.get('websiteData', (result) => {
		const websiteData = result.websiteData || {};
		websiteData[domain] = {
			...data,
			lastUpdated: Date.now()
		};
		
		chrome.storage.local.set({ websiteData }, callback);
	});
}

/**
 * Get website data from Chrome storage
 * @param {string} domain - Domain to get data for
 * @param {Function} callback - Callback function to run with data
 */
function getWebsiteData(domain, callback) {
	chrome.storage.local.get('websiteData', (result) => {
		const websiteData = result.websiteData || {};
		if (websiteData[domain]) {
			callback(websiteData[domain]);
		} else {
			callback(null);
		}
	});
}

/**
 * Check if a website is already known in the database
 * @param {string} domain - Domain to check
 * @param {Function} callback - Callback function with boolean result
 */
function isKnownWebsite(domain, callback) {
	getWebsiteData(domain, (data) => {
		callback(data !== null);
	});
}

/**
 * Update statistics after handling a cookie dialog
 * @param {string} domain - Domain that was handled
 * @param {boolean} accepted - Whether cookies were accepted
 * @param {Function} callback - Callback function to run when complete
 */
function updateStatistics(domain, accepted, callback) {
	chrome.storage.local.get('statistics', (result) => {
		const statistics = result.statistics || {
			totalHandled: 0,
			acceptedCount: 0,
			rejectedCount: 0,
			sitesVisited: []
		};
		
		statistics.totalHandled++;
		
		if (accepted) {
			statistics.acceptedCount++;
		} else {
			statistics.rejectedCount++;
		}
		
		// Add the domain to the list of visited sites if not already there
		if (!statistics.sitesVisited.includes(domain)) {
			statistics.sitesVisited.push(domain);
		}
		
		chrome.storage.local.set({ statistics }, callback);
	});
}

/**
 * Get statistics data
 * @param {Function} callback - Callback function with statistics data
 */
function getStatistics(callback) {
	chrome.storage.local.get('statistics', (result) => {
		const statistics = result.statistics || {
			totalHandled: 0,
			acceptedCount: 0,
			rejectedCount: 0,
			sitesVisited: []
		};
		callback(statistics);
	});
}

/**
 * Save cookie consent history entry
 * @param {string} domain - Domain where consent was handled
 * @param {string} action - Action taken (accept/reject/custom)
 * @param {boolean} autoHandled - Whether it was auto-handled
 * @param {Object} details - Additional details about the consent
 * @param {Function} callback - Callback function to run when complete
 */
function saveConsentHistory(domain, action, autoHandled, details, callback) {
	chrome.storage.local.get('consentHistory', (result) => {
		const consentHistory = result.consentHistory || [];
		
		consentHistory.push({
			domain,
			action,
			autoHandled,
			details,
			timestamp: Date.now()
		});
		
		// Limit history size to prevent storage issues
		if (consentHistory.length > 1000) {
			consentHistory.shift(); // Remove oldest entry
		}
		
		chrome.storage.local.set({ consentHistory }, callback);
	});
}

/**
 * Get consent history entries
 * @param {number} limit - Maximum number of entries to return (0 for all)
 * @param {Function} callback - Callback function with history data
 */
function getConsentHistory(limit, callback) {
	chrome.storage.local.get('consentHistory', (result) => {
		const consentHistory = result.consentHistory || [];
		
		// Sort by timestamp (newest first)
		consentHistory.sort((a, b) => b.timestamp - a.timestamp);
		
		// Apply limit if specified
		const limitedHistory = limit > 0 ? consentHistory.slice(0, limit) : consentHistory;
		
		callback(limitedHistory);
	});
}

/**
 * Clear all database storage
 * @param {Function} callback - Callback function to run when complete
 */
function clearAllData(callback) {
	chrome.storage.local.clear(callback);
}

// Export all functions
module.exports = {
	saveWebsiteData,
	getWebsiteData,
	isKnownWebsite,
	updateStatistics,
	getStatistics,
	saveConsentHistory,
	getConsentHistory,
	clearAllData
}; 