﻿// Import modules
import { loadSettings, updateUIFromSettings, updateDevModeUI, toggleDevModeTabs, showTab, initTabNavigation, initSettingsControls } from './src/ui/settings-ui.js';
import { loadAllDialogs, displayAllDialogs, renderDialogItems, getButtonTypeDisplayText, markDialogReviewed } from './src/ui/history-ui.js';
import { displayDetectionStatus, displayDetectedElements } from './src/ui/dialog-display.js';
import { updateDialogCount, clearBadgeCount, displayStatistics, displayChart } from './src/ui/stats-ui.js';
import { initTooltips } from './src/ui/tooltip-ui.js';
import { updateCurrentPageStatus } from './src/ui/page-status-ui.js';
import { formatHtmlWithLineNumbers, escapeHtml, safeGetHtmlContent, createViewableHtmlDocument } from './src/modules/html-utils.js';
import { createElement, clearElement, toggleClass, queryAndProcess, addDebouncedEventListener } from './src/modules/dom-utils.js';
import { 
	getSettings, saveSettings, getDialogHistory, saveDialogToHistory, markDialogAsReviewed,
	getSettingsAsync, saveSettingsAsync, getDialogHistoryAsync, saveDialogToHistoryAsync, markDialogAsReviewedAsync,
	getDataCollectionConsentAsync, setDataCollectionConsentAsync 
} from './src/modules/storage.js';
import { analyzeDialogSource } from './src/detection/smart-detection.js';
import { 
	sendMessageToBackground, sendMessageToActiveTab,
	sendMessageToBackgroundAsync, sendMessageToActiveTabAsync
} from './src/api/messaging.js';
import { submitDialogRating, fetchCloudStatistics, reportDialogToCloud } from './src/api/cloud-api.js';

// REFACTORING NOTES:
// Several functions have been moved to separate modules:
// - updateCurrentPageStatus -> src/ui/page-status-ui.js
// - updatePageStatusUI -> src/ui/page-status-ui.js
// - handleCookieAction -> src/ui/page-status-ui.js
// - initTabNavigation -> src/ui/settings-ui.js
// - showTab -> src/ui/settings-ui.js
// - handleDetailsTabSwitch -> src/ui/settings-ui.js (private function)
// - updateDevModeUI -> src/ui/settings-ui.js
// - displayHistoryDialogs -> src/ui/history-ui.js
// New wrapper functions have been created for setupDashboardTab, setupAnalyzeTab

// Global variables to track current dialog
let currentDialog = null;
let currentDialogId = null;
let settings = {};

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
	// Hide the Analyze tab initially
	const analyzeTab = document.querySelector('.tab[data-tab="analyze"]');
	if (analyzeTab) {
		analyzeTab.style.display = 'none';
	}
	
	// Load settings and update UI
	loadAndApplySettings();
	
	// Initialize tabs
	initTabNavigation();
	
	// Update current page status
	updateCurrentPageStatus();
	
	// Initialize tooltips
	initTooltips();
	
	// Setup other UI components
	setupAccountTab();
	
	// Load button preferences
	loadButtonPreferences();
	
	// Setup dashboard tab (for settings tab functionality)
	setupDashboardTab();
	
	// Setup analyze tab (will only be visible in dev mode)
	setupAnalyzeTab();
	
	// Disable premium features for non-premium users
	disablePremiumFeatures();
	
	// Check for cookie dialogs
	checkForCookieBoxes();
});

// Load settings from storage and update UI accordingly
function loadAndApplySettings() {
	loadSettings().then(settings => {
		// Update all UI elements based on loaded settings
		if (settings) {
			// Store settings in the global variable for other functions to use
			window.settings = settings;
			
			// Update UI toggles based on settings
			updateUIFromSettings(settings);
		}
	});
}

