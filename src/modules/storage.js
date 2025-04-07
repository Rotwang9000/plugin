/**
 * Storage utility module for Chrome extension storage operations
 */

/**
 * Default settings for the extension
 */
export const DEFAULT_SETTINGS = {
	enabled: true,
	autoAccept: true,
	smartMode: true,
	cloudMode: false,
	privacyMode: false,
	gdprCompliance: true,
	devMode: false
};

/**
 * Get the current extension settings
 * @param {Function} callback - Callback function with settings object
 */
export function getSettings(callback) {
	chrome.storage.local.get(['settings'], (result) => {
		const settings = result.settings || {};
		
		// Ensure all default settings exist
		const completeSettings = {
			...DEFAULT_SETTINGS,
			...settings
		};
		
		if (typeof callback === 'function') {
			callback(completeSettings);
		}
	});
}

/**
 * Promise-based wrapper for getSettings
 * @returns {Promise<Object>} Promise resolving with settings object
 */
export function getSettingsAsync() {
	return new Promise((resolve) => {
		getSettings((settings) => {
			resolve(settings);
		});
	});
}

/**
 * Save settings to storage
 * @param {Object} settings - Settings object to save
 * @param {Function} callback - Optional callback after save
 */
export function saveSettings(settings, callback) {
	chrome.storage.local.set({ settings }, () => {
		// Notify background script of setting changes
		chrome.runtime.sendMessage({ 
			action: 'settingsUpdated', 
			settings 
		});
		
		if (typeof callback === 'function') {
			callback();
		}
	});
}

/**
 * Promise-based wrapper for saveSettings
 * @param {Object} settings - Settings object to save
 * @returns {Promise} Promise that resolves when settings are saved
 */
export function saveSettingsAsync(settings) {
	return new Promise((resolve) => {
		saveSettings(settings, resolve);
	});
}

/**
 * Get dialog history from storage
 * @param {Function} callback - Callback with dialog history array
 */
export function getDialogHistory(callback) {
	chrome.storage.local.get(['dialogHistory'], (result) => {
		const history = result.dialogHistory || [];
		if (typeof callback === 'function') {
			callback(history);
		}
	});
}

/**
 * Promise-based wrapper for getDialogHistory
 * @returns {Promise<Array>} Promise resolving with dialog history array
 */
export function getDialogHistoryAsync() {
	return new Promise((resolve) => {
		getDialogHistory((history) => {
			resolve(history);
		});
	});
}

/**
 * Save a dialog to history
 * @param {Object} dialog - Dialog object to save
 * @param {Function} callback - Optional callback after save
 */
export function saveDialogToHistory(dialog, callback) {
	getDialogHistory((history) => {
		// Add the new dialog
		history.unshift(dialog);
		
		// Keep only the most recent 100 dialogs
		if (history.length > 100) {
			history = history.slice(0, 100);
		}
		
		// Save back to storage
		chrome.storage.local.set({ dialogHistory: history }, () => {
			if (typeof callback === 'function') {
				callback();
			}
		});
	});
}

/**
 * Promise-based wrapper for saveDialogToHistory
 * @param {Object} dialog - Dialog object to save
 * @returns {Promise} Promise that resolves when dialog is saved
 */
export function saveDialogToHistoryAsync(dialog) {
	return new Promise((resolve) => {
		saveDialogToHistory(dialog, resolve);
	});
}

/**
 * Mark a dialog as reviewed in history
 * @param {string} dialogId - ID of the dialog to mark
 * @param {Function} callback - Optional callback after save
 */
export function markDialogAsReviewed(dialogId, callback) {
	getDialogHistory((history) => {
		// Find and update the dialog
		const updatedHistory = history.map(dialog => {
			if (dialog.id === dialogId) {
				return { ...dialog, reviewed: true };
			}
			return dialog;
		});
		
		// Save back to storage
		chrome.storage.local.set({ dialogHistory: updatedHistory }, () => {
			if (typeof callback === 'function') {
				callback();
			}
		});
	});
}

/**
 * Promise-based wrapper for markDialogAsReviewed
 * @param {string} dialogId - ID of the dialog to mark
 * @returns {Promise} Promise that resolves when dialog is marked
 */
export function markDialogAsReviewedAsync(dialogId) {
	return new Promise((resolve) => {
		markDialogAsReviewed(dialogId, resolve);
	});
}

/**
 * Get or set data collection consent status
 * @param {boolean|null} consent - Set consent status or null to get current status
 * @param {Function} callback - Callback with consent status
 */
export function dataCollectionConsent(consent = null, callback) {
	if (consent === null) {
		// Get consent
		chrome.storage.local.get(['dataCollectionConsent'], (result) => {
			if (typeof callback === 'function') {
				callback(result.dataCollectionConsent === true);
			}
		});
	} else {
		// Set consent
		chrome.storage.local.set({ dataCollectionConsent: consent }, () => {
			if (typeof callback === 'function') {
				callback(consent);
			}
		});
	}
}

/**
 * Promise-based wrapper to get data collection consent
 * @returns {Promise<boolean>} Promise resolving with consent status
 */
export function getDataCollectionConsentAsync() {
	return new Promise((resolve) => {
		dataCollectionConsent(null, (consent) => {
			resolve(consent);
		});
	});
}

/**
 * Promise-based wrapper to set data collection consent
 * @param {boolean} consent - Consent status to set
 * @returns {Promise<boolean>} Promise resolving with the set consent value
 */
export function setDataCollectionConsentAsync(consent) {
	return new Promise((resolve) => {
		dataCollectionConsent(consent, (status) => {
			resolve(status);
		});
	});
} 