// Import the required modules
import ExtPay from 'extpay';
import { registerMessageHandlers } from './src/api/messaging.js';
import { 
	getSettings, 
	saveSettings, 
	getDialogHistory, 
	saveDialogToHistory, 
	markDialogAsReviewed, 
	dataCollectionConsent 
} from './src/modules/storage.js';
import { submitToCloud, checkRegionCompliance } from './src/api/cloud-api.js';

// Initialize ExtPay for payment handling
const extpay = ExtPay('omyom');
extpay.startBackground();

// Default settings
const DEFAULT_SETTINGS = {
	enabled: true,
	autoAccept: true,
	smartMode: true,
	preferEssential: false,
	buttonPreferences: {
		order: ["accept", "essential", "reject"],
		enabled: {
			accept: true,
			essential: true,
			reject: false  // Disabled by default for non-premium users
		}
	},
	devMode: false,
	// Cloud features - coming soon
	cloudMode: false
};

// Track captured dialogs across tabs
let pendingSubmissions = [];

// Track the most recent button click for reporting
let lastClickedButton = {
	buttonType: null,
	buttonText: null,
	timestamp: null,
	tabId: null
};

/**
 * Record information about a button click
 * @param {Object} clickInfo - Object containing click details
 * @param {Object} sender - Sender information
 */
function recordButtonClick(clickInfo, sender) {
	// Update the last clicked button information
	lastClickedButton = {
		buttonType: clickInfo.buttonType || 'unknown',
		buttonText: clickInfo.buttonText || '',
		timestamp: clickInfo.timestamp || new Date().toISOString(),
		tabId: sender.tab ? sender.tab.id : null,
		url: sender.tab ? sender.tab.url : null
	};
	
	// Update badge to reflect interaction
	updateBadge();
	
	// Store in local storage for persistence
	chrome.storage.local.set({ lastClickedButton });
	
	console.log('Cookie button clicked:', lastClickedButton);
}

/**
 * Get the most recent button click information
 * @param {Function} sendResponse - Function to send response
 */
function getLastButtonClick(sendResponse) {
	// First check if we have info in memory
	if (lastClickedButton.buttonType) {
		sendResponse({ lastClick: lastClickedButton });
		return;
	}
	
	// Otherwise check storage
	chrome.storage.local.get('lastClickedButton', (result) => {
		if (result.lastClickedButton) {
			// Update the in-memory cache
			lastClickedButton = result.lastClickedButton;
			sendResponse({ lastClick: lastClickedButton });
		} else {
			sendResponse({ lastClick: null });
		}
	});
	
	// Return true to indicate we'll send response asynchronously
	return true;
}

// Function to check if user has premium features available
function checkUserPremiumStatus() {
	return new Promise((resolve) => {
		extpay.getUser().then(user => {
			const isPremium = user.paid;
			
			// If user is premium, make sure buttonPreferences is set up properly
			chrome.storage.sync.get(['buttonPreferences', 'preferEssential'], (settings) => {
				const updates = {};
				let needsUpdate = false;
				
				// Set up advanced button preferences for premium users if they don't exist
				if (isPremium && !settings.buttonPreferences) {
					updates.buttonPreferences = DEFAULT_SETTINGS.buttonPreferences;
					needsUpdate = true;
				}
				
				// For non-premium users, set a specific order that prioritizes accept
				if (!isPremium) {
					// Only update if we need to - avoid unnecessary writes
					const nonPremiumButtonPrefs = {
						order: ["accept", "essential", "reject"],
						enabled: {
							accept: true,     // Accept All should be enabled
							essential: true,  // Accept Required should be enabled
							reject: false     // Reject should be disabled for non-premium users
						}
					};
					
					// Check if we need to update the button preferences
					if (!settings.buttonPreferences || 
						settings.buttonPreferences.order.join() !== nonPremiumButtonPrefs.order.join() ||
						settings.buttonPreferences.enabled.reject !== false) {
						
						updates.buttonPreferences = nonPremiumButtonPrefs;
						needsUpdate = true;
					}
					
					// For non-premium, also make sure preferEssential is properly set
					if (settings.preferEssential === undefined) {
						updates.preferEssential = false;
						needsUpdate = true;
					}
				}
				
				if (needsUpdate) {
					chrome.storage.sync.set(updates, () => {
						console.log('Updated cookie preference settings based on premium status');
						resolve(isPremium);
					});
				} else {
					resolve(isPremium);
				}
			});
		}).catch(error => {
			console.error("Error checking payment status:", error);
			// If we can't verify premium status, assume not premium
			resolve(false);
		});
	});
}