// Disable premium features
function disablePremiumFeatures() {
	// Check for developer test mode first
	chrome.storage.local.get(['testPremiumMode'], (testResult) => {
		// If test premium mode is enabled, treat as premium
		if (testResult.testPremiumMode === true) {
			handlePremiumUI(true);
			return;
		}
		
		// Otherwise check actual premium status
		sendMessageToBackgroundAsync({ action: 'checkPremiumStatus' })
			.then(response => {
				handlePremiumUI(response.isPremium);
			})
			.catch(error => {
				console.error('Error checking premium status:', error);
				// On error, assume non-premium and show basic UI
				handlePremiumUI(false);
			});
	});
	
	// Helper function to update the UI based on premium status
	function handlePremiumUI(isPremium) {
		// Get UI elements
		const preferEssentialToggle = document.getElementById('preferEssential');
		const cloudModeToggle = document.getElementById('cloudMode');
		const cloudModePromoToggle = document.getElementById('cloudModePromo');
		const premiumOverlay = document.querySelector('.premium-overlay');
		const nonPremiumView = document.getElementById('nonPremiumView');
		const premiumPromoSection = document.getElementById('premiumPromoSection');
		const buttonPreferencesContainer = document.getElementById('buttonPreferencesContainer');
		const cloudModeNote = document.getElementById('cloudModeNote');
		
		if (isPremium) {
			// Premium user
			// 1. Hide the premium promo section entirely
			if (premiumPromoSection) premiumPromoSection.style.display = 'none';
			
			// 2. Show premium features in basic settings
			if (buttonPreferencesContainer) buttonPreferencesContainer.style.display = 'block';
			if (cloudModeNote) cloudModeNote.style.display = 'block';
			
			// 3. Cloud mode is always disabled (coming soon)
			if (cloudModeToggle) {
				cloudModeToggle.disabled = true;
				cloudModeToggle.checked = false;
			}
			
			// 4. Load buttonPreferences and update UI
			loadSettings().then(settings => {
				updateButtonPreferencesUI(settings.buttonPreferences);
			});
		} else {
			// Non-premium user
			// 1. Show premium promo section
			if (premiumPromoSection) premiumPromoSection.style.display = 'block';
			
			// 2. Hide premium features in basic settings
			if (buttonPreferencesContainer) buttonPreferencesContainer.style.display = 'none';
			if (cloudModeNote) cloudModeNote.style.display = 'none';
			
			// 3. Hide Cloud Mode in basic settings or make it redirect to premium
			if (cloudModeToggle) {
				cloudModeToggle.style.display = 'none';
			}
			
			// 4. Add click event to premium overlay to redirect to account tab
			if (premiumOverlay && !premiumOverlay.hasClickListener) {
				premiumOverlay.addEventListener('click', function() {
					if (window.switchToTab) {
						window.switchToTab('account');
					}
				});
				premiumOverlay.hasClickListener = true;
			}
			
			// 5. Add click handlers to all premium feature toggle labels in the non-premium view
			if (nonPremiumView) {
				const toggleContainers = nonPremiumView.querySelectorAll('.toggle-container');
				toggleContainers.forEach(container => {
					// Make all premium feature labels clickable
					const toggleLabel = container.querySelector('.toggle-label');
					if (toggleLabel && !toggleLabel.hasClickListener) {
						toggleLabel.style.cursor = 'pointer';
						// Add visual indication that these are clickable
						toggleLabel.style.textDecoration = 'underline';
						toggleLabel.style.color = '#673AB7';
						
						toggleLabel.addEventListener('click', function() {
							if (window.switchToTab) {
								window.switchToTab('account');
							}
						});
						toggleLabel.hasClickListener = true;
					}
				});
			}
			
			// 6. Load settings for the toggles
			loadSettings().then(settings => {
				if (preferEssentialToggle) {
					preferEssentialToggle.checked = settings.preferEssential === true;
				}
				
				if (cloudModePromoToggle) {
					cloudModePromoToggle.checked = settings.cloudMode === true;
				}
			});
		}
	}
}

// Update the button preferences UI based on saved settings
function updateButtonPreferencesUI(buttonPreferences) {
	if (!buttonPreferences) return;
	
	const preferenceList = document.getElementById('buttonPreferenceList');
	if (!preferenceList) return;
	
	// Remove all current items
	while (preferenceList.firstChild) {
		preferenceList.removeChild(preferenceList.firstChild);
	}
	
	// Add items in the correct order
	buttonPreferences.order.forEach(type => {
		const enabled = buttonPreferences.enabled[type] !== false;
		
		// Create the preference item
		const item = document.createElement('div');
		item.className = 'preference-item';
		item.setAttribute('data-type', type);
		
		// Add drag handle (changed from button to span)
		const dragHandle = document.createElement('span');
		dragHandle.className = 'drag-handle';
		dragHandle.textContent = 'â‰¡';
		item.appendChild(dragHandle);
		
		// Create label based on type (changed from button to span)
		const label = document.createElement('span');
		label.className = 'button-style';
		switch(type) {
			case 'essential':
				label.textContent = 'Essential/Necessary Only';
				break;
			case 'reject':
				label.textContent = 'Reject All';
				break;
			case 'accept':
				label.textContent = 'Accept All';
				break;
			default:
				label.textContent = type.charAt(0).toUpperCase() + type.slice(1);
		}
		item.appendChild(label);
		
		// Create toggle
		const toggleLabel = document.createElement('label');
		toggleLabel.className = 'toggle small';
		
		const toggleInput = document.createElement('input');
		toggleInput.type = 'checkbox';
		toggleInput.checked = enabled;
		toggleInput.setAttribute('data-preference', type);
		
		const slider = document.createElement('span');
		slider.className = 'slider';
		
		toggleLabel.appendChild(toggleInput);
		toggleLabel.appendChild(slider);
		item.appendChild(toggleLabel);
		
		// Add to list
		preferenceList.appendChild(item);
	});
	
	// Re-initialize the draggable functionality
	setupButtonPreferences();
}

