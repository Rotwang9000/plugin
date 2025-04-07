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
			padding-left: 20px;
		}
		
		.success {
			color: #4CAF50;
		}
		
		.warning {
			color: #FFC107;
		}
		
		.error {
			color: #F44336;
		}
		
		.details-content {
			margin-top: 15px;
		}
		
		/* New styles for consistent dropdowns and compact UI */
		.element-row {
			display: flex;
			align-items: center;
			margin-bottom: 6px;
			padding-bottom: 6px;
			border-bottom: 1px solid #eee;
		}
		
		.element-text {
			flex: 1;
			margin-right: 10px;
			font-size: 13px;
		}
		
		.element-type-select {
			width: 120px;
			padding: 4px;
			border-radius: 3px;
			border: 1px solid #ccc;
			font-size: 12px;
		}
		
		.show-more-btn {
			display: block;
			width: 100%;
			padding: 8px;
			background-color: #f0f0f0;
			border: 1px solid #ddd;
			border-radius: 3px;
			text-align: center;
			margin-top: 10px;
			cursor: pointer;
			font-size: 13px;
		}
		
		.show-more-btn:hover {
			background-color: #e0e0e0;
		}
		
		/* Loading spinner */
		.spinner {
			display: inline-block;
			width: 16px;
			height: 16px;
			border: 2px solid rgba(0, 0, 0, 0.1);
			border-left-color: #673AB7;
			border-radius: 50%;
			animation: spin 1s linear infinite;
			margin-left: 10px;
			vertical-align: middle;
		}
		
		@keyframes spin {
			to { transform: rotate(360deg); }
		}
		
		/* Improved detected elements section */
		.detected-elements-container {
			background-color: white;
			border-radius: 5px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			margin-bottom: 15px;
			overflow: hidden;
		}
		
		.element-section {
			margin-bottom: 15px;
		}
		
		.section-header {
			background-color: #f5f5f5;
			padding: 8px 12px;
			font-weight: bold;
			font-size: 14px;
			color: #333;
			border-bottom: 1px solid #ddd;
			cursor: pointer;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		
		.section-header:hover {
			background-color: #e8e8e8;
		}
		
		.section-header::after {
			content: '▼';
			font-size: 10px;
			color: #666;
		}
		
		.section-header.collapsed::after {
			content: '►';
		}
		
		.section-content {
			padding: 10px;
			max-height: 300px;
			overflow-y: auto;
		}
		
		.section-content.collapsed {
			display: none;
		}
		
		.element-type-badge {
			display: inline-block;
			padding: 2px 6px;
			border-radius: 3px;
			font-size: 11px;
			margin-right: 5px;
			background-color: #e0e0e0;
			color: #333;
		}
		
		.element-type-accept {
			background-color: #4CAF50;
			color: white;
		}
		
		.element-type-necessary {
			background-color: #2196F3;
			color: white;
		}
		
		.element-type-decline {
			background-color: #F44336;
			color: white;
		}
		
		.element-type-customise {
			background-color: #FF9800;
			color: white;
		}
		
		/* Icon styles for detail view */
		.detail-icon {
			display: inline-block;
			width: 16px;
			height: 16px;
			margin-right: 8px;
			text-align: center;
		}
		
		/* Action buttons section */
		.action-buttons-container {
			display: flex;
			flex-wrap: wrap;
			margin-bottom: 15px;
			gap: 8px;
		}
		
		.action-buttons-container .action-button {
			flex: 1 0 auto;
			margin-top: 0;
			white-space: nowrap;
		}
		
		/* Auto-accept status indicator */
		.auto-accept-status {
			display: flex;
			padding: 8px 12px;
			margin-bottom: 15px;
			border-radius: 4px;
			font-size: 13px;
			align-items: center;
			background-color: #f0f0f0;
			border-left: 4px solid #9e9e9e;
		}
		
		.auto-accept-status.success {
			background-color: #e8f5e9;
			border-left: 4px solid #4CAF50;
		}
		
		.auto-accept-status.warning {
			background-color: #fff8e1;
			border-left: 4px solid #FFC107;
		}
		
		.auto-accept-status.error {
			background-color: #ffebee;
			border-left: 4px solid #F44336;
		}
		
		.auto-accept-status .status-icon {
			margin-right: 10px;
		}
		
		.info-card {
			background: white;
			border-radius: 5px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			margin-bottom: 15px;
		}
		
		.info-card-header {
			background-color: #f5f5f5;
			padding: 10px 15px;
			font-weight: bold;
			border-bottom: 1px solid #eee;
		}
		
		.info-card-content {
			padding: 15px;
		}
		
		/* Prevent text overflow with ellipsis */
		.text-truncate {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			max-width: 250px;
			display: inline-block;
			vertical-align: middle;
		}
		
		/* Better detail item styling */
		.detail-item {
			display: flex;
			margin-bottom: 10px;
			font-size: 13px;
			align-items: flex-start;
		}
		
		.detail-item strong {
			min-width: 75px;
			display: inline-block;
		}
		
		.detail-value {
			flex: 1;
			min-width: 0; /* Required for text-overflow to work in flex items */
		}
		
		/* Review section improvements */
		.review-section {
			margin-top: 15px;
			background-color: white;
			border-radius: 5px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			padding: 15px;
		}
		
		.review-heading {
			font-size: 14px;
			font-weight: bold;
			margin-bottom: 10px;
		}
		
		.rating-buttons {
			display: flex;
			gap: 10px;
			margin: 15px 0;
		}
		
		.rating-buttons button {
			flex: 1;
			padding: 8px 0;
			border: none;
			border-radius: 3px;
			font-weight: bold;
			cursor: pointer;
		}
		
		#goodMatchBtn {
			background-color: #4CAF50;
			color: white;
		}
		
		#badMatchBtn {
			background-color: #F44336;
			color: white;
		}
		
		#submissionStatus {
			text-align: center;
			font-size: 13px;
			color: #666;
			margin-top: 10px;
		}
		
		/* Settings page improvements */
		.settings-section {
			background-color: white;
			border-radius: 5px;
			box-shadow: 0 1px 3px rgba(0,0,0,0.1);
			margin-bottom: 15px;
			overflow: hidden;
		}
		
		.section-title {
			background-color: #f5f5f5;
			padding: 10px 15px;
			font-weight: bold;
			border-bottom: 1px solid #eee;
			font-size: 14px;
			color: #333;
		}
		
		.section-content {
			padding: 15px;
		}
		
		.toggle-container {
			margin-bottom: 15px;
		}
		
		.toggle-container:last-child {
			margin-bottom: 0;
		}
		
		.pro-badge {
			display: inline-block;
			background-color: #673AB7;
			color: white;
			font-size: 10px;
			padding: 2px 6px;
			border-radius: 10px;
			margin-left: 8px;
			vertical-align: middle;
		}
		
		.pro-section {
			position: relative;
		}
		
		.pro-overlay {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background-color: rgba(0, 0, 0, 0.05);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 10;
		}
		
		.pro-banner {
			background-color: #673AB7;
			color: white;
			padding: 8px 16px;
			border-radius: 20px;
			font-weight: bold;
			font-size: 13px;
			box-shadow: 0 2px 5px rgba(0,0,0,0.2);
		}
	`;
	document.head.appendChild(style);
	
	// Immediately hide the Analyze tab on load
	const analyzeTab = document.getElementById('analyzeTab');
	if (analyzeTab) {
		// Initially hide the tab - will be shown later if dev mode is enabled
		analyzeTab.style.display = 'none';
	}
	
	// Settings tab elements
	const enabledToggle = document.getElementById('enabled');
	const autoAcceptToggle = document.getElementById('autoAccept');
	const smartModeToggle = document.getElementById('smartMode');
	const cloudModeToggle = document.getElementById('cloudMode');
	const privacyModeToggle = document.getElementById('privacyMode');
	const gdprComplianceToggle = document.getElementById('gdprCompliance');
	const devModeToggle = document.getElementById('devMode');
	const statusElement = document.getElementById('status');
	const dataCollectionConsentStatus = document.getElementById('dataCollectionConsentStatus');
	const dataCollectionConsentBtn = document.getElementById('dataCollectionConsentBtn');
	const noCookieBoxDetectedContainer = document.getElementById('noCookieBoxDetectedContainer');
	const reportCookieBoxBtn = document.getElementById('reportCookieBox');
	
	// Review tab elements
	const dialogCount = document.getElementById('dialogCount');
	const dialogsListElement = document.getElementById('dialogsList');
	
	// Details tab elements
	const dialogDetailContainer = document.getElementById('dialogDetailContainer');
	const dialogFrame = document.getElementById('dialogFrame');
	const noSelectionMessage = document.getElementById('noSelectionMessage');
	const detailedInfoElement = document.getElementById('detailedInfo');
	const goodMatchBtn = document.getElementById('goodMatchBtn');
	const badMatchBtn = document.getElementById('badMatchBtn');
	const submissionStatus = document.getElementById('submissionStatus');
	const exportBtn = document.getElementById('exportBtn');
	const viewSourceBtn = document.getElementById('viewSourceBtn');
	const copyLinkBtn = document.getElementById('copyLinkBtn');
	const buttonDisplayContainer = document.querySelector('.button-display-container');
	
	// Analyze tab elements
	const sourceInput = document.getElementById('sourceInput');
	const analyzeBtn = document.getElementById('analyzeBtn');
	const analysisResults = document.getElementById('analysisResults');
	const detectionResult = document.getElementById('detectionResult');
	const cookieTermsResult = document.getElementById('cookieTermsResult');
	const buttonsResult = document.getElementById('buttonsResult');
	const acceptButtonResult = document.getElementById('acceptButtonResult');
	const necessaryButtonResult = document.getElementById('necessaryButtonResult');
	const recommendationsList = document.getElementById('recommendationsList');
	
	// Filter elements
	const historyFilter = document.getElementById('historyFilter');
	const clearHistoryBtn = document.getElementById('clearHistoryBtn');
	
	// Tab navigation
	const tabs = document.querySelectorAll('.tab');
	const tabContents = document.querySelectorAll('.tab-content');
	
	// Current dialog being displayed
	let currentDialog = null;
	let currentDialogId = null;
	
	// Add a global variable at the top of the document.addEventListener block to ensure it's accessible everywhere
	let detectedElementsContainer;
	
	// Then initialize it at the beginning of the DOMContentLoaded function, right after all the other element references
	// Add this after the element declarations for dialogDetailContainer, etc.
	detectedElementsContainer = document.getElementById('detectedElementsList');
	
	// Tab switching
	tabs.forEach(tab => {
		tab.addEventListener('click', () => {
			const tabName = tab.getAttribute('data-tab');
			showTab(tabName);
		});
	});

	// Load saved settings with localStorage fallback
	loadSettings(() => {
		updateDialogCount();
		loadAllDialogs();
		checkDataCollectionConsent();
		checkForCookieBoxes();  // Check for cookie boxes on initial load
		updateDevModeUI();  // Apply Dev Mode settings initially
		
		// Add direct initialization for cookie detection status
		setTimeout(() => {
			updateCookieDetectionStatus();
		}, 300);
	});

	// Check data collection consent status
	checkDataCollectionConsent();
	
	// Clear notification badge when popup is opened
	clearBadgeCount();
	
	// Update cookie detection status
	setTimeout(updateCookieDetectionStatus, 100);

	// Save settings when changed
	enabledToggle.addEventListener('change', saveSettings);
	autoAcceptToggle.addEventListener('change', saveSettings);
	smartModeToggle.addEventListener('change', saveSettings);
	cloudModeToggle.addEventListener('change', saveSettings);
	privacyModeToggle.addEventListener('change', saveSettings);
	gdprComplianceToggle.addEventListener('change', saveSettings);
	devModeToggle.addEventListener('change', () => {
		saveSettings();
		updateDevModeUI();
	});

	// Cloud mode requires consent
	cloudModeToggle.addEventListener('change', (event) => {
		// If trying to enable cloud mode
		if (cloudModeToggle.checked) {
			// Check for consent first
			checkConsentBeforeAction(() => {
				// User gave consent, save settings
				saveSettings();
			}, () => {
				// User declined consent, revert the toggle
				cloudModeToggle.checked = false;
				saveSettings();
			});
		} else {
			// Just turning it off, no consent needed
			saveSettings();
		}
	});
	
	// Privacy mode requires consent
	privacyModeToggle.addEventListener('change', (event) => {
		// If trying to enable privacy mode
		if (privacyModeToggle.checked) {
			// Check for consent first
			checkConsentBeforeAction(() => {
				// User gave consent, save settings
				saveSettings();
			}, () => {
				// User declined consent, revert the toggle
				privacyModeToggle.checked = false;
				saveSettings();
			});
		} else {
			// Just turning it off, no consent needed
			saveSettings();
		}
	});
	
	// GDPR Compliance is a premium feature
	gdprComplianceToggle.addEventListener('change', (event) => {
		// If trying to enable GDPR Compliance
		if (gdprComplianceToggle.checked) {
			// Show premium feature notification
			const premiumMessage = `
