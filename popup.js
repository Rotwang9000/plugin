// Import modules
import { loadSettings, updateUIFromSettings, updateDevModeUI, toggleDevModeTabs, showTab, initTabNavigation, initSettingsControls } from './src/ui/settings-ui.js';
import { loadAllDialogs, displayAllDialogs, renderDialogItems, getButtonTypeDisplayText, markDialogReviewed } from './src/ui/history-ui.js';
import { displayDetectionStatus, displayDetectedElements } from './src/ui/dialog-display.js';
import { updateDialogCount, clearBadgeCount, displayStatistics, displayChart } from './src/ui/stats-ui.js';
import { formatHtmlWithLineNumbers, escapeHtml, safeGetHtmlContent, createViewableHtmlDocument } from './src/modules/html-utils.js';
import { createElement, clearElement, toggleClass, queryAndProcess, addDebouncedEventListener } from './src/modules/dom-utils.js';
import { getSettings, saveSettings, getDialogHistory, saveDialogToHistory, markDialogAsReviewed, dataCollectionConsent } from './src/modules/storage.js';
import { analyzeDialogSource } from './src/detection/smart-detection.js';
import { sendMessageToBackground, sendMessageToActiveTab } from './src/api/messaging.js';
import { submitDialogRating, fetchCloudStatistics, reportDialogToCloud } from './src/api/cloud-api.js';

document.addEventListener('DOMContentLoaded', () => {
	// Add CSS for the button-type-list class
	const style = document.createElement('style');
	style.textContent = `
		.button-type-list {
			margin-bottom: 5px;
			font-size: 12px;
			color: #666;
		}
		
		/* Cookie detection status styles */
		.cookie-detection-status {
			background-color: white;
			border-radius: 5px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			margin-bottom: 15px;
			overflow: hidden;
			cursor: pointer;
			transition: transform 0.2s;
		}
		
		/* Simple mode styling for non-dev mode */
		.simple-mode .element-row {
			display: none;
		}
		
		.simple-mode .rating-buttons {
			margin-top: 0;
		}
		
		/* Hide Analyze tab in non-dev mode */
		.tab[data-tab="analyze"].dev-mode-hidden {
			display: none;
		}
		
		/* Cookie detection status styles */
		.cookie-detection-status:hover {
			transform: translateY(-2px);
			box-shadow: 0 3px 6px rgba(0,0,0,0.15);
		}
		
		.detection-header {
			padding: 12px 15px;
			font-weight: bold;
			font-size: 14px;
			border-bottom: 1px solid #eee;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		
		.detection-content {
			padding: 15px;
			font-size: 13px;
		}
		
		.status-success {
			border-left: 4px solid #4CAF50;
		}
		.status-success .detection-header {
			background-color: #e8f5e9;
			color: #2E7D32;
		}
		
		.status-warning {
			border-left: 4px solid #FFC107;
		}
		.status-warning .detection-header {
			background-color: #fff8e1;
			color: #FF6F00;
		}
		
		.status-error {
			border-left: 4px solid #F44336;
		}
		.status-error .detection-header {
			background-color: #ffebee;
			color: #C62828;
		}
		
		.status-none {
			border-left: 4px solid #9E9E9E;
		}
		.status-none .detection-header {
			background-color: #f5f5f5;
			color: #424242;
		}
		
		.status-icon {
			margin-right: 10px;
			font-size: 16px;
		}
		
		.view-details {
			color: #673AB7;
			text-decoration: underline;
			font-size: 12px;
			margin-top: 10px;
			display: inline-block;
			cursor: pointer;
		}
		
		.history-item {
			background-color: white;
			margin-bottom: 10px;
			padding: 10px;
			border-radius: 5px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			cursor: pointer;
		}
		
		.history-item:hover {
			background-color: #f5f5f5;
		}
		
		.history-item.active {
			border-left: 3px solid #673AB7;
			background-color: #f0f0f0;
		}
		
		.reviewed {
			border-left: 3px solid #4CAF50;
		}
		
		.not-reviewed {
			border-left: 3px solid #FFC107;
		}
		
		.history-controls {
			display: flex;
			justify-content: space-between;
			margin-bottom: 15px;
		}
		
		.filter-select {
			padding: 5px;
			border-radius: 3px;
			border: 1px solid #ddd;
			flex-grow: 1;
			margin-right: 10px;
		}
		
		.clear-button {
			padding: 5px 10px;
			background-color: #F44336;
			color: white;
			border: none;
			border-radius: 3px;
			cursor: pointer;
		}
		
		.button-display-container {
			margin-bottom: 15px;
			padding: 10px;
			background-color: #f5f5f5;
			border-radius: 5px;
			font-size: 13px;
		}
		
		.cookie-button {
			display: inline-block;
			margin-right: 5px;
			margin-bottom: 5px;
			padding: 5px 10px;
			background-color: #e0e0e0;
			border-radius: 3px;
			cursor: pointer;
			font-size: 12px;
		}
		
		.cookie-button.selected {
			background-color: #673AB7;
			color: white;
		}
		
		.action-button {
			padding: 5px 10px;
			background-color: #673AB7;
			color: white;
			border: none;
			border-radius: 3px;
			cursor: pointer;
			margin-right: 5px;
			margin-top: 10px;
		}
		
		.detail-section {
			margin-top: 15px;
			padding: 10px;
			background-color: #f5f5f5;
			border-radius: 5px;
		}
		
		.detail-item {
			margin-bottom: 10px;
			font-size: 13px;
		}
		
		#recommendationsList {
			font-size: 13px;
		}
	`;
	document.head.appendChild(style);
	
	// Initialize tab navigation with proper tab switching
	initProperTabNavigation();
	
	// Initialize settings controls with proper saving
	initProperSettingsControls();
	
	// Set up event listeners for the account tab
	setupAccountTab();
	
	// Initial loading of settings and data
	loadSettings().then(settings => {
		updateUIFromSettings(settings);
		updateDevModeUI(settings.devMode);
		updateStatus(settings);
		
		// Check the premium status
		checkPremiumStatus();
		
		// Check data collection consent
		checkDataCollectionConsent();
		
		// Check cookie status on current page
		updateCurrentPageStatus();
	});
	
	// Setup other tabs
	setupDashboardTab();
	setupAnalyzeTab();
	
	// Load and display dialogs in the history tab
	loadAllDialogs().then(dialogs => {
		displayAllDialogs(dialogs);
	});
	
	// Update the dialog count badge
	updateDialogCount();
	
	// Make sure premium features are disabled with overlay
	disablePremiumFeatures();
});

