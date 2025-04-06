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
	cloudMode: false,
	privacyMode: false,
	gdprCompliance: false,
	devMode: false
};

// Track captured dialogs across tabs
let pendingSubmissions = [];

// Function to check if user has premium features available
function checkUserPremiumStatus() {
	return new Promise((resolve) => {
		extpay.getUser().then(user => {
			const isPremium = user.paid;
			// Update storage with premium status
			chrome.storage.sync.get(['gdprCompliance'], (settings) => {
				// Only enable GDPR compliance if user has paid
				if (isPremium && !settings.gdprCompliance) {
					chrome.storage.sync.set({ gdprCompliance: true });
				} else if (!isPremium && settings.gdprCompliance) {
					chrome.storage.sync.set({ gdprCompliance: false });
				}
				resolve(isPremium);
			});
		}).catch(error => {
			console.error("Error checking payment status:", error);
			resolve(false);
		});
	});
}

// Listen for payment events
extpay.onPaid.addListener(user => {
	console.log('User has paid for premium features!');
	// Enable premium features
	chrome.storage.sync.set({ gdprCompliance: true });
	// Update badge
	updateBadge();
});

// Initialize default settings when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
	// First check if we have settings in localStorage to restore
	const savedSettings = localStorage.getItem('ccm_settings');
	const savedHistory = localStorage.getItem('ccm_history');
	
	// Initialize with either saved settings or defaults
	const settings = savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
	
	// Apply the settings to chrome.storage.sync
	chrome.storage.sync.set(settings);
	console.log('Cookie Consent Manager initialized with ' + (savedSettings ? 'saved' : 'default') + ' settings');
	
	// Default local storage data
	const defaultLocalData = {
		visitedDomains: {},
		capturedDialogs: [],
		dialogHistory: [],
		pendingSubmissions: [],
		dataCollectionConsent: false,
		initialPermissionAsked: false
	};
	
	// Initialize with either saved history or defaults
	const localData = savedHistory ? JSON.parse(savedHistory) : defaultLocalData;
	
	// Apply the local data to chrome.storage.local
	chrome.storage.local.set(localData);
	
	if (savedHistory) {
		console.log('Restored history with ' + localData.dialogHistory.length + ' entries');
	}

	// Set up alarm for daily cleanup of old domain records
	chrome.alarms.create('cleanupVisitedDomains', { periodInMinutes: 1440 }); // 24 hours
	
	// Set up alarm for regular backup of settings and history
	chrome.alarms.create('backupSettingsAndHistory', { periodInMinutes: 10 }); // Every 10 minutes
	
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
		
		// Backup after cleanup
		backupSettingsAndHistory();
	});
}

// Backup settings and history to localStorage
function backupSettingsAndHistory() {
	// Get all settings and save to localStorage
	chrome.storage.sync.get(null, (settings) => {
		localStorage.setItem('ccm_settings', JSON.stringify(settings));
	});
	
	// Get all local storage data and save to localStorage
	chrome.storage.local.get(null, (data) => {
		localStorage.setItem('ccm_history', JSON.stringify(data));
	});
	
	console.log('Settings and history backed up to localStorage: ' + new Date().toISOString());
}

// Listen for the alarms
chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === 'cleanupVisitedDomains') {
		cleanupVisitedDomains();
	} else if (alarm.name === 'cleanupCapturedDialogs') {
		cleanupCapturedDialogs();
	} else if (alarm.name === 'backupSettingsAndHistory') {
		backupSettingsAndHistory();
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
				
				// Backup the updated history
				backupSettingsAndHistory();
				
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
		
		// Backup settings immediately when they change
		backupSettingsAndHistory();
		
		return { success: true };
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
				cloudMode: false,
				privacyMode: false,
				gdprCompliance: false,
				devMode: false
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
		// Backup the updated consent setting
		backupSettingsAndHistory();
		sendResponse({ success: true });
	});
}

// Clean up captured dialogs on startup
cleanupCapturedDialogs(); 