GDPR Compliance is a premium feature that prioritizes "necessary cookies only" options.

Selecting only necessary cookies may limit website revenue from targeted advertising.

Would you like to upgrade to premium to enable this feature?
			`;
			
			// For now, just show a prompt. This can be replaced with a proper payment flow later
			if (confirm(premiumMessage)) {
				// Placeholder for premium upgrade flow
				alert('Premium upgrade feature coming soon! For now, we\'ll enable it for you to try.');
				saveSettings();
			} else {
				// User declined premium, revert the toggle
				gdprComplianceToggle.checked = false;
				saveSettings();
			}
		} else {
			// Just turning it off, no need for premium check
			saveSettings();
		}
	});

	// History filter change
	if (historyFilter) {
		historyFilter.addEventListener('change', () => {
			loadAllDialogs(historyFilter.value);
		});
	}
	
	// Clear history button
	if (clearHistoryBtn) {
		clearHistoryBtn.addEventListener('click', () => {
			if (confirm('Are you sure you want to clear all dialog history?')) {
				chrome.runtime.sendMessage({ action: 'clearDialogHistory' }, () => {
					loadAllDialogs();
				});
			}
		});
	}

	// Data collection consent button
	if (dataCollectionConsentBtn) {
		dataCollectionConsentBtn.addEventListener('click', toggleDataCollectionConsent);
	}

	// Dialog rating buttons
	if (goodMatchBtn) {
		goodMatchBtn.addEventListener('click', () => {
			if (currentDialogId) {
				// This was a good match
				checkConsentBeforeAction(() => {
					submitRating(currentDialogId, 5, true);
				});
			}
		});
	}
	
	if (badMatchBtn) {
		badMatchBtn.addEventListener('click', () => {
			if (currentDialogId) {
				// This depends on the button text - good match or submit changes
				const isSubmitChanges = badMatchBtn.textContent === 'Submit Changes';
				
				checkConsentBeforeAction(() => {
					submitRating(currentDialogId, isSubmitChanges ? 3 : 1, false);
				});
			}
		});
	}
	
	// Initial check for captured dialogs
	updateDialogCount();
	
	// Initial load of review tab data if it's the active tab
	const activeTab = document.querySelector('.tab.active');
	if (activeTab && activeTab.dataset.tab === 'review') {
		loadAllDialogs();
	}
	
	// Setup message listener for badge updates
	chrome.runtime.onMessage.addListener((message) => {
		if (message.action === 'dialogCaptured' || message.action === 'submissionUpdated') {
			updateDialogCount();
		}
		return true;
	});

	// Analyze button click handler
	if (analyzeBtn) {
		analyzeBtn.addEventListener('click', () => {
			const source = sourceInput.value.trim();
			if (!source) {
				alert('Please paste HTML source code first');
				return;
			}
			
			// Show loading state
			analyzeBtn.textContent = 'Analyzing...';
			analyzeBtn.disabled = true;
			
			// Clear previous results if any
			if (analysisResults) {
				analysisResults.style.display = 'none';
			}
			
			// Add a timeout to prevent indefinite waiting
			let responseReceived = false;
			const timeoutId = setTimeout(() => {
				if (!responseReceived) {
					analyzeBtn.textContent = 'Analyze Source';
					analyzeBtn.disabled = false;
					alert('Analysis timed out. The content script may not be responding.');
				}
			}, 5000); // 5 second timeout
			
			// Send to content script for analysis
			chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
				if (tabs[0]) {
					try {
						chrome.tabs.sendMessage(tabs[0].id, {
							action: 'analyzeSource',
							source: source
						}, (result) => {
							responseReceived = true;
							clearTimeout(timeoutId);
							
							analyzeBtn.textContent = 'Analyze Source';
							analyzeBtn.disabled = false;
							
							if (chrome.runtime.lastError) {
								console.error('Chrome runtime error:', chrome.runtime.lastError);
								alert('Error communicating with the page: ' + chrome.runtime.lastError.message);
								return;
							}
							
							if (result && !result.error) {
								displayAnalysisResults(result);
							} else {
								// Handle error
								const errorDetails = result?.errorDetails || 'Unknown error';
								console.error('Analysis error:', errorDetails);
								alert('Error analyzing source: ' + errorDetails);
							}
						});
					} catch (error) {
						responseReceived = true;
						clearTimeout(timeoutId);
						
						analyzeBtn.textContent = 'Analyze Source';
						analyzeBtn.disabled = false;
						
						console.error('Error sending message:', error);
						alert('Error communicating with the page: ' + error.message);
					}
				} else {
					// No active tab
					responseReceived = true;
					clearTimeout(timeoutId);
					
					analyzeBtn.textContent = 'Analyze Source';
					analyzeBtn.disabled = false;
					alert('Cannot analyze source: No active tab');
				}
			});
		});
	}

	function checkDataCollectionConsent() {
		chrome.runtime.sendMessage({ action: 'getDataCollectionConsent' }, (response) => {
			if (response && dataCollectionConsentStatus) {
				if (response.consent) {
					dataCollectionConsentStatus.textContent = 'Data collection consent: Granted';
					dataCollectionConsentStatus.className = 'consent-status consent-granted';
					if (dataCollectionConsentBtn) {
						dataCollectionConsentBtn.textContent = 'Withdraw Consent';
						dataCollectionConsentBtn.className = 'withdraw-consent';
					}
				} else {
					dataCollectionConsentStatus.textContent = 'Data collection consent: Not granted';
					dataCollectionConsentStatus.className = 'consent-status consent-not-granted';
					if (dataCollectionConsentBtn) {
						dataCollectionConsentBtn.textContent = 'Grant Consent';
						dataCollectionConsentBtn.className = 'grant-consent';
					}
				}
			}
		});
	}

	function toggleDataCollectionConsent() {
		chrome.runtime.sendMessage({ action: 'getDataCollectionConsent' }, (response) => {
			if (response) {
				const newConsentStatus = !response.consent;
				chrome.runtime.sendMessage({ 
					action: 'setDataCollectionConsent', 
					consent: newConsentStatus 
				}, () => {
					checkDataCollectionConsent();
				});
			}
		});
	}

	function showConsentDialog() {
		// This function is kept for reference but no longer used on startup
		// Instead, we use checkConsentBeforeAction for targeted consent
		
		const consentMessage = `
Omyom Cookie Consent Manager would like to collect anonymised data about cookie consent banners to improve detection.

This helps make the tool more effective for everyone. All personal information will be redacted before submitting your ratings to our database, ensuring your privacy.

Under UK GDPR and Data Protection Act 2018, we are required to obtain your explicit consent before collecting this data.

Your data will only be used to improve the extension's functionality and will not be shared with third parties.