// Listen for payment events
extpay.onPaid.addListener(user => {
	console.log('User has paid for premium features!');
	// Set up premium features with default values
	chrome.storage.sync.set({ 
		buttonPreferences: DEFAULT_SETTINGS.buttonPreferences 
	});
	// Update badge
	updateBadge();
});

/**
 * Force check and update button preferences based on premium status
 * This ensures non-premium users have the correct button order
 */
function ensureCorrectButtonPrefs() {
	// Check premium status and update button preferences accordingly
	checkUserPremiumStatus().then(isPremium => {
		console.log('Enforcing button preferences for ' + (isPremium ? 'premium' : 'non-premium') + ' user');
	});
}

// Initialize default settings when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
	// Force update button preferences first
	ensureCorrectButtonPrefs();
	
	// First check if we have settings already stored to restore
	chrome.storage.sync.get(null, (syncData) => {
		// Apply either existing settings or defaults
		const settings = Object.keys(syncData).length > 0 ? syncData : DEFAULT_SETTINGS;
		
		// Apply the settings to chrome.storage.sync if needed
		if (Object.keys(syncData).length === 0) {
			chrome.storage.sync.set(settings);
			console.log('Cookie Consent Manager initialized with default settings');
		} else {
			console.log('Cookie Consent Manager using existing settings');
		}
		
		// Default local storage data
		const defaultLocalData = {
			visitedDomains: {},
			capturedDialogs: [],
			dialogHistory: [],
			pendingSubmissions: [],
			dataCollectionConsent: false,
			initialPermissionAsked: false
		};
		
		// Check if we have local data
		chrome.storage.local.get(null, (localData) => {
			// Apply defaults if needed
			if (Object.keys(localData).length === 0) {
				chrome.storage.local.set(defaultLocalData);
			} else {
				console.log('Restored history with ' + (localData.dialogHistory?.length || 0) + ' entries');
			}
		});
	});

	// Set up alarm for daily cleanup of old domain records
	chrome.alarms.create('cleanupVisitedDomains', { periodInMinutes: 1440 }); // 24 hours
	
	// Set up alarm for regular cleanup of settings
	chrome.alarms.create('cleanupSettings', { periodInMinutes: 10 }); // Every 10 minutes
	
	// Set up an alarm to regularly clean up old dialogs
	chrome.alarms.create('cleanupCapturedDialogs', { periodInMinutes: 720 }); // 12 hours

	// Check premium status on startup
	checkUserPremiumStatus().then(isPremium => {
		console.log('Premium features ' + (isPremium ? 'enabled' : 'disabled'));
	});
});

// Clean up visited domains older than 30 days
function cleanupVisitedDomains() {
	chrome.storage.local.get('visitedDomains', (result) => {
		const domains = result.visitedDomains || {};
		const now = Date.now();
		const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
		let cleanupCount = 0;

		// Remove entries older than 30 days
		Object.keys(domains).forEach(domain => {
			if (now - domains[domain].firstVisit > thirtyDaysInMs) {
				delete domains[domain];
				cleanupCount++;
			}
		});

		// Save updated domain list
		chrome.storage.local.set({ visitedDomains: domains });
		console.log(`Cleaned up ${cleanupCount} old domain records`);
	});
}

// Clean up settings and ensure consistency
function cleanupSettings() {
	chrome.storage.sync.get(null, (settings) => {
		// Create a deep copy of DEFAULT_SETTINGS
		const defaultCopy = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
		
		// Keep the user's button preferences if they exist
		if (settings.buttonPreferences) {
			defaultCopy.buttonPreferences = settings.buttonPreferences;
		}
		
		// Ensure all default settings exist
		const completeSettings = {
			...defaultCopy,
			...settings
		};
		
		// Save back if needed
		if (JSON.stringify(completeSettings) !== JSON.stringify(settings)) {
			chrome.storage.sync.set(completeSettings);
			console.log('Settings cleaned up and validated: ' + new Date().toISOString());
		}
	});
}