// Initialize proper tab navigation that actually works
function initProperTabNavigation() {
	const tabs = document.querySelectorAll('.tab');
	const tabContents = document.querySelectorAll('.tab-content');
	
	tabs.forEach(tab => {
		tab.addEventListener('click', () => {
			// Remove active class from all tabs and contents
			tabs.forEach(t => t.classList.remove('active'));
			tabContents.forEach(c => c.classList.remove('active'));
			
			// Add active class to clicked tab
			tab.classList.add('active');
			
			// Add active class to corresponding content
			const tabId = tab.getAttribute('data-tab');
			const tabContent = document.getElementById(tabId);
			if (tabContent) {
				tabContent.classList.add('active');
			}
			
			// If on the settings tab, update the current page status
			if (tabId === 'settings') {
				updateCurrentPageStatus();
			}
		});
	});
}

// Initialize settings controls with proper saving
function initProperSettingsControls() {
	const settingsElements = {
		enabled: document.getElementById('enabled'),
		autoAccept: document.getElementById('autoAccept'),
		smartMode: document.getElementById('smartMode'),
		cloudMode: document.getElementById('cloudMode'),
		privacyMode: document.getElementById('privacyMode'),
		gdprCompliance: document.getElementById('gdprCompliance'),
		devMode: document.getElementById('devMode')
	};
	
	// Add change listeners to all settings controls
	Object.keys(settingsElements).forEach(key => {
		const element = settingsElements[key];
		if (element) {
			element.addEventListener('change', function() {
				// Load current settings first
				loadSettings().then(settings => {
					// Update the changed setting
					settings[key] = this.checked;
					
					// Save the updated settings
					saveSettings(settings).then(() => {
						// Display success status
						updateStatus(settings);
						
						// Update UI based on settings
						updateUIFromSettings(settings);
						
						// If dev mode changed, update visibility
						if (key === 'devMode') {
							updateDevModeUI(settings.devMode);
						}
						
						// Send settings to background script
						sendMessageToBackground({
							action: 'settingsUpdated',
							settings: settings
						});
					});
				});
			});
		}
	});
}