// Update the current page status UI based on response
function updatePageStatusUI(response) {
	// This function has been moved to src/ui/page-status-ui.js as updatePageStatusUI
	// Import and use it from there
	import('./src/ui/page-status-ui.js').then(module => {
		module.updatePageStatusUI(response);
	});
}

// Handle cookie action clicks (accept/customize)
function handleCookieAction(action) {
	// This function has been moved to src/ui/page-status-ui.js as handleCookieAction
	// Import and use it from there
	import('./src/ui/page-status-ui.js').then(module => {
		module.handleCookieAction(action);
	});
}

// Check if user has premium features
function checkPremiumStatus() {
	// First check for developer test mode
	chrome.storage.local.get(['testPremiumMode'], (testResult) => {
		// If test premium mode is enabled, treat as premium
		if (testResult.testPremiumMode === true) {
			updateSubscriptionUI(true);
			return;
		}
		
		// Otherwise check actual premium status
		sendMessageToBackgroundAsync({ action: 'checkPremiumStatus' })
			.then(response => {
				updateSubscriptionUI(response.isPremium);
			})
			.catch(error => {
				console.error('Failed to check premium status:', error);
				// Default to free plan if check fails
				updateSubscriptionUI(false);
			});
	});
}

// Set up the account tab
function setupAccountTab() {
	const stripeManageButton = document.getElementById('stripeManageButton');
	const paymentButton = document.getElementById('paymentButton');
	const consentToggle = document.getElementById('consentToggle');
	const devModeToggle = document.getElementById('devMode');
	const testPremiumModeToggle = document.getElementById('testPremiumMode');
	
	// Set up stripe billing management button
	stripeManageButton.addEventListener('click', () => {
		window.open('https://billing.stripe.com/p/login/4gw8xiejm45PgJa5kk', '_blank');
	});
	
	// Set up payment button
	paymentButton.addEventListener('click', () => {
		sendMessageToBackgroundAsync({ action: 'openPaymentPage' })
			.catch(error => {
				console.error('Error opening payment page:', error);
			});
	});
	
	// Set up consent toggle
	consentToggle.addEventListener('click', toggleDataCollectionConsent);
	
	// Set up dev mode toggle
	devModeToggle.addEventListener('change', function() {
		loadSettings().then(settings => {
			settings.devMode = this.checked;
			saveSettings(settings).then(() => {
				updateDevModeUI(settings.devMode);
			});
		});
	});
	
	// Enable secret developer testing mode with Shift+Alt+D
	let keySequence = [];
	document.addEventListener('keydown', function(e) {
		// Check for Shift+Alt+D
		if (e.shiftKey && e.altKey && e.key === 'D') {
			const devTestingSection = document.getElementById('devTestingSection');
			if (devTestingSection) {
				devTestingSection.style.display = devTestingSection.style.display === 'none' ? 'block' : 'none';
			}
		}
	});
	
	// Set up test premium mode toggle
	if (testPremiumModeToggle) {
		// Check initial test premium status
		chrome.storage.local.get(['testPremiumMode'], (result) => {
			testPremiumModeToggle.checked = result.testPremiumMode === true;
		});
		
		testPremiumModeToggle.addEventListener('change', function() {
			// Store the test premium mode setting
			chrome.storage.local.set({ testPremiumMode: this.checked }, () => {
				console.log('Test premium mode ' + (this.checked ? 'enabled' : 'disabled'));
				// Update UI immediately
				disablePremiumFeatures();
			});
		});
	}
	
	// Initial load of consent status
	checkDataCollectionConsent();
}

// Update subscription UI based on premium status
function updateSubscriptionUI(isPremium) {
	const planBadge = document.getElementById('planBadge');
	const paymentButton = document.getElementById('paymentButton');
	const stripeManageButton = document.getElementById('stripeManageButton');
	
	if (isPremium) {
		planBadge.className = 'premium-badge';
		planBadge.textContent = 'Premium';
		paymentButton.style.display = 'none';
		stripeManageButton.style.display = 'block';
	} else {
		planBadge.className = 'free-badge';
		planBadge.textContent = 'Free';
		paymentButton.style.display = 'block';
		stripeManageButton.style.display = 'none';
	}
}