// Listen for the alarms
chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === 'cleanupVisitedDomains') {
		cleanupVisitedDomains();
	} else if (alarm.name === 'cleanupCapturedDialogs') {
		cleanupCapturedDialogs();
	} else if (alarm.name === 'cleanupSettings') {
		cleanupSettings();
	}
});

// Record a domain visit
function recordDomainVisit(domain, sendResponse) {
	chrome.storage.local.get('visitedDomains', (result) => {
		const domains = result.visitedDomains || {};
		const now = Date.now();

		// If domain doesn't exist, add it with first visit timestamp
		if (!domains[domain]) {
			domains[domain] = {
				firstVisit: now,
				lastVisit: now,
				visitCount: 1
			};
		} else {
			// Otherwise, update the existing record
			domains[domain].lastVisit = now;
			domains[domain].visitCount += 1;
		}

		// Save updated domain list
		chrome.storage.local.set({ visitedDomains: domains }, () => {
			sendResponse({ success: true, isFirstVisit: domains[domain].visitCount === 1 });
		});
	});
}

// Check if a domain has been visited before
function checkDomainVisited(domain, sendResponse) {
	chrome.storage.local.get('visitedDomains', (result) => {
		const domains = result.visitedDomains || {};
		const domainInfo = domains[domain];
		
		if (domainInfo) {
			sendResponse({
				visited: true,
				isFirstVisit: domainInfo.visitCount === 1,
				firstVisit: domainInfo.firstVisit,
				lastVisit: domainInfo.lastVisit,
				visitCount: domainInfo.visitCount
			});
		} else {
			sendResponse({ visited: false });
		}
	});
}

// Combined function to store dialogs in history
function storeDialogInHistory(dialog, tabId) {
	chrome.storage.local.get(['dialogHistory'], (result) => {
		const history = result.dialogHistory || [];
		
		// Check for duplicates (same domain, button type, and captured within 2 seconds)
		const now = Date.now();
		const threshold = 2000; // 2 seconds threshold for duplicates
		const isDuplicate = history.some(existingDialog => {
			// Compare domain and button type
			if (existingDialog.domain === dialog.domain && 
				existingDialog.buttonType === dialog.buttonType) {
				
				// Compare capture times
				const capturedAt = new Date(existingDialog.capturedAt).getTime();
				return Math.abs(now - capturedAt) < threshold;
			}
			return false;
		});
		
		// Only add if not a duplicate
		if (!isDuplicate) {
			// Add the dialog to the history
			history.push({
				...dialog,
				id: generateId(),
				capturedAt: now,
				reviewed: false,
				needsReview: true
			});
			
			// Limit to 100 history entries
			while (history.length > 100) {
				history.shift();
			}
			
			// Save updated history
			chrome.storage.local.set({ dialogHistory: history }, () => {
				// Update badge
				updateBadge();
				
				// Notify tab if provided
				if (tabId) {
					chrome.tabs.sendMessage(tabId, { action: 'dialogStored' });
				}
			});
		} else {
			console.log('Cookie Consent Manager: Skipped duplicate dialog capture');
		}
	});
}

// Update the extension badge
function updateBadge() {
	chrome.storage.local.get(['capturedDialogs', 'pendingSubmissions'], (result) => {
		const capturedCount = result.capturedDialogs?.length || 0;
		const pendingCount = result.pendingSubmissions?.length || 0;
		const totalCount = capturedCount + pendingCount;
		
		if (totalCount > 0) {
			chrome.action.setBadgeText({ text: totalCount.toString() });
			chrome.action.setBadgeBackgroundColor({ color: '#E53935' });
		} else {
			chrome.action.setBadgeText({ text: '' });
		}
	});
}

// Get the count of captured dialogs
function getCapturedDialogCount(sendResponse) {
	chrome.storage.local.get(['capturedDialogs', 'pendingSubmissions'], (result) => {
		const capturedCount = result.capturedDialogs?.length || 0;
		const pendingCount = result.pendingSubmissions?.length || 0;
		const totalCount = capturedCount + pendingCount;
		sendResponse({ count: totalCount });
	});
}

// Get pending submissions
function getPendingSubmissions(sendResponse) {
	chrome.storage.local.get('pendingSubmissions', (result) => {
		sendResponse({ pendingSubmissions: result.pendingSubmissions || [] });
	});
}