// Disable premium features
function disablePremiumFeatures() {
	// Disable premium toggle inputs
	document.getElementById('cloudMode').disabled = true;
	document.getElementById('privacyMode').disabled = true;
	document.getElementById('gdprCompliance').disabled = true;
}

// Check current page for cookie dialogs and update the status
function updateCurrentPageStatus() {
	const statusContainer = document.getElementById('currentPageStatus');
	if (!statusContainer) return;
	
	const headerDiv = statusContainer.querySelector('.detection-header');
	const contentDiv = statusContainer.querySelector('.detection-content');
	
	if (headerDiv && contentDiv) {
		// Set to loading state
		headerDiv.textContent = 'Current Page Status';
		contentDiv.innerHTML = '<p>Checking for cookie dialogs on this page...</p>';
		
		// Check for dialogs on the current page
		sendMessageToActiveTab({ action: 'checkForCookieBoxes' })
			.then(response => {
				updatePageStatusUI(response);
			})
			.catch(error => {
				console.error('Error checking current page:', error);
				contentDiv.innerHTML = '<p>Error checking for cookie dialogs.</p>' +
					'<button id="checkCookieBoxes" class="action-button">Try Again</button>';
				
				// Add event listener to the button
				const checkButton = contentDiv.querySelector('#checkCookieBoxes');
				if (checkButton) {
					checkButton.addEventListener('click', updateCurrentPageStatus);
				}
			});
	}
}

// Update the current page status UI based on response
function updatePageStatusUI(response) {
	const statusContainer = document.getElementById('currentPageStatus');
	if (!statusContainer) return;
	
	const contentDiv = statusContainer.querySelector('.detection-content');
	if (!contentDiv) return;
	
	// Clear the container
	clearElement(contentDiv);
	
	// Update class based on detection result
	if (response && response.dialogFound) {
		statusContainer.className = 'cookie-detection-status status-success';
		statusContainer.querySelector('.detection-header').textContent = 'Cookie Dialog Detected';
		
		// Create content for dialog found
		createElement('p', null, 'A cookie consent dialog was detected on this page.', contentDiv);
		
		// Add action buttons
		const actionDiv = createElement('div', { className: 'action-buttons' }, null, contentDiv);
		
		// Accept button
		const acceptButton = createElement('button', { 
			className: 'action-button',
			style: 'margin-right: 10px;'
		}, 'Accept Cookies', actionDiv);
		
		// Customize button
		const customizeButton = createElement('button', { 
			className: 'action-button'
		}, 'Customize Settings', actionDiv);
		
		// Add event listeners
		acceptButton.addEventListener('click', () => handleCookieAction('accept'));
		customizeButton.addEventListener('click', () => handleCookieAction('customize'));
		
	} else {
		statusContainer.className = 'cookie-detection-status status-info';
		statusContainer.querySelector('.detection-header').textContent = 'No Cookie Dialog Detected';
		
		// Create content for no dialog
		createElement('p', null, 'No cookie consent dialog was detected on this page.', contentDiv);
		
		// Add scan button
		const scanButton = createElement('button', { 
			id: 'checkCookieBoxes',
			className: 'action-button'
		}, 'Scan Again', contentDiv);
		
		// Add event listener to scan button
		scanButton.addEventListener('click', updateCurrentPageStatus);
	}
}

// Handle cookie action clicks (accept/customize)
function handleCookieAction(action) {
	sendMessageToActiveTab({ 
		action: 'handleCookieAction',
		cookieAction: action 
	})
	.then(response => {
		if (response && response.success) {
			alert(`Successfully performed '${action}' action on the cookie dialog.`);
			updateCurrentPageStatus(); // Check again to update UI
		} else {
			alert(`Failed to perform '${action}' action. The dialog may have changed or been removed.`);
		}
	})
	.catch(error => {
		console.error(`Error performing ${action} action:`, error);
		alert('An error occurred. Please try again.');
	});
}

// Check if user has premium features
function checkPremiumStatus() {
	sendMessageToBackground({ action: 'checkPremiumStatus' })
		.then(response => {
			updateSubscriptionUI(response.isPremium);
		})
		.catch(error => {
			console.error('Failed to check premium status:', error);
			// Default to free plan if check fails
			updateSubscriptionUI(false);
		});
}