// Setup the dashboard tab with statistics
function setupDashboardTab() {
	// This function now uses the settings tab as there is no dashboard tab
	// Attach event handlers to buttons in the settings tab
	document.getElementById('settings').addEventListener('click', function(event) {
		if (event.target.id === 'checkCookieBoxes') {
			updateCurrentPageStatus();
		}
		
		if (event.target.id === 'reportCookieBox') {
			reportCookieBox();
		}
	});
	
	// If there are statistics containers, populate them
	const statsContainer = document.getElementById('statistics-container');
	if (statsContainer) {
		displayStatistics(statsContainer);
	}
	
	// If there's a chart container, fetch data and display chart
	const chartContainer = document.getElementById('chart-container');
	if (chartContainer) {
		fetchCloudStatistics(stats => {
			const chartData = {
				'Cloud': stats.cloudMatches || 0,
				'Smart': stats.smartMatches || 0,
				'Manual': stats.manualMatches || 0
			};
			displayChart(chartContainer, chartData);
		});
	}
}

// Setup the analyze tab functionality
function setupAnalyzeTab() {
	// Using both form submission and button click approaches for compatibility
	const analyzeForm = document.getElementById('analyze-form');
	if (analyzeForm) {
		analyzeForm.addEventListener('submit', (e) => {
			e.preventDefault();
			const sourceInput = document.getElementById('source-input');
			const html = sourceInput.value.trim();
			
			if (html) {
				// Analyze the HTML using our detection module
				const result = analyzeDialogSource(html);
				displayAnalysisResults(result);
			}
		});
	}
	
	// Also support direct button click (for older UI)
	const analyzeBtn = document.getElementById('analyzeBtn');
	const sourceInput = document.getElementById('sourceInput');
	if (analyzeBtn && sourceInput) {
		analyzeBtn.addEventListener('click', function() {
			const htmlSource = sourceInput.value.trim();
			
			if (htmlSource) {
				const result = analyzeDialogSource(htmlSource);
				displayAnalysisResults(result);
				
				// Show results
				const resultsContainer = document.getElementById('analysisResults');
				if (resultsContainer) {
					resultsContainer.style.display = 'block';
				}
			}
		});
	}
}

// Display history dialogs - wrapper function for compatibility
function displayHistoryDialogs(dialogs) {
	console.log(`popup.js: displayHistoryDialogs called with ${dialogs?.length || 0} dialogs`);
	
	// This is the main implementation - we'll try to use the imported version first
	try {
		import('./src/ui/history-ui.js').then(module => {
			console.log(`popup.js: Calling history-ui.js displayHistoryDialogs with ${dialogs?.length || 0} dialogs`);
			module.displayHistoryDialogs(dialogs);
		}).catch(error => {
			console.error('Error importing history-ui.js:', error);
			// If import fails, fall back to basic implementation
			fallbackDisplayHistoryDialogs(dialogs);
		});
	} catch (error) {
		console.error('Error in import attempt:', error);
		// Fallback to basic implementation if dynamic import not supported
		fallbackDisplayHistoryDialogs(dialogs);
	}
	
	// Basic fallback implementation
	function fallbackDisplayHistoryDialogs(dialogs) {
		console.log(`popup.js: Using fallback display with ${dialogs?.length || 0} dialogs`);
		const historyList = document.getElementById('historyList');
		if (!historyList) {
			console.error('History list container not found!');
			return;
		}
		
		clearElement(historyList);
		
		if (!dialogs || dialogs.length === 0) {
			historyList.innerHTML = '<div class="no-dialogs">No cookie dialogs have been captured yet.</div>';
			return;
		}
		
		// Sort dialogs by date, newest first
		dialogs.sort((a, b) => {
			return new Date(b.capturedAt || 0) - new Date(a.capturedAt || 0);
		});
		
		console.log(`popup.js: About to render ${dialogs.length} dialog items`);
		
		// Render dialog items
		renderDialogItems(dialogs, historyList);
	}
}

function checkDataCollectionConsent() {
	getDataCollectionConsentAsync()
		.then(consent => {
			const consentStatus = document.getElementById('consentStatus');
			const consentToggle = document.getElementById('consentToggle');
			
			if (consent) {
				consentStatus.textContent = 'Data collection is enabled';
				consentToggle.textContent = 'Disable';
			} else {
				consentStatus.textContent = 'Data collection is disabled';
				consentToggle.textContent = 'Enable';
			}
		})
		.catch(error => {
			console.error('Error checking data collection consent:', error);
		});
}

function toggleDataCollectionConsent() {
	getDataCollectionConsentAsync()
		.then(consent => {
			const newConsentValue = !consent;
			
			// If enabling consent, show the confirmation dialog
			if (newConsentValue) {
				if (confirm('By enabling data collection, you agree to share anonymized information about cookie consent dialogs to help improve detection. No personal information will be collected. Do you want to proceed?')) {
					updateConsentValue(newConsentValue);
				}
			} else {
				updateConsentValue(newConsentValue);
			}
		})
		.catch(error => {
			console.error('Error toggling data collection consent:', error);
		});
}