// Clear pending submissions
function clearPendingSubmissions(sendResponse) {
	chrome.storage.local.set({ pendingSubmissions: [] }, () => {
		updateBadge();
		sendResponse({ success: true });
	});
}

// Generate a random ID
function generateId() {
	return Math.random().toString(36).substring(2, 15);
}

// Add this function to clean up any stale captured dialogs
function cleanupCapturedDialogs() {
	chrome.storage.local.get(['capturedDialogs'], (result) => {
		const dialogs = result.capturedDialogs || [];
		
		// Only keep dialogs that are less than 7 days old
		const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
		const filteredDialogs = dialogs.filter(dialog => {
			const capturedAt = typeof dialog.capturedAt === 'string' 
				? new Date(dialog.capturedAt).getTime() 
				: dialog.capturedAt;
			return capturedAt > sevenDaysAgo;
		});
		
		// Save the filtered dialogs
		if (filteredDialogs.length !== dialogs.length) {
			chrome.storage.local.set({ capturedDialogs: filteredDialogs }, () => {
				updateBadge();
			});
		}
	});
}

// Get all captured dialogs
function getCapturedDialogs(sendResponse) {
	chrome.storage.local.get('capturedDialogs', (result) => {
		const dialogs = result.capturedDialogs || [];
		sendResponse({ dialogs });
	});
}

// Update captured dialog count for badge
function updateCapturedDialogCount() {
	chrome.storage.local.get('dialogHistory', (result) => {
		const history = result.dialogHistory || [];
		// Count only unreviewed items
		const count = history.filter(dialog => dialog.needsReview).length;
		
		// Update badge
		if (count > 0) {
			chrome.action.setBadgeText({ text: count.toString() });
			chrome.action.setBadgeBackgroundColor({ color: '#E53935' });
		} else {
			chrome.action.setBadgeText({ text: '' });
		}
	});
}

