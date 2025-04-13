// Import required modules
import { settings, loadSettings, openedByExtension, dataCollectionConsent } from './modules/settings.js';
import { runCloudMode, capturedDialogs } from './modules/cloudDatabase.js';
import { runSmartMode, analyzeBoxSource } from './handlers/smartFormula.js';
import { sanitizePrivateData, sanitizeUrl } from './utils/privacy.js';
import { getSyncFinders } from './utils/finders/index.js';
import { clickElement } from './utils/elementInteraction.js';

console.log("Content script loaded successfully!");

/**
 * Initialize the Cookie Consent Manager
 */
function initCookieConsentManager() {
	console.log("Initializing Cookie Consent Manager...");
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
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
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
		} else {
			sendResponse({ error: 'Storage API not available' });
		}
		return true;
	} else if (message.action === 'getCapturedDialogs') {
		sendResponse({ dialogs: capturedDialogs });
		return true;
	} else if (message.action === 'setDataCollectionConsent') {
		let updatedConsent = message.consent;
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
			chrome.storage.local.set({ dataCollectionConsent: updatedConsent });
		}
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
	// New message handler for checkForCookieBoxes
	else if (message.action === 'checkForCookieBoxes') {
		// Check for cookie dialog on the page
		// This is a simplified example - you might need more complex detection
		try {
			// Example cookie dialog detection
			const cookieDialogs = document.querySelectorAll([
				'[id*="cookie"]', 
				'[class*="cookie"]',
				'[id*="consent"]',
				'[class*="consent"]',
				'[id*="gdpr"]',
				'[class*="gdpr"]'
			].join(', '));
			
			let dialogFound = cookieDialogs.length > 0;
			
			sendResponse({ 
				dialogFound: dialogFound,
				elementsFound: dialogFound ? cookieDialogs.length : 0
			});
		} catch (error) {
			console.error('Error checking for cookie boxes:', error);
			sendResponse({ 
				error: true, 
				message: error.message || 'Unknown error checking for cookie dialogs'
			});
		}
		return true;
	}
	// New message handler for cookie actions
	else if (message.action === 'handleCookieAction') {
		try {
			const cookieAction = message.cookieAction;
			let success = false;
			
			// Get the finder instances
			const { buttonFinder } = getSyncFinders();
			
			if (cookieAction === 'accept') {
				// Try to find and click the accept button using new finder class
				const acceptButton = buttonFinder.findAcceptButton(document.documentElement);
				if (acceptButton) {
					clickElement(acceptButton);
					success = true;
				}
			} else if (cookieAction === 'customize') {
				// Try to find and click the reject/necessary cookies button using new finder class
				const necessaryButton = buttonFinder.findRejectButton(document.documentElement);
				if (necessaryButton) {
					clickElement(necessaryButton);
					success = true;
				}
			}
			
			sendResponse({ success });
		} catch (error) {
			console.error('Error handling cookie action:', error);
			sendResponse({ 
				success: false, 
				error: error.message || 'Unknown error handling cookie action'
			});
		}
		return true;
	}
	
	return true;
});

// Check data collection consent status safely
let localDataCollectionConsent = false;
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
	chrome.storage.local.get('dataCollectionConsent', (result) => {
		try {
			localDataCollectionConsent = result.dataCollectionConsent === true;
			console.log('Data collection consent:', localDataCollectionConsent);
		} catch (error) {
			console.error('Error accessing data collection consent:', error);
		}
	});
} else {
	console.log('Chrome storage API not available for data collection consent');
}

// Load settings and initialize
loadSettings((loadedSettings) => {
	// Check if this tab was recently opened by our extension
	if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
		chrome.storage.local.get(['recentlyOpenedTabs'], (result) => {
			try {
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
						// Don't modify imported variables, use local vars
						let localOpenedByExtension = true;
						
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
				
				// Always initialize the cookie consent manager after checking tab status
				initCookieConsentManager();
			} catch (error) {
				console.error('Error checking recently opened tabs:', error);
				// Initialize anyway in case of error
				initCookieConsentManager();
			}
		});
	} else {
		// Initialize directly if Chrome storage is not available
		console.log('Chrome storage API not available for recently opened tabs');
		initCookieConsentManager();
	}
}); 