// Set up the account tab
function setupAccountTab() {
	const stripeManageButton = document.getElementById('stripeManageButton');
	const paymentButton = document.getElementById('paymentButton');
	const consentToggle = document.getElementById('consentToggle');
	const devModeToggle = document.getElementById('devMode');
	
	// Set up stripe billing management button
	stripeManageButton.addEventListener('click', () => {
		window.open('https://billing.stripe.com/p/login/4gw8xiejm45PgJa5kk', '_blank');
	});
	
	// Set up payment button
	paymentButton.addEventListener('click', () => {
		sendMessageToBackground({ action: 'openPaymentPage' });
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

function setupDashboardTab() {
	// Check for cookie consent boxes on the active tab
	document.getElementById('settings').addEventListener('click', function(event) {
		if (event.target.id === 'checkCookieBoxes') {
			updateCurrentPageStatus();
		}
	});
	
	// Report a cookie box from the active tab
	document.getElementById('settings').addEventListener('click', function(event) {
		if (event.target.id === 'reportCookieBox') {
			reportCookieBox();
		}
	});
}

function setupAnalyzeTab() {
	document.getElementById('analyze').addEventListener('click', function(event) {
		if (event.target.id === 'analyzeBtn') {
			const sourceInput = document.getElementById('sourceInput');
			const htmlSource = sourceInput.value.trim();
			
			if (htmlSource) {
				const result = analyzeDialogSource(htmlSource);
				displayAnalysisResults(result);
				
				// Show results
				const resultsContainer = document.getElementById('analysisResults');
				resultsContainer.style.display = 'block';
			}
		}
	});
}

function displayHistoryDialogs(dialogs) {
	const historyList = document.getElementById('historyList');
	clearElement(historyList);
	
	if (dialogs.length === 0) {
		historyList.innerHTML = '<div class="no-dialogs">No cookie dialogs have been captured yet.</div>';
		return;
	}
	
	// Sort dialogs by date, newest first
	dialogs.sort((a, b) => {
		return new Date(b.capturedAt) - new Date(a.capturedAt);
	});
	
	// Render dialog items
	renderDialogItems(dialogs, historyList);
}

function checkDataCollectionConsent() {
	sendMessageToBackground({ action: 'getDataCollectionConsent' })
		.then(response => {
			const consentStatus = document.getElementById('consentStatus');
			const consentToggle = document.getElementById('consentToggle');
			
			if (response.consent) {
				consentStatus.textContent = 'Data collection is enabled';
				consentToggle.textContent = 'Disable';
			} else {
				consentStatus.textContent = 'Data collection is disabled';
				consentToggle.textContent = 'Enable';
			}
		});
}

function toggleDataCollectionConsent() {
	sendMessageToBackground({ action: 'getDataCollectionConsent' })
		.then(response => {
			const newConsentValue = !response.consent;
			
			// If enabling consent, show the confirmation dialog
			if (newConsentValue) {
				if (confirm('By enabling data collection, you agree to share anonymized information about cookie consent dialogs to help improve detection. No personal information will be collected. Do you want to proceed?')) {
					updateConsentValue(newConsentValue);
				}
			} else {
				updateConsentValue(newConsentValue);
			}
		});
}

function updateConsentValue(consentValue) {
	sendMessageToBackground({ 
		action: 'setDataCollectionConsent', 
		consent: consentValue 
	})
	.then(response => {
		if (response.success) {
			checkDataCollectionConsent();
		}
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
	updateCurrentPageStatus();
}

function reportCookieBox() {
	sendMessageToActiveTab({ action: 'reportCookieBox' })
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
	
	// Create a cookie detection status display
	const statusDiv = createElement('div', { className: 'cookie-detection-status status-none' }, null, statusContainer);
	
	// Create header
	const headerDiv = createElement('div', { className: 'detection-header' }, null, statusDiv);
	createElement('span', null, 'No Cookie Dialogs Detected', headerDiv);
	
	// Create content
	const contentDiv = createElement('div', { className: 'detection-content' }, null, statusDiv);
	createElement('p', null, 'Visit a website with a cookie consent dialog to test the extension.', contentDiv);
	
	// Add a report button
	const reportButton = createElement('button', { 
		id: 'reportButton',
		className: 'action-button'
	}, 'Check for Cookie Dialog', contentDiv);
	
	reportButton.addEventListener('click', checkForCookieBoxes);
} 