Do you consent to this data collection?
	`;
		
		if (confirm(consentMessage)) {
			chrome.runtime.sendMessage({ 
				action: 'setDataCollectionConsent', 
				consent: true 
			}, () => {
				checkDataCollectionConsent();
			});
			privacyModeToggle.checked = true;
		} else {
			chrome.runtime.sendMessage({ 
				action: 'setDataCollectionConsent', 
				consent: false 
			}, () => {
				checkDataCollectionConsent();
			});
		}
		
		// Save settings and mark that we've asked
		saveSettings();
		chrome.storage.local.set({ initialPermissionAsked: true });
	}

	function updateStatus(settings) {
		if (settings.enabled) {
			if (settings.autoAccept) {
				statusElement.textContent = 'Status: Extension enabled with auto-accept';
				statusElement.style.backgroundColor = '#e8f5e9';
			} else {
				statusElement.textContent = 'Status: Extension enabled (manual mode)';
				statusElement.style.backgroundColor = '#e8f5e9';
			}
		} else {
			statusElement.textContent = 'Status: Extension disabled';
			statusElement.style.backgroundColor = '#ffebee';
		}
		
		// Check for cookie boxes whenever settings change
		checkForCookieBoxes();
	}
	
	// Check if cookie boxes have been detected and show/hide the "But I See a Cookie Warning" button
	function checkForCookieBoxes() {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs.length > 0) {
				const currentTabId = tabs[0].id;
				const currentUrl = tabs[0].url;
				
				chrome.storage.local.get(['dialogHistory'], (result) => {
					const history = result.dialogHistory || [];
					
					// Check if there are any detected dialogs for the current tab
					const currentTabDialogs = history.filter(dialog => 
						dialog.tabId === currentTabId || 
						(dialog.url && new URL(dialog.url).hostname === new URL(currentUrl).hostname)
					);
					
					// Show the "But I See a Cookie Warning" container if no dialogs detected
					if (currentTabDialogs.length === 0) {
						noCookieBoxDetectedContainer.style.display = 'block';
					} else {
						noCookieBoxDetectedContainer.style.display = 'none';
					}
				});
			}
		});
	}
	
	// Report a cookie box that wasn't detected
	function reportCookieBox() {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs.length > 0) {
				const currentTab = tabs[0];
				
				checkConsentBeforeAction(() => {
					// Record manual detection report
					const reportData = {
						url: currentTab.url,
						domain: new URL(currentTab.url).hostname,
						reportedAt: new Date().toISOString(),
						reportType: 'missed_detection',
						tabId: currentTab.id
					};
					
					// Submit to cloud for review if user provided consent
					chrome.runtime.sendMessage({
						action: 'submitToCloud',
						data: {
							...reportData,
							type: 'missed_detection_report'
						}
					});
					
					// Show confirmation to user
					reportCookieBoxBtn.textContent = 'Thank you! Report submitted';
					reportCookieBoxBtn.disabled = true;
					
					// Reset after 3 seconds
					setTimeout(() => {
						reportCookieBoxBtn.textContent = 'But I See a Cookie Warning';
						reportCookieBoxBtn.disabled = false;
					}, 3000);
				}, () => {
					// User declined to give consent
					alert('To report missing cookie warnings, please grant data collection consent first.');
				});
			}
		});
	}
	
	function updateDialogCount() {
		// Get count from background script
		chrome.runtime.sendMessage({ action: 'getCapturedDialogCount' }, (response) => {
			const count = response ? response.count : 0;
			
			// Also check for pending submissions
			chrome.runtime.sendMessage({ action: 'getPendingSubmissions' }, (submissionsResponse) => {
				const pendingCount = submissionsResponse?.pendingSubmissions?.length || 0;
				const totalCount = count + pendingCount;
				
				if (totalCount > 0) {
					dialogCount.textContent = totalCount;
					dialogCount.style.display = 'inline-block';
				} else {
					dialogCount.style.display = 'none';
				}
			});
		});
	}
	
	// Load all dialogs (captured and history combined) with localStorage fallback
	function loadAllDialogs(filterType = 'all') {
		// We'll allow viewing dialogs without consent since they're stored locally
		// Get only dialog history - a unified list instead of separate capturedDialogs and history
		chrome.runtime.sendMessage({ action: 'getDialogHistory' }, (historyResponse) => {
			let historyDialogs = historyResponse?.history || [];
			
			// Debug: Log the historyDialogs to see what we're getting
			console.log('History dialogs received:', historyDialogs);
			
			// If no history from Chrome storage, try localStorage
			if (!historyDialogs || historyDialogs.length === 0) {
				try {
					const savedHistory = localStorage.getItem('ccm_history');
					console.log('Trying localStorage fallback, savedHistory:', savedHistory);
					
					if (savedHistory) {
						const localData = JSON.parse(savedHistory);
						console.log('Parsed localData:', localData);
						
						if (localData.dialogHistory && Array.isArray(localData.dialogHistory)) {
							historyDialogs = localData.dialogHistory;
							console.log('Loaded dialog history from localStorage fallback:', historyDialogs);
						}
					}
				} catch (e) {
					console.error('Error loading dialog history from localStorage', e);
				}
			}
			
			let allDialogs = historyDialogs.map(dialog => ({
				...dialog,
				source: 'history' // All dialogs are now treated as history
			}));
			
			// Get current page URL for filtering
			let currentPageUrl = '';
			chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
				if (tabs && tabs[0]) {
					currentPageUrl = tabs[0].url;
					
					// Apply filters based on the new options
					if (filterType !== 'all') {
						switch(filterType) {
							case 'auto_accepted':
								// Filter to only show auto-accepted dialogs
								allDialogs = allDialogs.filter(dialog => 
									dialog.method && (
										dialog.method.includes('auto') || 
										dialog.method.includes('cloud') || 
										dialog.method.includes('smart')
									)
								);
								break;
							case 'ignored':
								// Filter to show dialogs that were NOT auto-accepted
								allDialogs = allDialogs.filter(dialog => 
									!dialog.method || (
										!dialog.method.includes('auto') && 
										!dialog.method.includes('cloud') && 
										!dialog.method.includes('smart')
									)
								);
								break;
							case 'current_page':
								// Filter to show only dialogs from the current domain
								allDialogs = allDialogs.filter(dialog => 
									dialog.domain && currentPageUrl.includes(dialog.domain)
								);
								break;
						}
					}
					
					// Sort by most recent first
					allDialogs.sort((a, b) => {
						return new Date(b.capturedAt) - new Date(a.capturedAt);
					});
					
					// Update the dialog count (only for unreviewed items)
					const unreviewedCount = allDialogs.filter(d => !d.reviewed).length;
					console.log('Unreviewed count:', unreviewedCount, 'Total dialogs:', allDialogs.length);
					dialogCount.textContent = unreviewedCount;
					dialogCount.style.display = unreviewedCount > 0 ? 'inline-block' : 'none';
					
					// Display the list
					displayAllDialogs(allDialogs);
				}
			});
		}).catch(error => {
			console.error('Error getting dialog history from Chrome runtime, using localStorage fallback:', error);
			console.log('Error details:', error.message, error.stack);
			
			// Try localStorage directly if runtime message fails
			try {
				const savedHistory = localStorage.getItem('ccm_history');
				if (savedHistory) {
					const localData = JSON.parse(savedHistory);
					if (localData.dialogHistory && Array.isArray(localData.dialogHistory)) {
						const historyDialogs = localData.dialogHistory;
						
						let allDialogs = historyDialogs.map(dialog => ({
							...dialog,
							source: 'history' // All dialogs are now treated as history
						}));
						
						// Get current page URL for filtering
						chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
							if (tabs && tabs[0]) {
								const currentPageUrl = tabs[0].url;
								
								// Apply filters based on the new options
								if (filterType !== 'all') {
									switch(filterType) {
										case 'auto_accepted':
											// Filter to only show auto-accepted dialogs
											allDialogs = allDialogs.filter(dialog => 
												dialog.method && (
													dialog.method.includes('auto') || 
													dialog.method.includes('cloud') || 
													dialog.method.includes('smart')
												)
											);
											break;
										case 'ignored':
											// Filter to show dialogs that were NOT auto-accepted
											allDialogs = allDialogs.filter(dialog => 
												!dialog.method || (
													!dialog.method.includes('auto') && 
													!dialog.method.includes('cloud') && 
													!dialog.method.includes('smart')
												)
											);
											break;
										case 'current_page':
											// Filter to show only dialogs from the current domain
											allDialogs = allDialogs.filter(dialog => 
												dialog.domain && currentPageUrl.includes(dialog.domain)
											);
											break;
									}
								}
								
								// Sort by most recent first
								allDialogs.sort((a, b) => {
									return new Date(b.capturedAt) - new Date(a.capturedAt);
								});
								
								// Update the dialog count (only for unreviewed items)
								const unreviewedCount = allDialogs.filter(d => !d.reviewed).length;
								console.log('Unreviewed count:', unreviewedCount, 'Total dialogs:', allDialogs.length);
								dialogCount.textContent = unreviewedCount;
								dialogCount.style.display = unreviewedCount > 0 ? 'inline-block' : 'none';
								
								// Display the list
								displayAllDialogs(allDialogs);
							} else {
								displayAllDialogs([]);
							}
						});
					} else {
						displayAllDialogs([]);
					}
				} else {
					// No localStorage data either
					displayAllDialogs([]);
				}
			} catch (e) {
				console.error('Error loading dialog history from localStorage', e);
				displayAllDialogs([]);
			}
		});
	}
	
	// Update the displayAllDialogs function to add a loading spinner
	function displayAllDialogs(dialogs) {
		// Clear the dialogs list
		dialogsListElement.innerHTML = '';
		
		console.log('displayAllDialogs called with', dialogs?.length || 0, 'dialogs');
		
		if (!dialogs || dialogs.length === 0) {
			dialogsListElement.innerHTML = '<p class="no-dialogs">No cookie consent dialogs captured yet.</p>';
			return;
		}
		
		// Get current page URL
		let currentPageUrl = '';
		chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
			if (tabs && tabs[0]) {
				currentPageUrl = tabs[0].url;
			}
		});
		
		// Sort by date (newest first)
		dialogs.sort((a, b) => {
			return new Date(b.capturedAt) - new Date(a.capturedAt);
		});
		
		// Initially show only the first 5 items
		const initialDisplayCount = 5;
		const hasMoreItems = dialogs.length > initialDisplayCount;
		
		// Create a container for the dialog items
		const dialogItemsContainer = document.createElement('div');
		dialogItemsContainer.id = 'dialogItemsContainer';
		dialogsListElement.appendChild(dialogItemsContainer);
		
		// Function to render dialog items
		const renderDialogItems = (items, container, startIndex, count) => {
			const endIndex = Math.min(startIndex + count, items.length);
			
			for (let i = startIndex; i < endIndex; i++) {
				const dialog = items[i];
				
				// Format date to be more readable
				const captureDate = new Date(dialog.capturedAt);
				const formattedDate = captureDate.toLocaleString('en-GB', {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				});
				
				// Create the item element
				const item = document.createElement('div');
				item.className = 'history-item';
				if (dialog.active) item.classList.add('active');
				
				// Determine if this is the current page
				const isCurrentPage = dialog.url && currentPageUrl.includes(dialog.domain);
				
				// Determine if this was auto-accepted
				const wasAutoAccepted = dialog.method && (
					dialog.method.includes('auto') || 
					dialog.method.includes('cloud') || 
					dialog.method.includes('smart')
				);
				
				// Simplified display
				item.innerHTML = `
					<div class="site-info">
						<div class="domain">${dialog.domain}</div>
						<div class="date">${formattedDate}</div>
					</div>
					<div class="indicators">
						${isCurrentPage ? '<span class="site-indicator current-page" title="Current page"></span>' : ''}
						${wasAutoAccepted ? '<span class="site-indicator auto-accepted" title="Auto-accepted"></span>' : ''}
					</div>
				`;
				
				item.addEventListener('click', () => {
					// Clear any previous active selections
					document.querySelectorAll('.history-item.active').forEach(el => 
						el.classList.remove('active'));
					
					// Mark this item as active
					item.classList.add('active');
					
					// Load dialog details
					console.log('Loading dialog details for:', dialog.domain);
					loadDialogDetails(dialog, dialog.source === 'history');
					
					// Switch to the details tab using the showTab function
					showTab('details');
					
					// Force UI update by adding a small delay to double-check tab visibility
					setTimeout(() => {
						// Check again if the details tab is active
						if (!document.querySelector('.tab[data-tab="details"]').classList.contains('active') ||
							!document.getElementById('details-tab').classList.contains('active')) {
							
							console.log('Re-activating details tab after timeout');
							// Re-activate the details tab as a failsafe
							showTab('details');
						}
					}, 50);
				});
				
				container.appendChild(item);
			}
		};
		
		// Add the initial items
		renderDialogItems(dialogs, dialogItemsContainer, 0, initialDisplayCount);
		
		// Add "Show More" button if there are more items
		if (hasMoreItems) {
			const showMoreBtn = document.createElement('button');
			showMoreBtn.className = 'show-more-btn';
			showMoreBtn.innerHTML = `Show More (${dialogs.length - initialDisplayCount} remaining)`;
			dialogsListElement.appendChild(showMoreBtn);
			
			showMoreBtn.addEventListener('click', () => {
				// Show loading spinner
				showMoreBtn.innerHTML = `Loading<div class="spinner"></div>`;
				
				// Use setTimeout to give UI time to update before loading more items
				setTimeout(() => {
					// If all items are already shown, remove the button
					if (dialogItemsContainer.children.length >= dialogs.length) {
						showMoreBtn.remove();
						return;
					}
					
					// Add the next set of items
					const currentCount = dialogItemsContainer.children.length;
					renderDialogItems(dialogs, dialogItemsContainer, currentCount, initialDisplayCount);
					
					// Update button text or remove if all items are shown
					const remainingCount = dialogs.length - dialogItemsContainer.children.length;
					if (remainingCount <= 0) {
						showMoreBtn.remove();
					} else {
						showMoreBtn.innerHTML = `Show More (${remainingCount} remaining)`;
					}
				}, 300); // Small delay to show the spinner
			});
		}
	}
	
	function getButtonTypeDisplayText(dialog) {
		let buttonTypeText = 'Unknown';
		if (dialog.buttonType) {
			switch(dialog.buttonType) {
				case 'accept_all': buttonTypeText = 'Accept All'; break;
				case 'essential_only': buttonTypeText = 'Essential Only'; break;
				case 'necessary_only': buttonTypeText = 'Necessary Only'; break;
				case 'gdpr_necessary': buttonTypeText = 'GDPR Necessary'; break;
				case 'decline': buttonTypeText = 'Decline'; break;
				case 'customise': buttonTypeText = 'Customise'; break;
				default: buttonTypeText = 'Unknown'; break;
			}
		}
		return buttonTypeText;
	}
	
	// Update loadDialogDetails function to reorganize the layout
	function loadDialogDetails(dialog, isHistory = false) {
		// Store the current dialog
		currentDialog = dialog;
		currentDialogId = dialog.id;
		
		// Show the detail container and hide the no selection message
		dialogDetailContainer.style.display = 'block';
		noSelectionMessage.style.display = 'none';
		
		// Format button type for display
		let buttonTypeText = getButtonTypeDisplayText(dialog);
		
		// Create a new container for all details content
		const detailedInfo = document.getElementById('detailedInfo');
		detailedInfo.innerHTML = '';
		
		// 1. Add auto-accept status indicator
		const autoAcceptStatus = document.createElement('div');
		autoAcceptStatus.className = 'auto-accept-status';
		
		// Determine status based on dialog data
		let statusType = 'warning';
		let statusMessage = 'Auto-accept disabled in settings';
		
		if (dialog.method) {
			if (dialog.method.includes('auto') || dialog.method.includes('smart') || dialog.method.includes('cloud')) {
				statusType = 'success';
				statusMessage = 'Successfully auto-accepted cookies';
			} else if (dialog.method.includes('manual')) {
				statusType = 'warning';
				statusMessage = 'Manual interaction required';
			} else if (dialog.method.includes('fail') || dialog.method.includes('error')) {
				statusType = 'error';
				statusMessage = 'Failed to auto-accept cookies';
			}
		} else {
			statusType = 'warning';
			statusMessage = 'No auto-accept attempted';
		}
		
		autoAcceptStatus.classList.add(statusType);
		autoAcceptStatus.innerHTML = `
			<div class="status-icon">⚙️</div>
			<div>${statusMessage}</div>
		`;
		detailedInfo.appendChild(autoAcceptStatus);
		
		// 2. Create info card with dialog details at the top
		const infoCard = document.createElement('div');
		infoCard.className = 'info-card';
		
		const infoCardHeader = document.createElement('div');
		infoCardHeader.className = 'info-card-header';
		infoCardHeader.textContent = 'Cookie Dialog Information';
		infoCard.appendChild(infoCardHeader);
		
		const infoCardContent = document.createElement('div');
		infoCardContent.className = 'info-card-content';
		
		// Format date
		const date = new Date(dialog.capturedAt);
		const formattedDate = date.toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
		
		// Add details with icons and ellipsis for long text
		infoCardContent.innerHTML = `
			<div class="detail-item">
				<span class="detail-icon">🌐</span>
				<strong>Domain:</strong> 
				<span class="detail-value text-truncate">${dialog.domain}</span>
			</div>
			<div class="detail-item">
				<span class="detail-icon">🔗</span>
				<strong>URL:</strong> 
				<span class="detail-value text-truncate">
					<a href="${dialog.url}" target="_blank" title="${dialog.url}">${dialog.url || 'Not available'}</a>
				</span>
			</div>
			<div class="detail-item">
				<span class="detail-icon">⚙️</span>
				<strong>Method:</strong> 
				<span class="detail-value text-truncate">${dialog.method || 'Not specified'}</span>
			</div>
			<div class="detail-item">
				<span class="detail-icon">📍</span>
				<strong>Region:</strong> 
				<span class="detail-value">${dialog.region || 'Not detected'}</span>
			</div>
			<div class="detail-item">
				<span class="detail-icon">🕒</span>
				<strong>Captured:</strong> 
				<span class="detail-value">${formattedDate}</span>
			</div>
			<div class="detail-item">
				<span class="detail-icon">✓</span>
				<strong>Reviewed:</strong> 
				<span class="detail-value">${dialog.reviewed ? 'Yes' : 'No'}</span>
			</div>
		`;
		infoCard.appendChild(infoCardContent);
		detailedInfo.appendChild(infoCard);
		
		// Extract detected elements including links
		if (dialog.html) {
			// Parse the HTML to extract elements
			const tempContainer = document.createElement('div');
			tempContainer.innerHTML = dialog.html;
			
			// Extract existing detected elements
			const detectedElements = dialog.detectedElements || [];
			
			// Look for important links that may not have been detected previously
			const links = tempContainer.querySelectorAll('a');
			links.forEach(link => {
				const href = link.getAttribute('href');
				const text = link.textContent.trim();
				
				// Skip if empty or just "#"
				if (!text || text === '#' || !href || href === '#') return;
				
				// Skip if we already have this link
				const exists = detectedElements.some(el => 
					(el.href === href && el.text === text) || 
					(el.isLink && el.text === text)
				);
				
				if (!exists) {
					// Check if it's an important link
					const linkText = text.toLowerCase();
					const linkHref = href.toLowerCase();
					
					if (linkText.includes('privacy') || 
						linkText.includes('policy') || 
						linkText.includes('terms') || 
						linkText.includes('more info') || 
						linkText.includes('learn more') ||
						linkText.includes('cookie') ||
						linkText.includes('preference') ||
						linkText.includes('settings') ||
						linkHref.includes('privacy') || 
						linkHref.includes('policy') || 
						linkHref.includes('terms') || 
						linkHref.includes('cookie')) {
						
						// Add this link to detected elements
						detectedElements.push({
							tagName: 'A',
							isLink: true,
							text: text,
							href: href,
							type: 'link'
						});
					}
				}
			});
			
			// Update the dialog with the enhanced list of detected elements
			dialog.detectedElements = detectedElements;
		}
		
		// Display the detected elements
		displayDetectedElements(dialog);
		
		// Add action buttons if in dev mode
		if (settings.devMode) {
			addDialogActionButtons(detailedInfo);
		}
		
		// Add the review section
		addReviewSection(isHistory);
		
		// Update rating buttons visibility
		updateRatingButtons();
	}

	function displayDetectedElements(dialog) {
		// Check if we have a valid dialog with detected elements
		if (!dialog || !dialog.detectedElements) {
			console.error('Dialog or detected elements missing');
			return;
		}
		
		console.log(`Displaying ${dialog.detectedElements.length} detected elements in ${settings.devMode ? 'dev' : 'regular'} mode`);
		
		// Get the elements containers
		const detectedElementsContainer = document.getElementById('detectedElementsList');
		const buttonClassificationsContainer = document.getElementById('buttonClassificationsList');
		const optionClassificationsContainer = document.getElementById('optionClassificationsList');
		
		if (!detectedElementsContainer) {
			console.error('Could not find necessary containers for elements');
			return;
		}
		
		// Clear the containers
		detectedElementsContainer.innerHTML = '';
		
		// Get parent containers
		const buttonClassificationsParent = buttonClassificationsContainer ? buttonClassificationsContainer.parentElement : null;
		const optionClassificationsParent = optionClassificationsContainer ? optionClassificationsContainer.parentElement : null;
		
		// Hide classification containers when not in dev mode
		if (buttonClassificationsParent) {
			buttonClassificationsParent.style.display = settings.devMode ? 'block' : 'none';
		}
		
		if (optionClassificationsParent) {
			optionClassificationsParent.style.display = settings.devMode ? 'block' : 'none';
		}
		
		// If in dev mode, clear the classification containers
		if (settings.devMode) {
			if (buttonClassificationsContainer) buttonClassificationsContainer.innerHTML = '';
			if (optionClassificationsContainer) optionClassificationsContainer.innerHTML = '';
		}
		
		// Handle no elements detected
		if (!dialog.detectedElements || dialog.detectedElements.length === 0) {
			detectedElementsContainer.innerHTML = '<div class="no-elements-message">No elements detected in this dialog.</div>';
			
			if (settings.devMode) {
				if (buttonClassificationsContainer) buttonClassificationsContainer.innerHTML = '<div class="no-elements-message">No buttons detected</div>';
				if (optionClassificationsContainer) optionClassificationsContainer.innerHTML = '<div class="no-elements-message">No options detected</div>';
			}
			return;
		}
		
		// Create button type options for dropdown (only needed in dev mode)
		const buttonTypeOptions = settings.devMode ? [
			{ value: 'accept_all', text: 'Accept All' },
			{ value: 'essential_only', text: 'Essential Only' },
			{ value: 'necessary_only', text: 'Necessary Only' },
			{ value: 'customise', text: 'Customise' },
			{ value: 'decline', text: 'Decline' },
			{ value: 'other', text: 'Other' },
			{ value: 'bad_match', text: 'Bad Match' }
		] : [];
		
		// Create option type options for dropdown (only needed in dev mode)
		const optionTypeOptions = settings.devMode ? [
			{ value: 'essential', text: 'Essential' },
			{ value: 'analytics', text: 'Analytics' },
			{ value: 'marketing', text: 'Marketing' },
			{ value: 'preferences', text: 'Preferences' },
			{ value: 'privacy', text: 'Privacy' },
			{ value: 'other', text: 'Other' },
			{ value: 'bad_match', text: 'Bad Match' }
		] : [];
		
		// Filter elements by type - we need to categorize buttons, options, and other elements
		const buttons = dialog.detectedElements.filter(el => 
			el.tagName === 'BUTTON' || 
			el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') ||
			el.isButton || 
			el.role === 'button');
		
		const options = dialog.detectedElements.filter(el =>
			el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio') ||
			el.isOption || 
			el.role === 'checkbox' || 
			el.role === 'radio');
		
		const otherElements = dialog.detectedElements.filter(el =>
			!buttons.includes(el) && !options.includes(el));
		
		// Always display important links and other elements in the main detected elements container
		// Extract all links from all element types for non-dev mode
		let allLinks = otherElements;
		
		// In non-dev mode, pull important links from buttons and options too
		if (!settings.devMode) {
			// Add buttons and options that appear to be more info/settings links to the links list
			const buttonLinks = buttons.filter(button => {
				if (!button.text) return false;
				
				const textLower = button.text.toLowerCase();
				return textLower.includes('more') || 
					textLower.includes('info') || 
					textLower.includes('settings') || 
					textLower.includes('preference') || 
					textLower.includes('privacy') || 
					textLower.includes('cookie') || 
					textLower.includes('choices');
			});
			
			allLinks = [...allLinks, ...buttonLinks];
		} else {
			// In dev mode, display summary info
			const summaryInfo = document.createElement('div');
			summaryInfo.className = 'elements-summary';
			summaryInfo.innerHTML = `
				<p>Total elements: ${dialog.detectedElements.length}</p>
				<p>Buttons: ${buttons.length}</p>
				<p>Options: ${options.length}</p>
			`;
			detectedElementsContainer.appendChild(summaryInfo);
		}
		
		// 1. Populate button classifications section (only in dev mode)
		if (settings.devMode && buttonClassificationsContainer) {
			if (buttons.length > 0) {
				buttons.forEach((button, index) => {
					const elementRow = document.createElement('div');
					elementRow.className = 'element-row';
					
					// Element text
					const elementText = document.createElement('div');
					elementText.className = 'element-text';
					elementText.textContent = button.text || button.value || 'Unnamed button';
					
					// Create the type dropdown for this button
					const typeSelect = document.createElement('select');
					typeSelect.className = 'element-type-select';
					typeSelect.dataset.buttonIndex = index;
					
					// Add options to the dropdown
					buttonTypeOptions.forEach(option => {
						const optionEl = document.createElement('option');
						optionEl.value = option.value;
						optionEl.textContent = option.text;
						typeSelect.appendChild(optionEl);
					});
					
					// Set current value if available
					if (button.type) {
						typeSelect.value = button.type;
					}
					
					// Add event listener for dropdown change
					typeSelect.addEventListener('change', function() {
						// Update the button's classification
						button.type = this.value;
						
						// Update UI - if any classifications changed, update the rating buttons
						updateRatingButtons();
						
						// Mark as modified
						dialog.modified = true;
					});
					
					// Add to row
					elementRow.appendChild(elementText);
					elementRow.appendChild(typeSelect);
					
					// Add row to container
					buttonClassificationsContainer.appendChild(elementRow);
				});
			} else {
				buttonClassificationsContainer.innerHTML = '<div class="no-elements-message">No buttons detected</div>';
			}
		}
		
		// 2. Populate option classifications section (only in dev mode)
		if (settings.devMode && optionClassificationsContainer) {
			if (options.length > 0) {
				options.forEach((option, index) => {
					const elementRow = document.createElement('div');
					elementRow.className = 'element-row';
					
					// Element text
					const elementText = document.createElement('div');
					elementText.className = 'element-text';
					elementText.textContent = option.text || option.value || 'Unnamed option';
					
					// Create the type dropdown for this option
					const typeSelect = document.createElement('select');
					typeSelect.className = 'element-type-select';
					typeSelect.dataset.optionIndex = index;
					
					// Add options to the dropdown
					optionTypeOptions.forEach(optionType => {
						const optionEl = document.createElement('option');
						optionEl.value = optionType.value;
						optionEl.textContent = optionType.text;
						typeSelect.appendChild(optionEl);
					});
					
					// Set current value if available
					if (option.type) {
						typeSelect.value = option.type;
					}
					
					// Add event listener for dropdown change
					typeSelect.addEventListener('change', function() {
						// Update the option's classification
						option.type = this.value;
						
						// Update UI - if any classifications changed, update the rating buttons
						updateRatingButtons();
						
						// Mark as modified
						dialog.modified = true;
					});
					
					// Add to row
					elementRow.appendChild(elementText);
					elementRow.appendChild(typeSelect);
					
					// Add row to container
					optionClassificationsContainer.appendChild(elementRow);
				});
			} else {
				optionClassificationsContainer.innerHTML = '<div class="no-elements-message">No options detected</div>';
			}
		}
		
		// 3. Always display important links in the main detected elements container
		const importantLinks = allLinks.filter(element => {
			if (!element.text) return false;
			
			const textLower = element.text.toLowerCase();
			const type = element.type?.toLowerCase() || '';
			const href = element.href?.toLowerCase() || '';
			
			// Check if this is a privacy/terms/more info link
			return (
				type === 'privacy' || 
				type === 'terms' || 
				textLower.includes('privacy') || 
				textLower.includes('policy') || 
				textLower.includes('terms') || 
				textLower.includes('more info') || 
				textLower.includes('learn more') ||
				textLower.includes('cookie') ||
				textLower.includes('preference') ||
				textLower.includes('settings') ||
				textLower.includes('manage') ||
				textLower.includes('customize') ||
				textLower.includes('customise') ||
				href.includes('privacy') || 
				href.includes('policy') || 
				href.includes('terms') || 
				href.includes('cookie')
			);
		});
		
		// If we have important links, display them
		if (importantLinks.length > 0) {
			// Add important links header
			const linksHeader = document.createElement('h4');
			linksHeader.textContent = 'Privacy & Settings Links';
			linksHeader.style.marginTop = '15px';
			detectedElementsContainer.appendChild(linksHeader);
			
			// Create links list
			const linksList = document.createElement('ul');
			linksList.style.paddingLeft = '20px';
			detectedElementsContainer.appendChild(linksList);
			
			// Add each important link
			importantLinks.forEach(link => {
				const linkItem = document.createElement('li');
				if (link.href) {
					linkItem.innerHTML = `<a href="${link.href}" target="_blank">${link.text || link.href}</a>`;
				} else {
					linkItem.textContent = link.text || 'Unnamed link';
				}
				linksList.appendChild(linkItem);
			});
		} else {
			// If no important links found
			const noLinksMessage = document.createElement('div');
			noLinksMessage.className = 'no-elements-message';
			noLinksMessage.textContent = 'No privacy policy, cookie settings or terms links found.';
			detectedElementsContainer.appendChild(noLinksMessage);
		}
	}

	// Add a function to update the rating buttons based on modifications
	function updateRatingButtons() {
		const goodMatchBtn = document.getElementById('goodMatchBtn');
		const badMatchBtn = document.getElementById('badMatchBtn');
		
		if (!goodMatchBtn || !badMatchBtn) return;
		
		// If the dialog has been modified, change the badMatchBtn to "Submit Changes"
		// and hide the goodMatchBtn
		if (currentDialog && currentDialog.modified) {
			goodMatchBtn.style.display = 'none';
			badMatchBtn.textContent = 'Submit Changes';
			badMatchBtn.className = 'submit-changes';
		} else {
			goodMatchBtn.style.display = 'block';
			badMatchBtn.textContent = 'Bad Match';
			badMatchBtn.className = '';
		}
	}

	function submitRating(dialogId, rating, isGoodMatch) {
		// Collect the classifications from dropdowns
		const elementClassifications = [];
		
		// Get button classifications
		const buttonClassificationsList = document.getElementById('buttonClassificationsList');
		const buttonRows = buttonClassificationsList.querySelectorAll('.element-row');
		buttonRows.forEach(row => {
			const elementText = row.querySelector('.element-text').textContent;
			const elementTypeSelect = row.querySelector('.element-type-select');
			
			if (elementTypeSelect) {
				const classification = {
					text: elementText,
					type: elementTypeSelect.value,
					isBadMatch: elementTypeSelect.value === 'bad_match',
					elementType: 'button',
					index: elementTypeSelect.dataset.buttonIndex
				};
				elementClassifications.push(classification);
			}
		});
		
		// Get option classifications
		const optionClassificationsList = document.getElementById('optionClassificationsList');
		const optionRows = optionClassificationsList.querySelectorAll('.element-row');
		optionRows.forEach(row => {
			const elementText = row.querySelector('.element-text').textContent;
			const elementTypeSelect = row.querySelector('.element-type-select');
			
			if (elementTypeSelect) {
				const classification = {
					text: elementText,
					type: elementTypeSelect.value,
					isBadMatch: elementTypeSelect.value === 'bad_match',
					elementType: 'option',
					index: elementTypeSelect.dataset.optionIndex
				};
				elementClassifications.push(classification);
			}
		});
		
		// Create a submission object
		const submissionData = {
			dialogId,
			rating,
			isGoodMatch,
			elementClassifications,
			modified: currentDialog && currentDialog.modified
		};
		
		// Send to content script first for sanitization
		chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
			if (tabs[0]) {
				// First send to content script to sanitize
				chrome.tabs.sendMessage(tabs[0].id, {
					action: 'submitRating',
					data: submissionData
				}, (response) => {
					if (response && !response.error) {
						// Content script has sanitized and submitted the data
						submissionStatus.textContent = 'Thanks! Your rating has been submitted.';
						// Refresh the list after submission
						setTimeout(() => {
							loadAllDialogs();
							updateDialogCount();
						}, 1000);
					} else {
						// If content script not available or error, try direct submission
						chrome.runtime.sendMessage({ 
							action: 'submitDialogRating',
							data: submissionData
						}, (response) => {
							if (response && response.success) {
								// Mark as reviewed in history
								chrome.runtime.sendMessage({
									action: 'markDialogAsReviewed',
									dialogId
								});
								
								submissionStatus.textContent = 'Thanks! Your rating has been submitted.';
								// Refresh the list after submission
								setTimeout(() => {
									loadAllDialogs();
									updateDialogCount();
								}, 1000);
							} else {
								submissionStatus.textContent = 'Error submitting rating. Please try again.';
							}
						});
					}
				});
			} else {
				// No active tab, try direct submission
				chrome.runtime.sendMessage({ 
					action: 'submitDialogRating',
					data: submissionData
				}, (response) => {
					if (response && response.success) {
						// Mark as reviewed in history
						chrome.runtime.sendMessage({
								action: 'markDialogAsReviewed',
								dialogId
							});
						
						submissionStatus.textContent = 'Thanks! Your rating has been submitted.';
						// Refresh the list after submission
						setTimeout(() => {
							loadAllDialogs();
							updateDialogCount();
						}, 1000);
					} else {
						submissionStatus.textContent = 'Error submitting rating. Please try again.';
					}
				});
			}
		});
	}

	// New function to clear badge count when popup is opened
	function clearBadgeCount() {
		// First, check if there are any real dialogs or submissions to review
		chrome.storage.local.get(['capturedDialogs', 'pendingSubmissions'], (result) => {
			const capturedDialogs = result.capturedDialogs || [];
			const pendingSubmissions = result.pendingSubmissions || [];
			
			// Only clear badge if there are no valid dialogs or pending submissions
			if (capturedDialogs.length === 0 && pendingSubmissions.length === 0) {
				chrome.action.setBadgeText({ text: '' });
			}
		});
	}

	// Helper function to format HTML with line numbers
	function formatHtmlWithLineNumbers(html) {
		const lines = html.split('\n');
		let table = '<table>';
		
		lines.forEach((line, index) => {
			table += `
				<tr class="code-line">
					<td class="line-numbers">${index + 1}</td>
					<td>${line}</td>
				</tr>
			`;
		});
		
		table += '</table>';
		return table;
	}

	// Helper function to escape HTML
	function escapeHtml(unsafe) {
		return unsafe
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	// Helper function to display analysis results
	function displayAnalysisResults(result) {
		// Show results container
		analysisResults.style.display = 'block';
		
		// Format detection result with green/red highlighting
		detectionResult.innerHTML = result.detected ? 
			'<span style="color: #4CAF50; font-weight: bold;">Detected ✓</span>' : 
			'<span style="color: #F44336; font-weight: bold;">Not Detected ✗</span>';
		
		// Format other results
		cookieTermsResult.innerHTML = result.hasCookieTerms ? 
			'<span style="color: #4CAF50;">Yes ✓</span>' : 
			'<span style="color: #F44336;">No ✗</span>';
			
		buttonsResult.innerHTML = result.hasButtons ? 
			'<span style="color: #4CAF50;">Yes ✓</span>' : 
			'<span style="color: #F44336;">No ✗</span>';
		
		// Format accept button result - ensure we don't display "more about" links as accept buttons	
		acceptButtonResult.innerHTML = result.hasAcceptButton ? 
			`<span style="color: #4CAF50;">Found: "${result.acceptButtonText}" ✓</span>` : 
			'<span style="color: #F44336;">Not Found ✗</span>';
		
		// Format necessary button result - prioritize "reject all" buttons
		necessaryButtonResult.innerHTML = result.hasNecessaryButton ? 
			`<span style="color: #4CAF50;">Found: "${result.necessaryButtonText}" ✓</span>` : 
			'<span style="color: #F44336;">Not Found ✗</span>';
		
		// Display recommendations
		recommendationsList.innerHTML = '';
		if (result.recommendations && result.recommendations.length > 0) {
			result.recommendations.forEach(recommendation => {
				const li = document.createElement('li');
				li.textContent = recommendation;
				recommendationsList.appendChild(li);
			});
		} else {
			const li = document.createElement('li');
			li.textContent = 'No recommendations needed. Smart formula works correctly for this cookie box.';
			li.style.color = '#4CAF50';
			recommendationsList.appendChild(li);
		}
	}

	// Add this new function to check consent before performing actions that require it
	function checkConsentBeforeAction(actionCallback, declineCallback = null) {
		chrome.runtime.sendMessage({ action: 'getDataCollectionConsent' }, (response) => {
			if (response && response.consent) {
				// Consent already given, perform the action
				actionCallback();
			} else {
				// No consent yet, show the dialog
				const consentMessage = `