function updateConsentValue(consentValue) {
	setDataCollectionConsentAsync(consentValue)
		.then(result => {
			checkDataCollectionConsent();
		})
		.catch(error => {
			console.error('Error updating consent value:', error);
		});
}

function updateStatus(settings) {
	const statusDiv = document.getElementById('status');
	statusDiv.style.display = 'block';
	
	if (settings.enabled) {
		if (settings.autoAccept) {
			statusDiv.textContent = 'Cookie Consent Manager is active and will automatically handle cookie dialogs for you.';
			statusDiv.style.backgroundColor = '#e8f5e9';  // Light green
		} else {
			statusDiv.textContent = 'Cookie Consent Manager is active but will not automatically accept cookies. It will still detect cookie dialogs.';
			statusDiv.style.backgroundColor = '#fff8e1';  // Light yellow
		}
	} else {
		statusDiv.textContent = 'Cookie Consent Manager is currently disabled. Enable the extension to start detecting and managing cookie dialogs.';
		statusDiv.style.backgroundColor = '#ffebee';  // Light red
	}
	
	// Fade out the status message after 5 seconds
	setTimeout(() => {
		statusDiv.style.opacity = '0.7';
	}, 5000);
}

function checkForCookieBoxes() {
	// First show loading
	const statusContainer = document.getElementById('cookieDetectionStatus');
	if (statusContainer) {
		clearElement(statusContainer);
		const statusDiv = createElement('div', { className: 'cookie-detection-status status-loading' }, null, statusContainer);
		const headerDiv = createElement('div', { className: 'detection-header' }, null, statusDiv);
		createElement('span', null, 'Checking for Cookie Dialogs...', headerDiv);
		const contentDiv = createElement('div', { className: 'detection-content' }, null, statusDiv);
		createElement('p', null, 'Scanning the page for cookie consent dialogs...', contentDiv);
	}
	
	// Check for cookie boxes on the current page
	sendMessageToActiveTabAsync({ action: 'checkForCookieBoxes' })
		.then(response => {
			// Get the most recent button click to include in the UI
			sendMessageToBackgroundAsync({ action: 'getLastButtonClick' })
				.then(buttonClickResponse => {
					// Combine the responses
					const combinedResponse = {
						...response,
						lastClick: buttonClickResponse.lastClick
					};
					
					// Update both current page status and cookie detection status
					updateCurrentPageStatus();
					updateCookieDetectionStatus(combinedResponse);
				})
				.catch(error => {
					console.error('Error getting last button click:', error);
					// Still update the UI with the response we have
					updateCurrentPageStatus();
					updateCookieDetectionStatus(response);
				});
		})
		.catch(error => {
			console.error('Error checking for cookie boxes:', error);
			// Show error in the UI
			updateCookieDetectionStatus({ 
				dialogFound: false, 
				error: error.message || 'Unknown error' 
			});
		});
}

function reportCookieBox() {
	sendMessageToActiveTabAsync({ action: 'reportCookieBox' })
		.then(response => {
			if (response.success) {
				alert('Thank you for reporting this cookie dialog. Your submission helps improve detection for everyone.');
			} else {
				alert('No cookie dialog was found on this page. Try navigating to a page with a cookie consent dialog first.');
			}
		})
		.catch(error => {
			console.error('Error reporting cookie box:', error);
			alert('An error occurred while trying to report the cookie dialog. Please try again.');
		});
}

/**
 * Display analysis results from Smart Detection
 * @param {Object} result - Analysis results object
 */
function displayAnalysisResults(result) {
	// Update result fields
	document.getElementById('detectionResult').textContent = result.isDialog ? 'Likely a cookie dialog' : 'Not likely a cookie dialog';
	document.getElementById('cookieTermsResult').textContent = result.cookieTerms ? result.cookieTerms.join(', ') : 'None found';
	document.getElementById('buttonsResult').textContent = result.buttons ? result.buttons.length : '0';
	document.getElementById('acceptButtonResult').textContent = result.acceptButton ? 'Found' : 'Not found';
	document.getElementById('necessaryButtonResult').textContent = result.necessaryButton ? 'Found' : 'Not found';
	
	// Update recommendations
	const recommendationsList = document.getElementById('recommendationsList');
	clearElement(recommendationsList);
	
	if (result.isDialog) {
		createElement('li', null, 'This appears to be a cookie consent dialog.', recommendationsList);
		if (result.acceptButton) {
			createElement('li', null, 'Accept button detected.', recommendationsList);
		} else {
			createElement('li', null, 'No accept button detected, may require more complex interaction.', recommendationsList);
		}
	} else {
		createElement('li', null, 'This does not appear to be a cookie consent dialog.', recommendationsList);
		createElement('li', null, 'Check if the HTML is complete and contains cookie-related terms.', recommendationsList);
	}
}

/**
 * Update the cookie detection status UI
 */
