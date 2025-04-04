// Import required modules
const { settings, loadSettings, openedByExtension, dataCollectionConsent } = require('./modules/settings.js');
const { runCloudMode, capturedDialogs } = require('./modules/cloudDatabase.js');
const { runSmartMode } = require('./handlers/smartFormula.js');
const { sanitizePrivateData, sanitizeUrl } = require('./utils/privacy.js');
const { findAcceptButton, findNecessaryCookiesButton } = require('./utils/buttonFinders.js');
const { clickElement } = require('./utils/elementInteraction.js');
const { analyzeBoxSource } = require('./handlers/smartFormula.js');

/**
 * Initialize the Cookie Consent Manager
 */
function initCookieConsentManager() {
	// Start both modes if enabled
	if (settings.cloudMode) {
		runCloudMode();
	}
	
	if (settings.smartMode) {
		runSmartMode();
	}
}

// Set up message listener for communication with popup and background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'detectionSetting') {
		// Update detection settings
		Object.assign(settings, message.settings);
		sendResponse({ success: true });
		return true;
	} else if (message.action === 'recordInteraction') {
		// Record an interaction with a cookie consent dialog
		// dialog = message.dialog;
		sendResponse({ success: true });
		return true;
	} else if (message.action === 'analyzeSource') {
		try {
			// Analyze source code
			const result = analyzeBoxSource(message.source);
			sendResponse(result);
		} catch (error) {
			console.error('Error analyzing source:', error);
			sendResponse({ 
				error: true, 
				errorDetails: error ? (error.message || error.toString()) : 'Unknown error in analyzeSource'
			});
		}
		return true;
	} else if (message.action === 'submitRating') {
		// Handle rating submission with sanitization
		const { dialogId, rating, isGoodMatch } = message.data;
		
		// Only sanitize data when submitting ratings
		chrome.storage.local.get(['dialogHistory', 'capturedDialogs'], (result) => {
			// Look for the dialog in both locations
			let dialog = (result.capturedDialogs || []).find(d => d.id === dialogId);
			if (!dialog) {
				dialog = (result.dialogHistory || []).find(d => d.id === dialogId);
			}
			
			if (dialog) {
				// Create a sanitized copy for submission
				const sanitizedDialog = {...dialog};
				
				// Sanitize the HTML before submission
				const tempContainer = document.createElement('div');
				tempContainer.innerHTML = dialog.html;
				sanitizePrivateData(tempContainer);
				sanitizedDialog.html = tempContainer.innerHTML;
				
				// Sanitize URL
				sanitizedDialog.url = sanitizeUrl(dialog.url);
				
				// Submit the sanitized dialog with rating
				chrome.runtime.sendMessage({ 
					action: 'submitDialogRating', 
					data: { 
						dialogId, 
						rating, 
						isGoodMatch,
						sanitizedDialog
					}
				}, sendResponse);
			} else {
				sendResponse({ error: 'Dialog not found' });
			}
		});
		return true;
	} else if (message.action === 'getCapturedDialogs') {
		sendResponse({ dialogs: capturedDialogs });
		return true;
	} else if (message.action === 'setDataCollectionConsent') {
		// eslint-disable-next-line no-global-assign
		dataCollectionConsent = message.consent;
		chrome.storage.local.set({ dataCollectionConsent });
		sendResponse({ success: true });
		return true;
	} else if (message.action === 'getDataCollectionConsent') {
		sendResponse({ consent: dataCollectionConsent });
		return true;
	} else if (message.action === 'simulateButtonClick') {
		// Handle button click simulation
		const { buttonText, selector } = message;
		
		try {
			// Try to find the element by selector first
			const containerElement = document.querySelector(selector);
			
			if (containerElement) {
				// Look for a button with matching text within the container
				const buttons = containerElement.querySelectorAll('button, a[role="button"], [type="button"], [class*="button"], [class*="btn"]');
				
				for (const button of buttons) {
					if (button.textContent.trim() === buttonText) {
						// Found a matching button - click it!
						button.click();
						console.log('Cookie Consent Manager: Successfully clicked button:', buttonText);
						sendResponse({ success: true, message: 'Button clicked successfully' });
						return true;
					}
				}
				
				// If no button with exact text is found, try a more lenient approach
				for (const button of buttons) {
					if (button.textContent.trim().includes(buttonText) || 
						buttonText.includes(button.textContent.trim())) {
						// Found a partial match - click it
						button.click();
						console.log('Cookie Consent Manager: Clicked button with partial text match:', button.textContent.trim());
						sendResponse({ success: true, message: 'Button clicked with partial match' });
						return true;
					}
				}
				
				// No match found - just click the first button as fallback
				if (buttons.length > 0) {
					buttons[0].click();
					console.log('Cookie Consent Manager: Clicked first available button as fallback');
					sendResponse({ success: true, message: 'Clicked first available button' });
					return true;
				}
			}
			
			// If we reach here, no button was clicked
			console.log('Cookie Consent Manager: Could not find a button to click');
			sendResponse({ success: false, message: 'No button found to click' });
		} catch (error) {
			console.error('Cookie Consent Manager: Error simulating button click', error);
			sendResponse({ success: false, error: error.message });
		}
		
		return true;
	}
	return true;
});

// Check data collection consent status
chrome.storage.local.get('dataCollectionConsent', (result) => {
	// eslint-disable-next-line no-global-assign
	dataCollectionConsent = result.dataCollectionConsent || false;
});

// Load settings and initialize
loadSettings((loadedSettings) => {
	// Check if this tab was recently opened by our extension
	chrome.storage.local.get(['recentlyOpenedTabs'], (result) => {
		if (result.recentlyOpenedTabs) {
			const currentTabUrl = window.location.href;
			const timestamp = Date.now();
			
			// Look for this URL in recently opened tabs (within last 5 seconds)
			const recentlyOpenedTabs = result.recentlyOpenedTabs.filter(item => {
				return (timestamp - item.timestamp) < 5000; // 5 seconds
			});
			
			const wasOpenedByExtension = recentlyOpenedTabs.some(item => 
				currentTabUrl.includes(item.url) || 
				item.url.includes(currentTabUrl)
			);
			
			if (wasOpenedByExtension) {
				console.log('Cookie Consent Manager: This tab was opened by our extension, disabling auto-accept');
				// eslint-disable-next-line no-global-assign
				openedByExtension = true;
				
				// Clean up the list, removing this URL
				const updatedTabs = recentlyOpenedTabs.filter(item => 
					!currentTabUrl.includes(item.url) && !item.url.includes(currentTabUrl)
				);
				
				chrome.storage.local.set({ recentlyOpenedTabs: updatedTabs });
			} else {
				// Clean expired entries
				chrome.storage.local.set({ recentlyOpenedTabs: recentlyOpenedTabs });
			}
		}
		
		// Only initialize if enabled
		if (settings.enabled) {
			initCookieConsentManager();
		}
	}).catch(error => {
		console.log('Error accessing recentlyOpenedTabs, falling back to defaults', error);
		// Fall back to defaults if Chrome storage fails
		if (settings.enabled) {
			initCookieConsentManager();
		}
	});
}); 