// Handle messages using the messaging module's handler registration
registerMessageHandlers({
	settingsUpdated: (message) => {
		// Ensure button preferences are correct for user type first
		ensureCorrectButtonPrefs();
		
		// Broadcast settings to all tabs
		chrome.tabs.query({}, (tabs) => {
			tabs.forEach((tab) => {
				chrome.tabs.sendMessage(tab.id, {
					action: 'settingsUpdated',
					settings: message.settings
				}).catch(() => {
					// Ignore errors for tabs that don't have our content script loaded
				});
			});
		});
		updateBadge();
		
		// Clean up settings immediately when they change
		cleanupSettings();
		
		return { success: true };
	},
	buttonClicked: (message, sender) => {
		// Record button click information
		recordButtonClick(message, sender);
		return { success: true };
	},
	getLastButtonClick: () => {
		// Return the most recent button click information
		return new Promise((resolve) => {
			getLastButtonClick(resolve);
		});
	},
	handleCookieAction: (message, sender) => {
		// Forward the action to the content script of the active tab
		return new Promise((resolve) => {
			chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
				if (tabs.length === 0) {
					resolve({ success: false, error: 'No active tab found' });
					return;
				}
				
				chrome.tabs.sendMessage(tabs[0].id, {
					action: 'handleCookieAction',
					cookieAction: message.cookieAction
				}).then(response => {
					resolve(response || { success: true });
				}).catch(error => {
					console.error('Error forwarding cookie action:', error);
					resolve({ success: false, error: error.message || 'Unknown error' });
				});
			});
		});
	},
	dialogCaptured: (message, sender) => {
		// Make sure we have a dialog object and not just a count
		if (message.dialog) {
			// Store the captured dialog
			storeDialogInHistory(message.dialog, sender.tab?.id);
		}
		return { success: true };
	},
	getCapturedDialogCount: () => {
		return new Promise((resolve) => {
			getCapturedDialogCount(resolve);
		});
	},
	getDialogHistory: () => {
		return new Promise((resolve) => {
			getDialogHistory(resolve);
		});
	},
	clearDialogHistory: () => {
		return new Promise((resolve) => {
			clearDialogHistory(resolve);
		});
	},
	submitToCloud: (message) => {
		submitToCloud(message.data);
		return { success: true };
	},
	getPendingSubmissions: () => {
		return new Promise((resolve) => {
			getPendingSubmissions(resolve);
		});
	},
	clearPendingSubmissions: () => {
		return new Promise((resolve) => {
			clearPendingSubmissions(resolve);
		});
	},
	recordDomainVisit: (message) => {
		return new Promise((resolve) => {
			recordDomainVisit(message.domain, resolve);
		});
	},
	checkDomainVisited: (message) => {
		return new Promise((resolve) => {
			checkDomainVisited(message.domain, resolve);
		});
	},
	getDataCollectionConsent: () => {
		return new Promise((resolve) => {
			getDataCollectionConsent(resolve);
		});
	},
	setDataCollectionConsent: (message) => {
		return new Promise((resolve) => {
			setDataCollectionConsent(message.consent, resolve);
		});
	},
	markDialogAsReviewed: (message) => {
		return new Promise((resolve) => {
			markDialogAsReviewed(message.dialogId, resolve);
		});
	},
	getSettings: () => {
		return new Promise((resolve) => {
			// Get settings from storage and send them back
			chrome.storage.sync.get({
				enabled: true,
				autoAccept: true,
				smartMode: true,
				preferEssential: false,
				buttonPreferences: DEFAULT_SETTINGS.buttonPreferences,
				devMode: false,
				cloudMode: false
			}, (settings) => {
				resolve({ settings });
			});
		});
	},
	checkPremiumStatus: () => {
		return new Promise((resolve) => {
			// Check if user has premium features
			checkUserPremiumStatus().then(isPremium => {
				resolve({ isPremium });
			});
		});
	},
	openPaymentPage: () => {
		// Open the payment page
		extpay.openPaymentPage();
		return { success: true };
	},
	openTrialPage: () => {
		// Open the trial page
		extpay.openTrialPage('7-day');
		return { success: true };
	},
	submitDialogRating: (message) => {
		// Handle dialog rating
		const { dialogId, rating, isGoodMatch, sanitizedDialog } = message.data;
		
		// If we have sanitized data from content script, use it for cloud submission
		if (sanitizedDialog) {
			// Submit sanitized data to cloud
			submitToCloud({
				url: sanitizedDialog.url, // Already sanitized
				domain: sanitizedDialog.domain,
				selector: sanitizedDialog.selector,
				buttonType: sanitizedDialog.buttonType,
				buttonText: sanitizedDialog.buttonText,
				html: sanitizedDialog.html, // Already sanitized
				capturedAt: sanitizedDialog.capturedAt,
				rating,
				isGoodMatch,
				region: sanitizedDialog.region
			});
		}
		
		markDialogAsReviewed(dialogId);
		return { success: true };
	},
	getCapturedDialogs: () => {
		return new Promise((resolve) => {
			getCapturedDialogs(resolve);
		});
	},
	
	// Dynamic content script injection - used when regular content scripts fail to load
	injectContentScript: (message) => {
		return new Promise((resolve) => {
			chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
				if (tabs.length === 0) {
					resolve({ success: false, error: 'No active tab found' });
					return;
				}
				
				const tabId = tabs[0].id;
				
				// Check if this is a supported page
				const url = tabs[0].url || '';
				if (url.startsWith('chrome:') || url.startsWith('chrome-extension:') || 
					url.startsWith('devtools:') || url.startsWith('view-source:') ||
					url.startsWith('about:')) {
					resolve({ success: false, unsupportedTab: true });
					return;
				}
				
				// Inject the content script dynamically
				chrome.scripting.executeScript({
					target: { tabId },
					files: ['dist/content.bundle.js']
				}).then(() => {
					console.log('Content script injected successfully');
					resolve({ success: true });
				}).catch(error => {
					console.error('Failed to inject content script:', error);
					resolve({ 
						success: false, 
						error: error.message || 'Failed to inject content script'
					});
				});
			});
		});
	}
});

// Helper functions that are not exported directly
function getDataCollectionConsent(sendResponse) {
	dataCollectionConsent(null, (consent) => {
		sendResponse({ consent });
	});
}

function setDataCollectionConsent(consent, sendResponse) {
	dataCollectionConsent(consent, () => {
		// Update settings
		cleanupSettings();
		sendResponse({ success: true });
	});
}

// Clean up captured dialogs on startup
cleanupCapturedDialogs(); 

// Ensure button preferences are set correctly on startup
ensureCorrectButtonPrefs(); 