function updateCookieDetectionStatus(response) {
	const statusContainer = document.getElementById('cookieDetectionStatus');
	if (!statusContainer) return;
	
	// Clear existing status
	clearElement(statusContainer);
	
	// Check if dialog was detected
	const dialogDetected = response && response.dialogFound;
	
	// If no dialog detected, check dialog history for current domain
	if (!dialogDetected) {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs.length > 0) {
				const currentUrl = tabs[0].url;
				const currentDomain = currentUrl ? new URL(currentUrl).hostname : '';
				
				chrome.storage.local.get(['dialogHistory'], (result) => {
					const history = result.dialogHistory || [];
					
					// Find dialogs for this domain
					const domainDialogs = history.filter(dialog => 
						dialog.domain && dialog.domain === currentDomain
					);
					
					if (domainDialogs.length > 0) {
						// Sort by most recent
						domainDialogs.sort((a, b) => {
							return new Date(b.capturedAt) - new Date(a.capturedAt);
						});
						
						// Display most recent dialog info
						const latestDialog = domainDialogs[0];
						displayHistoryDialog(latestDialog, statusContainer);
						return;
					} else {
						// No history found, display standard "not detected" UI
						displayNotDetectedStatus(statusContainer);
					}
				});
			} else {
				// No active tab, display standard "not detected" UI
				displayNotDetectedStatus(statusContainer);
			}
		});
	} else {
		// Dialog was detected in the current scan
		displayDetectedDialog(response, statusContainer);
	}
}

// Helper function to display a detected dialog
function displayDetectedDialog(response, container) {
	// Create a cookie detection status display with success class
	const statusDiv = createElement('div', { 
		className: 'cookie-detection-status status-success' 
	}, null, container);
	
	// Create header
	const headerDiv = createElement('div', { className: 'detection-header' }, null, statusDiv);
	createElement('span', null, 'Cookie Dialog Detected', headerDiv);
	
	// Create content
	const contentDiv = createElement('div', { className: 'detection-content' }, null, statusDiv);
	createElement('p', null, 'A cookie consent dialog was detected and handled on this page.', contentDiv);
	
	// Add details if available
	if (response.buttonClicked) {
		createElement('p', { className: 'small text-muted' }, `Button clicked: ${response.buttonClicked}`, contentDiv);
	}
	
	// Add a scan again button
	const reportButton = createElement('button', { 
		id: 'reportButton',
		className: 'action-button'
	}, 'Scan Again', contentDiv);
	
	reportButton.addEventListener('click', checkForCookieBoxes);
}

// Helper function to display a history dialog
function displayHistoryDialog(dialog, container) {
	// Create a cookie detection status display with history class
	const statusDiv = createElement('div', { 
		className: 'cookie-detection-status status-history' 
	}, null, container);
	
	// Create header
	const headerDiv = createElement('div', { className: 'detection-header' }, null, statusDiv);
	createElement('span', null, 'Cookie Dialog In History', headerDiv);
	
	// Create content
	const contentDiv = createElement('div', { className: 'detection-content' }, null, statusDiv);
	createElement('p', null, 'A cookie consent dialog was previously detected on this domain.', contentDiv);
	
	// Add captured date
	const captureDate = new Date(dialog.capturedAt).toLocaleString('en-GB');
	createElement('p', { className: 'small text-muted' }, `Last detected: ${captureDate}`, contentDiv);
	
	// Add a scan again button
	const reportButton = createElement('button', { 
		id: 'reportButton',
		className: 'action-button'
	}, 'Scan Again', contentDiv);
	
	reportButton.addEventListener('click', checkForCookieBoxes);
}

// Helper function to display "not detected" status
function displayNotDetectedStatus(container) {
	// Create a cookie detection status display with none class
	const statusDiv = createElement('div', { 
		className: 'cookie-detection-status status-none' 
	}, null, container);
	
	// Create header
	const headerDiv = createElement('div', { className: 'detection-header' }, null, statusDiv);
	createElement('span', null, 'No Cookie Dialogs Detected', headerDiv);
	
	// Create content
	const contentDiv = createElement('div', { className: 'detection-content' }, null, statusDiv);
	createElement('p', null, 'No cookie consent dialog was detected on this page.', contentDiv);
	
	// Add a report button
	const reportButton = createElement('button', { 
		id: 'reportButton',
		className: 'action-button'
	}, 'Check for Cookie Dialog', contentDiv);
	
	reportButton.addEventListener('click', checkForCookieBoxes);
}