Cookie Consent Manager needs permission to send anonymised data about this cookie banner to improve detection.

All personal information will be redacted before submitting to our database, ensuring your privacy.

Under UK GDPR and Data Protection Act 2018, we are required to obtain your explicit consent before collecting this data.

Your data will only be used to improve the extension's functionality and will not be shared with third parties.

Do you consent to this data collection?
				`;
				
				if (confirm(consentMessage)) {
					chrome.runtime.sendMessage({ 
						action: 'setDataCollectionConsent', 
						consent: true 
					}, () => {
						checkDataCollectionConsent();
						// Now perform the action
						actionCallback();
					});
					privacyModeToggle.checked = true;
					saveSettings();
				} else {
					// User declined consent
					chrome.runtime.sendMessage({ 
						action: 'setDataCollectionConsent', 
						consent: false 
					}, () => {
						checkDataCollectionConsent();
						if (declineCallback) {
							declineCallback();
						} else {
							alert('This feature requires data collection consent. You can grant consent later in the settings tab.');
						}
					});
				}
				
				// Mark that we've asked (prevent repeated asking)
				chrome.storage.local.set({ initialPermissionAsked: true });
			}
		});
	}

	// Helper function to format HTML with line numbers
	function formatHtmlWithLineNumbers(html) {
		const lines = html.split('\n');
		let table = '<table>';
		
		lines.forEach((line, index) => {
			table += `
				<tr class="code-line">
					<td class="line-numbers">${index + 1}</td>
					<td>${line}</td>
				</tr>
			`;
		});
		
		table += '</table>';
		return table;
	}

	// Action buttons in details tab
	if (copyLinkBtn) {
		copyLinkBtn.addEventListener('click', () => {
			if (currentDialog && currentDialog.url) {
				navigator.clipboard.writeText(currentDialog.url)
					.then(() => {
						copyLinkBtn.textContent = 'Copied!';
						setTimeout(() => { copyLinkBtn.textContent = 'Copy Link'; }, 2000);
					})
					.catch(err => console.error('Could not copy text: ', err));
			}
		});
	}
	
	// Create Copy Source button
	const copySourceBtn = document.createElement('button');
	copySourceBtn.id = 'copySourceBtn';
	copySourceBtn.className = 'action-button';
	copySourceBtn.textContent = 'Copy Source';

	if (viewSourceBtn) {
		// Add View Source button functionality
		viewSourceBtn.addEventListener('click', () => {
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
		
		// Insert Copy Source button after View Source button
		if (viewSourceBtn.parentNode) {
			viewSourceBtn.parentNode.insertBefore(copySourceBtn, viewSourceBtn.nextSibling);
			
			// Add event listener for the Copy Source button
			copySourceBtn.addEventListener('click', () => {
				if (currentDialog && currentDialog.html) {
					navigator.clipboard.writeText(currentDialog.html)
						.then(() => {
							copySourceBtn.textContent = 'Copied!';
							setTimeout(() => { copySourceBtn.textContent = 'Copy Source'; }, 2000);
						})
						.catch(err => console.error('Could not copy text: ', err));
				}
			});
		}
	}
	
	if (exportBtn) {
		exportBtn.addEventListener('click', () => {
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

	// Initial setup
	loadSettings(() => {
		updateDialogCount();
		loadAllDialogs();
		checkDataCollectionConsent();
		checkForCookieBoxes();  // Check for cookie boxes on initial load
		updateDevModeUI();  // Apply Dev Mode settings initially
		
		// Add direct initialization for cookie detection status
		setTimeout(() => {
			updateCookieDetectionStatus();
		}, 300);
	});

	// Event listeners
	enabledToggle.addEventListener('change', saveSettings);
	autoAcceptToggle.addEventListener('change', saveSettings);
	smartModeToggle.addEventListener('change', saveSettings);
	cloudModeToggle.addEventListener('change', saveSettings);
	privacyModeToggle.addEventListener('change', saveSettings);
	gdprComplianceToggle.addEventListener('change', saveSettings);
	devModeToggle.addEventListener('change', () => {
		saveSettings();
		updateDevModeUI();
	});
	
	// Consent button
	dataCollectionConsentBtn.addEventListener('click', toggleDataCollectionConsent);
	
	// Report cookie box button
	reportCookieBoxBtn.addEventListener('click', reportCookieBox);

	// Function to create and update the cookie detection status on the settings page
	function updateCookieDetectionStatus() {
		console.log('Updating cookie detection status');
		// Get the container for detection status
		const container = document.getElementById('cookieDetectionContainer');
		if (!container) {
			console.log('Detection container not found');
			return;
		}
		
		// Clear existing content
		container.innerHTML = '';
		
		// Check if we have any detected dialogs for the current tab
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs.length > 0) {
				const currentTabId = tabs[0].id;
				const currentUrl = tabs[0].url;
				const currentDomain = currentUrl ? new URL(currentUrl).hostname : '';
				
				console.log('Checking for dialogs on domain:', currentDomain);
				
				chrome.storage.local.get(['dialogHistory'], (result) => {
					const history = result.dialogHistory || [];
					console.log('Dialog history found:', history.length);
					
					// Find the most recent dialog for this domain
					const currentTabDialogs = history.filter(dialog => 
						dialog.tabId === currentTabId || 
						(dialog.domain && dialog.domain === currentDomain)
					);
					
					console.log('Current tab dialogs found:', currentTabDialogs.length);
					
					// Sort by most recent
					currentTabDialogs.sort((a, b) => {
						return new Date(b.capturedAt) - new Date(a.capturedAt);
					});
					
					const latestDialog = currentTabDialogs[0];
					
					// Create the detection status card
					const statusCard = document.createElement('div');
					statusCard.className = 'cookie-detection-status';
					
					if (latestDialog) {
						console.log('Latest dialog found:', latestDialog.domain);
						// Determine the status type based on the dialog data
						let statusType = 'warning';
						let statusTitle = 'Cookie Dialog Detected';
						let statusMessage = 'A cookie dialog was detected but required manual handling.';
						let statusIcon = '⚠️';
						
						if (latestDialog.method) {
							if (latestDialog.method.includes('auto') || 
								latestDialog.method.includes('smart') || 
								latestDialog.method.includes('cloud')) {
								statusType = 'success';
								statusTitle = 'Cookie Dialog Auto-Accepted';
								statusMessage = 'Successfully handled the cookie consent dialog on this page.';
								statusIcon = '✅';
							} else if (latestDialog.method.includes('manual')) {
								statusType = 'warning';
								statusTitle = 'Manual Interaction Required';
								statusMessage = 'A cookie dialog was detected but required manual interaction.';
								statusIcon = '⚠️';
							} else if (latestDialog.method.includes('fail') || latestDialog.method.includes('error')) {
								statusType = 'error';
								statusTitle = 'Auto-Accept Failed';
								statusMessage = 'Failed to automatically handle the cookie dialog on this page.';
								statusIcon = '❌';
							}
						}
						
						statusCard.classList.add(`status-${statusType}`);
						statusCard.innerHTML = `
							<div class="detection-header">
								<div><span class="status-icon">${statusIcon}</span> ${statusTitle}</div>
								<div class="status-time">${new Date(latestDialog.capturedAt).toLocaleTimeString('en-GB')}</div>
							</div>
							<div class="detection-content">
								<div>${statusMessage}</div>
								<div><strong>Domain:</strong> ${latestDialog.domain}</div>
								<div class="view-details">View Details</div>
							</div>
						`;
						
						// Add click event to view in details tab
						statusCard.addEventListener('click', () => {
							// Load dialog details and switch to details tab
							loadDialogDetails(latestDialog, false);
							
							// Switch to the details tab
							const tabs = document.querySelectorAll('.tab');
							const tabContents = document.querySelectorAll('.tab-content');
							
							tabs.forEach(t => t.classList.remove('active'));
							tabContents.forEach(tc => tc.classList.remove('active'));
							
							const detailsTab = document.querySelector('.tab[data-tab="details"]');
							if (detailsTab) {
								detailsTab.classList.add('active');
								document.getElementById('details-tab').classList.add('active');
								
								// Show the dialog detail container and hide the no selection message
								const dialogDetailContainer = document.getElementById('dialogDetailContainer');
								const noSelectionMessage = document.getElementById('noSelectionMessage');
								if (dialogDetailContainer) dialogDetailContainer.style.display = 'block';
								if (noSelectionMessage) noSelectionMessage.style.display = 'none';
							}
						});
					} else {
						console.log('No latest dialog found');
						// No cookie dialog detected
						statusCard.classList.add('status-none');
						statusCard.innerHTML = `
							<div class="detection-header">
								<div><span class="status-icon">🔍</span> No Cookie Dialog Detected</div>
							</div>
							<div class="detection-content">
								<div>No cookie consent dialog was detected on this page.</div>
								<button id="reportMissedCookieBtn" class="action-button" style="width: 100%; margin-top: 10px;">
									Report a Missed Cookie Dialog!
								</button>
							</div>
						`;
					}
					
					container.appendChild(statusCard);
					console.log('Added status card to container');
					
					// Add event listener for the report button if it exists
					const reportBtn = document.getElementById('reportMissedCookieBtn');
					if (reportBtn) {
						reportBtn.addEventListener('click', reportCookieBox);
					}
					
					// No need to show the old box since we have a new one
					const oldContainer = document.getElementById('noCookieBoxDetectedContainer');
					if (oldContainer) {
						oldContainer.style.display = 'none';
					}
				});
			} else {
				console.log('No active tabs found');
			}
		});
	}

	// Modify checkForCookieBoxes to update the detection status
	const originalCheckForCookieBoxes = checkForCookieBoxes;
	checkForCookieBoxes = function() {
		originalCheckForCookieBoxes();
		updateCookieDetectionStatus();
	};

	// Dev Mode toggle functionality
	function updateDevModeUI() {
		// Get the current settings
		const devModeEnabled = settings.devMode;
		
		console.log(`Updating UI for dev mode: ${devModeEnabled ? 'enabled' : 'disabled'}`);
		
		// Hide or show the analyze tab based on dev mode setting
		const analyzeTab = document.getElementById('analyzeTab');
		if (analyzeTab) {
			// Debug logging
			console.log('Setting Analyze tab display to:', devModeEnabled ? 'block' : 'none');
			analyzeTab.style.display = devModeEnabled ? 'block' : 'none';
		} else {
			console.error('Could not find analyzeTab element');
		}
		
		// If we're currently on the analyze tab but dev mode is disabled, switch to settings
		if (!devModeEnabled) {
			const activeTab = document.querySelector('.tab.active');
			if (activeTab && activeTab.getAttribute('data-tab') === 'analyze') {
				showTab('settings');
			}
		}
		
		// Toggle action buttons based on dev mode
		const actionButtonsContainer = document.querySelector('.action-buttons-container');
		if (!devModeEnabled && actionButtonsContainer) {
			actionButtonsContainer.remove();
		} else if (devModeEnabled && !actionButtonsContainer && currentDialog) {
			addDialogActionButtons();
		}
		
		// Update detected elements display if we have a current dialog
		if (currentDialog) {
			// Force refresh display of detected elements with current mode
			displayDetectedElements(currentDialog);
		}
	}

	// Functions to load and save settings
	function loadSettings(callback) {
		chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
			if (response && response.settings) {
				
				// Apply settings to UI
				enabledToggle.checked = response.settings.enabled !== false;
				autoAcceptToggle.checked = response.settings.autoAccept !== false;
				
				smartModeToggle.checked = response.settings.smartMode !== false;
				cloudModeToggle.checked = response.settings.cloudMode === true;
				privacyModeToggle.checked = response.settings.privacyMode === true;
				gdprComplianceToggle.checked = response.settings.gdprCompliance === true;
				devModeToggle.checked = response.settings.devMode === true;
				
				// Update UI based on settings
				updateStatus(response.settings);
				
				// Execute callback if provided
				if (typeof callback === 'function') {
					callback(response.settings);
				}
			} else {
				// If we can't get settings from background script, try localStorage
				try {
					const savedSettings = localStorage.getItem('ccm_settings');
					if (savedSettings) {
						const parsedSettings = JSON.parse(savedSettings);
						
						// Apply settings to UI
						enabledToggle.checked = parsedSettings.enabled !== false;
						autoAcceptToggle.checked = parsedSettings.autoAccept !== false;
						
						smartModeToggle.checked = parsedSettings.smartMode !== false;
						cloudModeToggle.checked = parsedSettings.cloudMode === true;
						privacyModeToggle.checked = parsedSettings.privacyMode === true;
						gdprComplianceToggle.checked = parsedSettings.gdprCompliance === true;
						devModeToggle.checked = parsedSettings.devMode === true;
						
						// Update UI based on settings
						updateStatus(parsedSettings);
						
						// Execute callback if provided
						if (typeof callback === 'function') {
								callback(parsedSettings);
						}
					}
				} catch (e) {
					console.error('Error loading settings from localStorage', e);
					if (typeof callback === 'function') {
						const defaultSettings = {
							enabled: true,
							autoAccept: true,
							smartMode: true,
							cloudMode: false,
							privacyMode: false,
							gdprCompliance: false,
							devMode: false
						};
						callback(defaultSettings);
					}
				}
			}
		});
	}
	
	function saveSettings() {
		// Collect settings from UI
		const settings = {
			enabled: enabledToggle.checked,
			autoAccept: autoAcceptToggle.checked,
			smartMode: smartModeToggle.checked,
			cloudMode: cloudModeToggle.checked,
			privacyMode: privacyModeToggle.checked,
			gdprCompliance: gdprComplianceToggle.checked,
			devMode: devModeToggle.checked
		};
		
		// Send settings to background script
		chrome.runtime.sendMessage({ 
			action: 'settingsUpdated', 
			settings: settings 
		});
		
		// Also save to localStorage as fallback
		try {
			localStorage.setItem('ccm_settings', JSON.stringify(settings));
		} catch (e) {
			console.error('Error saving settings to localStorage', e);
		}
		
		// Update UI based on new settings
		updateStatus(settings);
	}

	function addDialogActionButtons(detailedInfo) {
		// Only add action buttons if not already present
		if (document.querySelector('.action-buttons-container')) {
			return;
		}
		
		// 3. Create action buttons
		const actionButtonsContainer = document.createElement('div');
		actionButtonsContainer.className = 'action-buttons-container';
		detailedInfo.appendChild(actionButtonsContainer);
		
		// View Source button
		const viewSourceButton = document.createElement('button');
		viewSourceButton.id = 'viewSourceBtn';
		viewSourceButton.className = 'action-button';
		viewSourceButton.innerHTML = '📄 View';
		actionButtonsContainer.appendChild(viewSourceButton);
		
		// Copy Source button
		const copySourceButton = document.createElement('button');
		copySourceButton.id = 'copySourceBtn';
		copySourceButton.className = 'action-button';
		copySourceButton.innerHTML = '📋 Copy Source';
		actionButtonsContainer.appendChild(copySourceButton);
		
		// Copy Link button
		const copyLinkButton = document.createElement('button');
		copyLinkButton.id = 'copyLinkBtn';
		copyLinkButton.className = 'action-button';
		copyLinkButton.innerHTML = '🔗 Copy Link';
		actionButtonsContainer.appendChild(copyLinkButton);
		
		// Export JSON button
		const exportButton = document.createElement('button');
		exportButton.id = 'exportBtn';
		exportButton.className = 'action-button';
		exportButton.innerHTML = '📤 Export';
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
						copySourceButton.innerHTML = '✓ Copied!';
						setTimeout(() => { copySourceButton.innerHTML = '📋 Copy Source'; }, 2000);
					})
					.catch(err => console.error('Could not copy text: ', err));
			}
		});
		
		copyLinkButton.addEventListener('click', () => {
			if (currentDialog && currentDialog.url) {
				navigator.clipboard.writeText(currentDialog.url)
					.then(() => {
						copyLinkButton.innerHTML = '✓ Copied!';
						setTimeout(() => { copyLinkButton.innerHTML = '🔗 Copy Link'; }, 2000);
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

	function addReviewSection(isHistory = false) {
		// Only add review section if not already present
		if (document.querySelector('.review-section')) {
			return;
		}
		
		const detailedInfo = document.getElementById('detailedInfo');
		if (!detailedInfo) return;
		
		// 5. Add review section
		if (!isHistory) {
			const reviewSection = document.createElement('div');
			reviewSection.className = 'review-section';
			
			const reviewHeading = document.createElement('div');
			reviewHeading.className = 'review-heading';
			reviewHeading.textContent = 'Review Cookie Dialog Classification';
			reviewSection.appendChild(reviewHeading);
			
			const reviewDescription = document.createElement('div');
			reviewDescription.style.fontSize = '13px';
			reviewDescription.style.marginBottom = '15px';
			reviewDescription.textContent = 'Was the cookie dialog classified correctly? Your feedback helps improve the service.';
			reviewSection.appendChild(reviewDescription);
			
			const ratingButtonsContainer = document.createElement('div');
			ratingButtonsContainer.className = 'rating-buttons';
			
			const goodMatchBtn = document.createElement('button');
			goodMatchBtn.id = 'goodMatchBtn';
			goodMatchBtn.textContent = '👍 Good Match';
			
			const badMatchBtn = document.createElement('button');
			badMatchBtn.id = 'badMatchBtn';
			badMatchBtn.textContent = '👎 Bad Match';
			
			ratingButtonsContainer.appendChild(goodMatchBtn);
			ratingButtonsContainer.appendChild(badMatchBtn);
			reviewSection.appendChild(ratingButtonsContainer);
			
			const submissionStatusEl = document.createElement('div');
			submissionStatusEl.id = 'submissionStatus';
			submissionStatusEl.textContent = 'You can adjust classifications above before submitting';
			reviewSection.appendChild(submissionStatusEl);
			
			detailedInfo.appendChild(reviewSection);
			
			// Add event handlers for the rating buttons
			goodMatchBtn.addEventListener('click', () => {
				if (currentDialogId) {
					// This was a good match
					checkConsentBeforeAction(() => {
						submitRating(currentDialogId, 5, true);
					});
				}
			});
			
			badMatchBtn.addEventListener('click', () => {
				if (currentDialogId) {
					// This depends on the button text - good match or submit changes
					const isSubmitChanges = badMatchBtn.textContent === '✓ Submit Changes';
					
					checkConsentBeforeAction(() => {
						submitRating(currentDialogId, isSubmitChanges ? 3 : 1, false);
					});
				}
			});
		} else {
			// For history items
			const historyNote = document.createElement('div');
			historyNote.style.padding = '15px';
			historyNote.style.textAlign = 'center';
			historyNote.style.color = '#666';
			historyNote.style.fontSize = '13px';
			historyNote.textContent = 'Historical record - no review needed';
			detailedInfo.appendChild(historyNote);
		}
	}

	// Add a function to show a specific tab that can be called from multiple places
	function showTab(tabName) {
		console.log(`Switching to tab: ${tabName}`);
		
		// Remove active class from all tabs
		tabs.forEach(t => t.classList.remove('active'));
		tabContents.forEach(tc => tc.classList.remove('active'));
		
		// Add active class to the target tab
		const targetTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
		const targetContent = document.getElementById(`${tabName}-tab`);
		
		if (targetTab) {
			targetTab.classList.add('active');
		} else {
			console.error(`Could not find tab with data-tab="${tabName}"`);
		}
		
		if (targetContent) {
			targetContent.classList.add('active');
		} else {
			console.error(`Could not find content with id="${tabName}-tab"`);
		}
		
		// For details tab, check if we have a current dialog
		if (tabName === 'details') {
			if (currentDialog) {
				const dialogDetailContainer = document.getElementById('dialogDetailContainer');
				const noSelectionMessage = document.getElementById('noSelectionMessage');
				const buttonClassificationsContainer = document.getElementById('buttonClassificationsList');
				const optionClassificationsContainer = document.getElementById('optionClassificationsList');
				
				// Get parent containers
				const buttonClassificationsParent = buttonClassificationsContainer ? buttonClassificationsContainer.parentElement : null;
				const optionClassificationsParent = optionClassificationsContainer ? optionClassificationsContainer.parentElement : null;
				
				// Hide classification containers when not in dev mode
				if (buttonClassificationsParent) {
					buttonClassificationsParent.style.display = settings.devMode ? 'block' : 'none';
				}
				
				if (optionClassificationsParent) {
					optionClassificationsParent.style.display = settings.devMode ? 'block' : 'none';
				}
				
				if (dialogDetailContainer) {
					dialogDetailContainer.style.display = 'block';
				}
				
				if (noSelectionMessage) {
					noSelectionMessage.style.display = 'none';
				}
				
				// Refresh the detected elements display with the current settings
				console.log('Refreshing element classifications for dialog:', currentDialog.domain);
				displayDetectedElements(currentDialog);
				
				// Also update the rating buttons in case dialog was modified
				updateRatingButtons();
			} else {
				const dialogDetailContainer = document.getElementById('dialogDetailContainer');
				const noSelectionMessage = document.getElementById('noSelectionMessage');
				
				if (dialogDetailContainer) {
					dialogDetailContainer.style.display = 'none';
				}
				
				if (noSelectionMessage) {
					noSelectionMessage.style.display = 'block';
				}
			}
		}
		
		// For review tab, load all dialogs
		if (tabName === 'review') {
			loadAllDialogs();
		}
		
		// Debug check to verify tab switch worked
		setTimeout(() => {
			const activeTab = document.querySelector('.tab.active');
			const activeContent = document.querySelector('.tab-content.active');
			
			if (!activeTab || !activeContent) {
				console.error('Tab switching failed - no active tab/content found');
			} else if (activeTab.getAttribute('data-tab') !== tabName || activeContent.id !== `${tabName}-tab`) {
				console.error(`Tab switching inconsistency: Expected ${tabName} but got ${activeTab.getAttribute('data-tab')}`);
			}
		}, 10);
	}
}); 

// Add event listeners for custom events from history-ui.js
document.addEventListener('dialogDetailsLoaded', (event) => {
	const dialog = event.detail;
	
	if (dialog) {
		// Set global current dialog variables
		currentDialog = dialog;
		currentDialogId = dialog.id;
		
		// Display the detected elements using our implementation
		displayDetectedElements(dialog);
		
		// Add action buttons if in dev mode
		if (settings && settings.devMode) {
			const detailedInfo = document.getElementById('detailedInfo');
			if (detailedInfo) {
				addDialogActionButtons(detailedInfo);
			}
		}
		
		// Add the review section
		addReviewSection(dialog.source === 'history');
		
		// Update rating buttons visibility
		updateRatingButtons();
	}
});

document.addEventListener('switchedToDetailsTab', (event) => {
	const dialog = event.detail;
	
	if (dialog) {
		// Update element classifications display
		displayDetectedElements(dialog);
		
		// Update rating buttons visibility
		updateRatingButtons();
	}
});

// Also listen for tab activation
chrome.tabs.onActivated.addListener(() => {
	setTimeout(() => {
		const container = document.getElementById('cookieDetectionContainer');
		if (container) {
			updateCookieDetectionStatus();
		}
	}, 100);
});
