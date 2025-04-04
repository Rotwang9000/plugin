document.addEventListener('DOMContentLoaded', () => {
	// Add CSS for the button-type-list class
	const style = document.createElement('style');
	style.textContent = `
		.button-type-list {
			margin-bottom: 5px;
			font-size: 12px;
			color: #666;
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
	`;
	document.head.appendChild(style);
	
	// Settings tab elements
	const enabledToggle = document.getElementById('enabled');
	const autoAcceptToggle = document.getElementById('autoAccept');
	const smartModeToggle = document.getElementById('smartMode');
	const cloudModeToggle = document.getElementById('cloudMode');
	const privacyModeToggle = document.getElementById('privacyMode');
	const gdprComplianceToggle = document.getElementById('gdprCompliance');
	const statusElement = document.getElementById('status');
	const dataCollectionConsentStatus = document.getElementById('dataCollectionConsentStatus');
	const dataCollectionConsentBtn = document.getElementById('dataCollectionConsentBtn');
	
	// Review tab elements
	const dialogCount = document.getElementById('dialogCount');
	
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
	
	// Tab switching
	tabs.forEach(tab => {
		tab.addEventListener('click', () => {
			const tabName = tab.getAttribute('data-tab');
			
			// Remove active class from all tabs
			tabs.forEach(t => t.classList.remove('active'));
			tabContents.forEach(tc => tc.classList.remove('active'));
			
			// Add active class to current tab
			tab.classList.add('active');
			document.getElementById(`${tabName}-tab`).classList.add('active');
			
			// Special handling for review tab
			if (tabName === 'review') {
				loadAllDialogs();
			}
			
			// If details tab is selected but no dialog is selected, show the no selection message
			if (tabName === 'details') {
				if (!currentDialog) {
					dialogDetailContainer.style.display = 'none';
					noSelectionMessage.style.display = 'block';
				} else {
					dialogDetailContainer.style.display = 'block';
					noSelectionMessage.style.display = 'none';
				}
			}
		});
	});

	// Load saved settings with localStorage fallback
	function loadSettings() {
		chrome.storage.sync.get({
			enabled: true,
			autoAccept: true,
			smartMode: true,
			cloudMode: false,
			privacyMode: false,
			gdprCompliance: false
		}, (settings) => {
			enabledToggle.checked = settings.enabled;
			autoAcceptToggle.checked = settings.autoAccept;
			smartModeToggle.checked = settings.smartMode;
			cloudModeToggle.checked = settings.cloudMode;
			privacyModeToggle.checked = settings.privacyMode;
			gdprComplianceToggle.checked = settings.gdprCompliance;
			updateStatus(settings);
		}).catch(error => {
			console.log('Error loading settings from Chrome storage, falling back to localStorage', error);
			try {
				const savedSettings = localStorage.getItem('ccm_settings');
				if (savedSettings) {
					const settings = JSON.parse(savedSettings);
					enabledToggle.checked = settings.enabled;
					autoAcceptToggle.checked = settings.autoAccept;
					smartModeToggle.checked = settings.smartMode;
					cloudModeToggle.checked = settings.cloudMode;
					privacyModeToggle.checked = settings.privacyMode;
					gdprComplianceToggle.checked = settings.gdprCompliance;
					updateStatus(settings);
					console.log('Loaded settings from localStorage fallback');
				} else {
					// Use defaults if nothing in localStorage
					enabledToggle.checked = true;
					autoAcceptToggle.checked = true;
					smartModeToggle.checked = true;
					cloudModeToggle.checked = false;
					privacyModeToggle.checked = false;
					gdprComplianceToggle.checked = false;
					updateStatus({
						enabled: true,
						autoAccept: true,
						smartMode: true,
						cloudMode: false,
						privacyMode: false,
						gdprCompliance: false
					});
					console.log('Using default settings (no localStorage fallback found)');
				}
			} catch (e) {
				console.error('Error parsing localStorage settings', e);
				// Use defaults in case of any error
				enabledToggle.checked = true;
				autoAcceptToggle.checked = true;
				smartModeToggle.checked = true;
				cloudModeToggle.checked = false;
				privacyModeToggle.checked = false;
				gdprComplianceToggle.checked = false;
				updateStatus({
					enabled: true,
					autoAccept: true,
					smartMode: true,
					cloudMode: false,
					privacyMode: false,
					gdprCompliance: false
				});
			}
		});
	}
	
	// Call loadSettings function instead of inline Chrome storage call
	loadSettings();

	// Check data collection consent status
	checkDataCollectionConsent();
	
	// Clear notification badge when popup is opened
	clearBadgeCount();

	// Save settings with localStorage fallback
	function saveSettings() {
		const settings = {
			enabled: enabledToggle.checked,
			autoAccept: autoAcceptToggle.checked,
			smartMode: smartModeToggle.checked,
			cloudMode: cloudModeToggle.checked,
			privacyMode: privacyModeToggle.checked,
			gdprCompliance: gdprComplianceToggle.checked
		};
		
		// First try to save to Chrome storage
		chrome.storage.sync.set(settings, () => {
			updateStatus(settings);
			
			// Also save to localStorage as backup
			try {
				localStorage.setItem('ccm_settings', JSON.stringify(settings));
			} catch (e) {
				console.error('Error saving settings to localStorage', e);
			}
			
			// Notify background script of settings change
			chrome.runtime.sendMessage({ 
				action: 'settingsUpdated', 
				settings: settings 
			});
		}).catch(error => {
			// If Chrome storage fails, save to localStorage only
			console.error('Error saving to Chrome storage, using localStorage only', error);
			try {
				localStorage.setItem('ccm_settings', JSON.stringify(settings));
				updateStatus(settings);
			} catch (e) {
				console.error('Error saving settings to localStorage', e);
			}
		});
	}

	// Save settings when changed
	enabledToggle.addEventListener('change', saveSettings);
	autoAcceptToggle.addEventListener('change', saveSettings);
	smartModeToggle.addEventListener('change', saveSettings);

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
Cookie Consent Manager would like to collect anonymised data about cookie consent banners to improve detection.

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
		let statusText = 'Status: ';
		
		if (!settings.enabled) {
			statusText += 'Extension disabled';
		} else if (settings.smartMode && settings.cloudMode) {
			statusText += 'Smart & Cloud modes active';
			if (!settings.autoAccept) {
				statusText += ' (capture only)';
			}
			if (settings.privacyMode) {
				statusText += ' with privacy protection';
			}
			if (settings.gdprCompliance) {
				statusText += ', GDPR compliant';
			}
		} else if (settings.smartMode) {
			statusText += 'Smart mode active';
			if (!settings.autoAccept) {
				statusText += ' (capture only)';
			}
			if (settings.privacyMode) {
				statusText += ' with privacy protection';
			}
			if (settings.gdprCompliance) {
				statusText += ', GDPR compliant';
			}
		} else if (settings.cloudMode) {
			statusText += 'Cloud mode active';
			if (!settings.autoAccept) {
				statusText += ' (capture only)';
			}
			if (settings.privacyMode) {
				statusText += ' with privacy protection';
			}
			if (settings.gdprCompliance) {
				statusText += ', GDPR compliant';
			}
		} else {
			statusText += 'No active modes selected';
		}
		
		statusElement.textContent = statusText;
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
			
			// If no history from Chrome storage, try localStorage
			if (!historyDialogs || historyDialogs.length === 0) {
				try {
					const savedHistory = localStorage.getItem('ccm_history');
					if (savedHistory) {
						const localData = JSON.parse(savedHistory);
						if (localData.dialogHistory && Array.isArray(localData.dialogHistory)) {
							historyDialogs = localData.dialogHistory;
							console.log('Loaded dialog history from localStorage fallback');
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
			
			// Apply filter if needed
			if (filterType !== 'all') {
				allDialogs = allDialogs.filter(dialog => dialog.buttonType === filterType);
			}
			
			// Sort by most recent first
			allDialogs.sort((a, b) => {
				return new Date(b.capturedAt) - new Date(a.capturedAt);
			});
			
			// Update the dialog count (only for unreviewed items)
			const unreviewedCount = allDialogs.filter(d => !d.reviewed).length;
			dialogCount.textContent = unreviewedCount;
			dialogCount.style.display = unreviewedCount > 0 ? 'inline-block' : 'none';
			
			// Display the list
			displayAllDialogs(allDialogs);
		}).catch(error => {
			console.error('Error getting dialog history from Chrome runtime, using localStorage fallback', error);
			
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
						
						// Apply filter if needed
						if (filterType !== 'all') {
							allDialogs = allDialogs.filter(dialog => dialog.buttonType === filterType);
						}
						
						// Sort by most recent first
						allDialogs.sort((a, b) => {
							return new Date(b.capturedAt) - new Date(a.capturedAt);
						});
						
						// Update the dialog count (only for unreviewed items)
						const unreviewedCount = allDialogs.filter(d => !d.reviewed).length;
						dialogCount.textContent = unreviewedCount;
						dialogCount.style.display = unreviewedCount > 0 ? 'inline-block' : 'none';
						
						// Display the list
						displayAllDialogs(allDialogs);
						console.log('Loaded dialog history from localStorage fallback');
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
	
	function displayAllDialogs(dialogs) {
		// Clear the dialogs list
		dialogsListElement.innerHTML = '';
		
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
		
		// Create list items for each dialog
		dialogs.forEach(dialog => {
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
				// Remove active class from all items
				dialogsListElement.querySelectorAll('.dialog-item, .history-item').forEach(el => 
					el.classList.remove('active'));
				
				// Add active class to clicked item
				item.classList.add('active');
				
				// Display the dialog in the details tab
				loadDialogDetails(dialog, dialog.source === 'history');
				
				// Switch to the details tab
				tabs.forEach(t => t.classList.remove('active'));
				tabContents.forEach(tc => tc.classList.remove('active'));
				
				const detailsTab = document.querySelector('.tab[data-tab="details"]');
				if (detailsTab) {
					detailsTab.classList.add('active');
					document.getElementById('details-tab').classList.add('active');
				}
			});
			
			dialogsListElement.appendChild(item);
		});
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
	
	function loadDialogDetails(dialog, isHistory = false) {
		// Store the current dialog
		currentDialog = dialog;
		currentDialogId = dialog.id;
		
		// Show the detail container and hide the no selection message
		dialogDetailContainer.style.display = 'block';
		noSelectionMessage.style.display = 'none';
		
		// Format button type for display
		let buttonTypeText = getButtonTypeDisplayText(dialog);
		
		// Display detected elements instead of preview
		displayDetectedElements(dialog);
		
		// Render the detailed information
		renderDetailedInfo(dialog);
		
		// Update submission status text
		if (isHistory) {
			// Hide rating buttons if it's history
			goodMatchBtn.style.display = 'none';
			badMatchBtn.style.display = 'none';
			submissionStatus.textContent = 'Historical record - no action needed';
		} else {
			goodMatchBtn.style.display = 'block';
			badMatchBtn.style.display = 'block';
			submissionStatus.textContent = 'Rate this match or adjust classifications and submit';
		}
	}
	
	// New function to display detected elements with classification dropdowns
	function displayDetectedElements(dialog) {
		const detectedElementsList = document.getElementById('detectedElementsList');
		detectedElementsList.innerHTML = '';
		
		try {
			// Create a temporary div to parse the HTML
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = dialog.html;
			
			// Extract all potential buttons
			const buttons = tempDiv.querySelectorAll('button, a[role="button"], [type="button"], [type="submit"], input[type="submit"], [class*="button"], [class*="btn"]');
			
			if (buttons.length === 0) {
				detectedElementsList.innerHTML = '<p>No interactive elements found in this dialog</p>';
				return;
			}
			
			// Button type options for the dropdown
			const buttonTypeOptions = [
				{ value: 'accept_all', text: 'Accept All' },
				{ value: 'essential_only', text: 'Essential Only' },
				{ value: 'necessary_only', text: 'Necessary Only' },
				{ value: 'customise', text: 'Customise' },
				{ value: 'decline', text: 'Decline' },
				{ value: 'other', text: 'Other' },
				{ value: 'bad_match', text: 'Bad Match' }
			];
			
			// Create element row for each button found
			buttons.forEach((button, index) => {
				if (!button.textContent.trim() && !button.value) return; // Skip buttons with no text or value
				
				const buttonText = button.textContent.trim() || button.value || 'Button ' + (index + 1);
				const elementRow = document.createElement('div');
				elementRow.className = 'element-row';
				
				// Element text
				const elementText = document.createElement('div');
				elementText.className = 'element-text';
				elementText.textContent = buttonText.substring(0, 60);
				
				// Element type selection
				const elementTypeSelect = document.createElement('select');
				elementTypeSelect.className = 'element-type-select';
				elementTypeSelect.dataset.buttonIndex = index;
				
				// Add options to select
				buttonTypeOptions.forEach(option => {
					const optionEl = document.createElement('option');
					optionEl.value = option.value;
					optionEl.textContent = option.text;
					elementTypeSelect.appendChild(optionEl);
				});
				
				// Pre-select option based on text content (basic heuristic)
				const buttonTextLower = buttonText.toLowerCase();
				if (buttonTextLower.includes('accept') || buttonTextLower.includes('agree') || buttonTextLower.includes('allow')) {
					elementTypeSelect.value = 'accept_all';
				} else if (buttonTextLower.includes('necessary') || buttonTextLower.includes('essential')) {
					elementTypeSelect.value = 'necessary_only';
				} else if (buttonTextLower.includes('decline') || buttonTextLower.includes('reject')) {
					elementTypeSelect.value = 'decline';
				} else if (buttonTextLower.includes('settings') || buttonTextLower.includes('preferences') || buttonTextLower.includes('customise')) {
					elementTypeSelect.value = 'customise';
				} else {
					elementTypeSelect.value = 'other';
				}
				
				// Handle selection changes
				elementTypeSelect.addEventListener('change', () => {
					// If user changes any classification, change badMatchBtn to "Submit"
					const badMatchBtn = document.getElementById('badMatchBtn');
					const goodMatchBtn = document.getElementById('goodMatchBtn');
					
					badMatchBtn.textContent = 'Submit Changes';
					goodMatchBtn.style.display = 'none';
				});
				
				// Add elements to row
				elementRow.appendChild(elementText);
				elementRow.appendChild(elementTypeSelect);
				detectedElementsList.appendChild(elementRow);
			});
			
			// Also look for checkboxes (for options)
			const checkboxes = tempDiv.querySelectorAll('input[type="checkbox"]');
			if (checkboxes.length > 0) {
				// Add section title for checkboxes
				const checkboxTitle = document.createElement('h4');
				checkboxTitle.textContent = 'Options';
				checkboxTitle.style.marginTop = '15px';
				detectedElementsList.appendChild(checkboxTitle);
				
				// Option type options for dropdown
				const optionTypeOptions = [
					{ value: 'essential', text: 'Essential' },
					{ value: 'analytics', text: 'Analytics' },
					{ value: 'marketing', text: 'Marketing' },
					{ value: 'preferences', text: 'Preferences' },
					{ value: 'privacy', text: 'Privacy' },
					{ value: 'other', text: 'Other' },
					{ value: 'bad_match', text: 'Bad Match' }
				];
				
				// Create element row for each checkbox
				checkboxes.forEach((checkbox, index) => {
					// Try to find associated label
					let labelText = '';
					if (checkbox.id) {
						const label = tempDiv.querySelector(`label[for="${checkbox.id}"]`);
						if (label) labelText = label.textContent.trim();
					}
					
					// If no explicit label, check parent
					if (!labelText && checkbox.parentElement) {
						if (checkbox.parentElement.tagName === 'LABEL') {
							labelText = checkbox.parentElement.textContent.trim();
						} else {
							labelText = checkbox.parentElement.textContent.trim().substring(0, 60);
						}
					}
					
					if (!labelText) labelText = `Option ${index + 1}`;
					
					const elementRow = document.createElement('div');
					elementRow.className = 'element-row';
					
					// Element text
					const elementText = document.createElement('div');
					elementText.className = 'element-text';
					elementText.textContent = labelText.substring(0, 60);
					
					// Element type selection
					const elementTypeSelect = document.createElement('select');
					elementTypeSelect.className = 'element-type-select';
					elementTypeSelect.dataset.optionIndex = index;
					
					// Add options to select
					optionTypeOptions.forEach(option => {
						const optionEl = document.createElement('option');
						optionEl.value = option.value;
						optionEl.textContent = option.text;
						elementTypeSelect.appendChild(optionEl);
					});
					
					// Pre-select option based on text content
					const textLower = labelText.toLowerCase();
					if (textLower.includes('necessary') || textLower.includes('essential') || textLower.includes('required')) {
						elementTypeSelect.value = 'essential';
					} else if (textLower.includes('analytic') || textLower.includes('statistic') || textLower.includes('measure')) {
						elementTypeSelect.value = 'analytics';
					} else if (textLower.includes('marketing') || textLower.includes('advertis') || textLower.includes('target')) {
						elementTypeSelect.value = 'marketing';
					} else if (textLower.includes('preference') || textLower.includes('functional') || textLower.includes('feature')) {
						elementTypeSelect.value = 'preferences';
					} else if (textLower.includes('privacy') || textLower.includes('personal') || textLower.includes('data')) {
						elementTypeSelect.value = 'privacy';
					} else {
						elementTypeSelect.value = 'other';
					}
					
					// Handle selection changes
					elementTypeSelect.addEventListener('change', () => {
						// If user changes any classification, change badMatchBtn to "Submit"
						const badMatchBtn = document.getElementById('badMatchBtn');
						const goodMatchBtn = document.getElementById('goodMatchBtn');
						
						badMatchBtn.textContent = 'Submit Changes';
						goodMatchBtn.style.display = 'none';
					});
					
					// Add elements to row
					elementRow.appendChild(elementText);
					elementRow.appendChild(elementTypeSelect);
					detectedElementsList.appendChild(elementRow);
				});
			}
		} catch (error) {
			console.error('Error displaying detected elements:', error);
			detectedElementsList.innerHTML = '<p>Error analyzing dialog elements</p>';
		}
	}

	function submitRating(dialogId, rating, isGoodMatch) {
		// Collect the classifications from dropdowns
		const elementClassifications = [];
		const detectedElementsList = document.getElementById('detectedElementsList');
		
		// Get all button classifications
		const buttonRows = detectedElementsList.querySelectorAll('.element-row');
		buttonRows.forEach(row => {
			const elementText = row.querySelector('.element-text').textContent;
			const elementTypeSelect = row.querySelector('.element-type-select');
			
			if (elementTypeSelect) {
				const classification = {
					text: elementText,
					type: elementTypeSelect.value,
					isBadMatch: elementTypeSelect.value === 'bad_match'
				};
				
				// Add whether it's a button or option
				if (elementTypeSelect.dataset.buttonIndex) {
					classification.elementType = 'button';
					classification.index = elementTypeSelect.dataset.buttonIndex;
				} else if (elementTypeSelect.dataset.optionIndex) {
					classification.elementType = 'option';
					classification.index = elementTypeSelect.dataset.optionIndex;
				}
				
				elementClassifications.push(classification);
			}
		});
		
		// Send to content script first for sanitization
		chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
			if (tabs[0]) {
				// First send to content script to sanitize
				chrome.tabs.sendMessage(tabs[0].id, {
					action: 'submitRating',
					data: { 
						dialogId, 
						rating, 
						isGoodMatch,
						elementClassifications
					}
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
							data: { 
								dialogId, 
								rating, 
								isGoodMatch,
								elementClassifications
							} 
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
					data: { 
						dialogId, 
						rating, 
						isGoodMatch,
						elementClassifications
					} 
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

	// Function to render the detailed info tab
	function renderDetailedInfo(dialog) {
		if (!detailedInfoElement || !dialog) return;
		
		const date = new Date(dialog.capturedAt);
		const buttonTypeText = getButtonTypeDisplayText(dialog);
		
		// Extract links from the dialog HTML
		const links = extractLinksFromHtml(dialog.html);
		
		// Clean up the URL for display
		const displayUrl = dialog.url && dialog.url.length > 50 
			? dialog.url.substring(0, 47) + '...' 
			: dialog.url || 'Not available';
		
		detailedInfoElement.innerHTML = `
			<div class="detail-section">
				<div class="detail-item"><strong>Domain:</strong> ${dialog.domain}</div>
				<div class="detail-item"><strong>URL:</strong> <a href="${dialog.url}" target="_blank">${displayUrl}</a></div>
				<div class="detail-item"><strong>Button Type:</strong> ${buttonTypeText}</div>
				<div class="detail-item"><strong>Button Text:</strong> "${dialog.buttonText || 'Not available'}"</div>
				<div class="detail-item"><strong>Method:</strong> ${dialog.method}</div>
				<div class="detail-item"><strong>Region:</strong> ${dialog.region || 'Not detected'}</div>
				<div class="detail-item"><strong>Captured:</strong> ${date.toLocaleString()}</div>
				<div class="detail-item"><strong>Reviewed:</strong> ${dialog.reviewed ? 'Yes' : 'No'}</div>
			</div>
			
			${links.length > 0 ? `
				<div class="detail-section links-section">
					<h4>Links Found (${links.length})</h4>
					${links.map(link => {
						// Clean up the link text for display
						const displayText = link.text 
							? (link.text.length > 40 ? link.text.substring(0, 37) + '...' : link.text)
							: (link.href.length > 40 ? link.href.substring(0, 37) + '...' : link.href);
						
						return `
							<div class="link-item">
								<a href="${link.href}" target="_blank">${displayText}</a>
							</div>
						`;
					}).join('')}
				</div>
			` : ''}
		`;
	}
	
	// Helper function to extract links from HTML
	function extractLinksFromHtml(html) {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		const linkElements = doc.querySelectorAll('a[href]');
		
		const links = [];
		linkElements.forEach(link => {
			// Skip empty or javascript links
			const href = link.getAttribute('href');
			if (!href || href === '#' || href.startsWith('javascript:')) return;
			
			// Convert relative links to absolute if possible
			let absoluteHref = href;
			if (href.startsWith('/')) {
				try {
					// Try to resolve relative URLs
					const currentUrl = window.location.origin;
					absoluteHref = new URL(href, currentUrl).href;
				} catch (e) {
					// Keep original if can't resolve
					absoluteHref = href;
				}
			}
			
			// Add to links array
			links.push({
				href: absoluteHref,
				text: link.textContent.trim()
			});
		});
		
		return links;
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
	
	if (viewSourceBtn) {
		viewSourceBtn.addEventListener('click', () => {
			if (currentDialog && currentDialog.html) {
				const sourceWindow = window.open('', '_blank');
				sourceWindow.document.write(`
					<html>
						<head>
							<title>Cookie Dialog Source</title>
							<style>
								body { font-family: monospace; white-space: pre-wrap; padding: 20px; }
							</style>
						</head>
						<body>${escapeHtml(currentDialog.html)}</body>
					</html>
				`);
			}
		});
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
}); 