// Handle premium features toggle clicks - redirect to account page
document.addEventListener('DOMContentLoaded', function() {
	// Find all premium toggle inputs
	const premiumToggles = document.querySelectorAll('.premium-toggle');
	
	// Add event listeners to premium toggles
	premiumToggles.forEach(toggle => {
		toggle.addEventListener('change', function(e) {
			// If they try to enable it, prevent the toggle, switch to account tab
			if (this.checked) {
				// Prevent the checkbox from staying checked
				this.checked = false;
				
				// Show a notification toast or alert
				const status = document.getElementById('status');
				status.textContent = 'This feature requires a premium subscription.';
				status.style.backgroundColor = '#ffecb3';
				status.style.color = '#ff6f00';
				status.style.display = 'block';
				
				// Hide the notification after 3 seconds
				setTimeout(() => {
					status.style.display = 'none';
				}, 3000);
				
				// Switch to the account tab
				switchToTab('account');
			}
		});
	});
	
	// Add click event for the upgrade button
	const upgradeButton = document.getElementById('upgradeButton');
	if (upgradeButton) {
		upgradeButton.addEventListener('click', function() {
			switchToTab('account');
		});
	}
});

// Helper function to switch to a specific tab
function switchToTab(tabName) {
	const tabs = document.querySelectorAll('.tab');
	const tabContents = document.querySelectorAll('.tab-content');
	
	// Remove active class from all tabs
	tabs.forEach(tab => tab.classList.remove('active'));
	tabContents.forEach(content => content.classList.remove('active'));
	
	// Add active class to selected tab
	const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
	const selectedContent = document.getElementById(`${tabName}-tab`);
	
	if (selectedTab) selectedTab.classList.add('active');
	if (selectedContent) selectedContent.classList.add('active');
}

// Add event listener for the history tab filter
document.addEventListener('DOMContentLoaded', function() {
	const historyFilter = document.getElementById('historyFilter');
	
	// Initial load of dialogs - load dialogs as soon as the popup is opened
	// This ensures dialogs are loaded even when the review tab is not initially selected
	if (historyFilter) {
		console.log("Initiating first load of dialog history");
		loadAllDialogs('all', displayHistoryDialogs);
	}
	
	// Ensure dialogs reload when history tab is shown via custom event
	document.addEventListener('history-tab-shown', () => {
		console.log("History tab shown event triggered");
		const filterValue = historyFilter?.value || 'all';
		loadAllDialogs(filterValue, displayHistoryDialogs);
	});
	
	// Support direct tab switching
	const reviewTab = document.querySelector('.tab[data-tab="review"]');
	if (reviewTab) {
		reviewTab.addEventListener('click', () => {
			console.log("Review tab clicked");
			// Use a short timeout to ensure the tab content is fully shown first
			setTimeout(() => {
				const filterValue = historyFilter?.value || 'all';
				loadAllDialogs(filterValue, displayHistoryDialogs);
			}, 100);
		});
	}
	
	// Handle filter change
	if (historyFilter) {
		historyFilter.addEventListener('change', () => {
			console.log("Filter changed to:", historyFilter.value);
			loadAllDialogs(historyFilter.value, displayHistoryDialogs);
		});
	}
});

// Add event listener for dialog details loaded event
document.addEventListener('dialogDetailsLoaded', (event) => {
	const dialog = event.detail;
	
	if (dialog) {
		// Store current dialog in global variables
		currentDialog = dialog;
		currentDialogId = dialog.id;
		
		// Load settings to check if in dev mode
		loadSettings(loadedSettings => {
			settings = loadedSettings;
			
			// Display detected elements - pass dev mode setting
			const elementsContainer = document.getElementById('detectedElementsList');
			if (elementsContainer) {
				displayDetectedElements(dialog, elementsContainer, settings.devMode);
			}
			
			// Add action buttons if in dev mode
			if (settings.devMode) {
				const detailedInfo = document.getElementById('detailedInfo');
				if (detailedInfo) {
					addDialogActionButtons(detailedInfo);
				}
				
				// Show classification containers in dev mode
				const buttonClassificationsParent = document.querySelector('.button-classifications');
				const optionClassificationsParent = document.querySelector('.option-classifications');
				
				if (buttonClassificationsParent) {
					buttonClassificationsParent.style.display = 'block';
				}
				
				if (optionClassificationsParent) {
					optionClassificationsParent.style.display = 'block';
				}
			}
		});
	}
});

// Handle tab switching
document.addEventListener('switchedToDetailsTab', (event) => {
	const dialog = event.detail;
	
	if (dialog) {
		// Load settings to check dev mode
		loadSettings(loadedSettings => {
			settings = loadedSettings;
			
			// Update element classifications display
			const elementsContainer = document.getElementById('detectedElementsList');
			if (elementsContainer) {
				displayDetectedElements(dialog, elementsContainer, settings.devMode);
			}
			
			// Ensure action buttons are displayed in dev mode
			if (settings.devMode) {
				const detailedInfo = document.getElementById('detailedInfo');
				if (detailedInfo && !document.querySelector('.action-buttons-container')) {
					addDialogActionButtons(detailedInfo);
				}
			}
		});
	}
});

/**
 * Adds action buttons to the dialog detail view in dev mode
 * @param {HTMLElement} container - The container to add the buttons to
 */
function addDialogActionButtons(container = null) {
	// Default to detailedInfo if no container provided
	const detailedInfo = container || document.getElementById('detailedInfo');
	if (!detailedInfo) return;
	
	// Only add action buttons if not already present
	if (document.querySelector('.action-buttons-container')) {
		return;
	}
	
	// Create action buttons container
	const actionButtonsContainer = document.createElement('div');
	actionButtonsContainer.className = 'action-buttons-container';
	detailedInfo.appendChild(actionButtonsContainer);
	
	// View Source button
	const viewSourceButton = document.createElement('button');
	viewSourceButton.id = 'viewSourceBtn';
	viewSourceButton.className = 'action-button';
	viewSourceButton.innerHTML = 'ðŸ“„ View';
	actionButtonsContainer.appendChild(viewSourceButton);
	
	// Copy Source button
	const copySourceButton = document.createElement('button');
	copySourceButton.id = 'copySourceBtn';
	copySourceButton.className = 'action-button';
	copySourceButton.innerHTML = 'ðŸ“‹ Copy Source';
	actionButtonsContainer.appendChild(copySourceButton);
	
	// Copy Link button
	const copyLinkButton = document.createElement('button');
	copyLinkButton.id = 'copyLinkBtn';
	copyLinkButton.className = 'action-button';
	copyLinkButton.innerHTML = 'ðŸ”— Copy Link';
	actionButtonsContainer.appendChild(copyLinkButton);
	
	// Export JSON button
	const exportButton = document.createElement('button');
	exportButton.id = 'exportBtn';
	exportButton.className = 'action-button';
	exportButton.innerHTML = 'ðŸ“¤ Export';
	actionButtonsContainer.appendChild(exportButton);
	
	// Add event handlers for action buttons
	viewSourceButton.addEventListener('click', () => {
		if (currentDialog && currentDialog.html) {
			// Create a proper HTML document blob
			const htmlContent = `
				<!DOCTYPE html>
				<html>
					<head>
						<title>Cookie Dialog Source</title>
						<meta charset="utf-8">
						<style>
							body { 
								font-family: monospace; 
								white-space: pre-wrap; 
								padding: 20px;
								line-height: 1.5;
								font-size: 14px;
							}
							.line-numbers {
								color: #888;
								text-align: right;
								padding-right: 10px;
								user-select: none;
							}
							table {
								border-collapse: collapse;
								width: 100%;
							}
							td {
								vertical-align: top;
							}
							.code-line:hover {
								background-color: #f0f0f0;
							}
						</style>
					</head>
					<body>
						<h2>Source Code for: ${currentDialog.domain}</h2>
						${formatHtmlWithLineNumbers(escapeHtml(currentDialog.html))}
					</body>
				</html>
			`;
			
			// Create a blob and open it in a new window
			const blob = new Blob([htmlContent], {type: 'text/html'});
			const url = URL.createObjectURL(blob);
			window.open(url, '_blank');
		}
	});
	
	copySourceButton.addEventListener('click', () => {
		if (currentDialog && currentDialog.html) {
			navigator.clipboard.writeText(currentDialog.html)
				.then(() => {
					copySourceButton.innerHTML = 'âœ“ Copied!';
					setTimeout(() => { copySourceButton.innerHTML = 'ðŸ“‹ Copy Source'; }, 2000);
				})
				.catch(err => console.error('Could not copy text: ', err));
		}
	});
	
	copyLinkButton.addEventListener('click', () => {
		if (currentDialog && currentDialog.url) {
			navigator.clipboard.writeText(currentDialog.url)
				.then(() => {
					copyLinkButton.innerHTML = 'âœ“ Copied!';
					setTimeout(() => { copyLinkButton.innerHTML = 'ðŸ”— Copy Link'; }, 2000);
				})
				.catch(err => console.error('Could not copy text: ', err));
		}
	});
	
	exportButton.addEventListener('click', () => {
		if (currentDialog) {
			const exportData = JSON.stringify(currentDialog, null, 2);
			const blob = new Blob([exportData], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			
			const a = document.createElement('a');
			a.href = url;
			a.download = `cookie-dialog-${currentDialog.domain}-${Date.now()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
	});
} 

// Initialize tabs once DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
	// Tab initialization - moved to a separate function call to ensure it runs
	initTabNavigation();
});

// Handle details tab special behavior
function handleDetailsTabSwitch() {
	// This function has been moved to src/ui/settings-ui.js
	// It is a private function there but can be triggered via showTab('details')
	import('./src/ui/settings-ui.js').then(module => {
		module.showTab('details');
	});
}

// Function updateDevModeUI_old has been moved to src/ui/settings-ui.js
