document.addEventListener('DOMContentLoaded', () => {
	// Add CSS for the button-type-list class
	const style = document.createElement('style');
	style.textContent = `
		.button-type-list {
			font-size: 12px;
			color: #6200ea;
			margin-top: 2px;
			font-weight: bold;
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
	
	// Review tab elements
	const dialogsListElement = document.getElementById('dialogsList');
	const dialogCount = document.getElementById('dialogCount');
	const historyFilter = document.getElementById('historyFilter');
	const clearHistoryBtn = document.getElementById('clearHistoryBtn');
	
	// Details tab elements
	const dialogDetailContainer = document.getElementById('dialogDetailContainer');
	const noSelectionMessage = document.getElementById('noSelectionMessage');
	const dialogFrame = document.getElementById('dialogFrame');
	const buttonDisplayContainer = document.querySelector('.button-display-container');
	const goodMatchBtn = document.getElementById('goodMatchBtn');
	const badMatchBtn = document.getElementById('badMatchBtn');
	const submissionStatus = document.getElementById('submissionStatus');
	const detailedInfoElement = document.getElementById('detailedInfo');
	const copyLinkBtn = document.getElementById('copyLinkBtn');
	const viewSourceBtn = document.getElementById('viewSourceBtn'); 
	const exportBtn = document.getElementById('exportBtn');

	// Consent elements
	const dataCollectionConsentBtn = document.getElementById('dataCollectionConsentBtn');
	const dataCollectionConsentStatus = document.getElementById('dataCollectionConsentStatus');
	
	// Current dialog being displayed
	let currentDialog = null;
	let currentDialogId = null;
	
	// Tab switching
	const tabs = document.querySelectorAll('.tab');
	const tabContents = document.querySelectorAll('.tab-content');
	
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
	
	tabs.forEach(tab => {
		tab.addEventListener('click', () => {
			// Deactivate all tabs
			tabs.forEach(t => t.classList.remove('active'));
			tabContents.forEach(tc => tc.classList.remove('active'));
			
			// Activate selected tab
			tab.classList.add('active');
			document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
			
			// If review tab is selected, load all dialogs
			if (tab.dataset.tab === 'review') {
				loadAllDialogs();
			}
			
			// If details tab is selected but no dialog is selected, show the no selection message
			if (tab.dataset.tab === 'details') {
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

	// Load saved settings
	chrome.storage.sync.get({
		enabled: true,
		autoAccept: true,
		smartMode: true,
		cloudMode: true,
		privacyMode: true,
		gdprCompliance: true
	}, (settings) => {
		enabledToggle.checked = settings.enabled;
		autoAcceptToggle.checked = settings.autoAccept;
		smartModeToggle.checked = settings.smartMode;
		cloudModeToggle.checked = settings.cloudMode;
		privacyModeToggle.checked = settings.privacyMode;
		gdprComplianceToggle.checked = settings.gdprCompliance;
		updateStatus(settings);
	});

	// Check data collection consent status
	checkDataCollectionConsent();
	
	// Clear notification badge when popup is opened
	clearBadgeCount();

	// Save settings when changed
	enabledToggle.addEventListener('change', saveSettings);
	autoAcceptToggle.addEventListener('change', saveSettings);
	smartModeToggle.addEventListener('change', saveSettings);
	cloudModeToggle.addEventListener('change', saveSettings);
	privacyModeToggle.addEventListener('change', saveSettings);
	gdprComplianceToggle.addEventListener('change', saveSettings);

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

	// Ask for permission to collect data on first run
	chrome.storage.local.get('initialPermissionAsked', (result) => {
		if (!result.initialPermissionAsked) {
			// Ask user for permission to collect cookie banner data with UK/GDPR-compliant language
			showConsentDialog();
		}
	});

	// Dialog rating buttons
	goodMatchBtn.addEventListener('click', () => {
		if (currentDialogId) {
			submitRating(currentDialogId, 5, true);
		}
	});
	
	badMatchBtn.addEventListener('click', () => {
		if (currentDialogId) {
			submitRating(currentDialogId, 1, false);
		}
	});
	
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

	function saveSettings() {
		const settings = {
			enabled: enabledToggle.checked,
			autoAccept: autoAcceptToggle.checked,
			smartMode: smartModeToggle.checked,
			cloudMode: cloudModeToggle.checked,
			privacyMode: privacyModeToggle.checked,
			gdprCompliance: gdprComplianceToggle.checked
		};
		
		chrome.storage.sync.set(settings, () => {
			updateStatus(settings);
			
			// Notify background script of settings change
			chrome.runtime.sendMessage({ 
				action: 'settingsUpdated', 
				settings: settings 
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
		const consentMessage = `
Cookie Consent Manager would like to collect anonymised data about cookie consent banners to improve detection.

This helps make the tool more effective for everyone. All personal information will be redacted before storage or transmission.

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
	
	// Load all dialogs (captured and history combined)
	function loadAllDialogs(filterType = 'all') {
		// Check data collection consent first
		chrome.runtime.sendMessage({ action: 'getDataCollectionConsent' }, (response) => {
			if (!response || !response.consent) {
				dialogsListElement.innerHTML = `
					<div class="no-dialogs">
						<p>Data collection consent not granted</p>
						<p>To view dialog history, you must grant consent for data collection</p>
						<button id="historyGrantConsentBtn" class="grant-consent">Grant Consent</button>
					</div>
				`;
				
				const grantConsentBtn = document.getElementById('historyGrantConsentBtn');
				if (grantConsentBtn) {
					grantConsentBtn.addEventListener('click', () => {
						chrome.runtime.sendMessage({ 
							action: 'setDataCollectionConsent', 
							consent: true 
						}, () => {
							checkDataCollectionConsent();
							loadAllDialogs();
						});
					});
				}
				
				return;
			}
			
			// Get only dialog history - a unified list instead of separate capturedDialogs and history
			chrome.runtime.sendMessage({ action: 'getDialogHistory' }, (historyResponse) => {
				const historyDialogs = historyResponse.history || [];
				
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
			});
		});
	}
	
	function displayAllDialogs(dialogs) {
		const dialogsListElement = document.getElementById('dialogsList');
		dialogsListElement.innerHTML = '';
		
		if (dialogs.length === 0) {
			dialogsListElement.innerHTML = '<div class="no-dialogs">No cookie dialogs available</div>';
			return;
		}
		
		// Remove any existing active classes from items
		const existingActiveItems = dialogsListElement.querySelectorAll('.active');
		existingActiveItems.forEach(item => item.classList.remove('active'));
		
		dialogs.forEach((dialog, index) => {
			// Get button type display text
			let buttonTypeText = getButtonTypeDisplayText(dialog);
			
			// Create dialog item
			const item = document.createElement('div');
			item.className = dialog.source === 'history' ? 
				`history-item ${dialog.reviewed ? 'reviewed' : 'not-reviewed'}` : 
				'dialog-item';
			
			// Store the dialog data for easy access
			item.dataset.dialogId = dialog.id;
			item.dataset.index = index;
			
			const date = new Date(dialog.capturedAt);
			const formattedDate = `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
			
			item.innerHTML = `
				<div class="domain">${dialog.domain}</div>
				<div class="button-type-list">Button: ${buttonTypeText}</div>
				<div class="method">Method: ${dialog.method}</div>
				<div class="date">Captured: ${formattedDate}</div>
				${dialog.region ? `<div class="region">Region: ${dialog.region}</div>` : ''}
				${dialog.buttonText ? `<div class="button-text" style="font-size: 11px; color: #666; margin-top: 2px;">"${dialog.buttonText}"</div>` : ''}
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
			
			// Don't auto-select items anymore since we now have a dedicated details tab
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
		
		// Create an improved HTML blob for the iframe with better styling
		const blob = new Blob([`
			<html>
				<head>
					<style>
						body {
							font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
							padding: 15px;
							margin: 0;
							color: #333;
							line-height: 1.5;
						}
						
						h2 {
							margin-top: 0;
							color: #673AB7;
							border-bottom: 1px solid #eee;
							padding-bottom: 8px;
						}
						
						.dialog-info {
							margin-bottom: 20px;
							padding: 15px;
							background-color: #f7f7f7;
							border-radius: 6px;
							box-shadow: 0 1px 3px rgba(0,0,0,0.05);
						}
						
						.dialog-info > div {
							margin: 5px 0;
						}
						
						.domain-info {
							font-weight: bold;
							color: #444;
						}
						
						.selector {
							font-family: monospace;
							background-color: #f0f0f0;
							padding: 3px 6px;
							border-radius: 3px;
							display: inline-block;
							font-size: 12px;
						}
						
						.button-type {
							color: #673AB7;
							font-weight: bold;
						}
						
						.original-dialog-wrapper {
							border: 1px solid #ddd;
							border-radius: 6px;
							padding: 15px;
							background-color: #fff;
							box-shadow: 0 1px 3px rgba(0,0,0,0.05);
							overflow: auto;
							position: relative;
						}
						
						.original-dialog {
							margin-top: 5px;
							display: block;
						}
						
						a {
							color: #2196F3;
							text-decoration: none;
						}
						
						a:hover {
							text-decoration: underline;
						}
						
						.preview-heading {
							display: flex;
							justify-content: space-between;
							align-items: center;
						}
						
						.label {
							display: inline-block;
							font-size: 12px;
							border-radius: 3px;
							padding: 2px 6px;
							margin-left: 5px;
						}
						
						.label-reviewed {
							background-color: #e8f5e9;
							color: #2e7d32;
						}
						
						.label-unreviewed {
							background-color: #fff8e1;
							color: #f57f17;
						}
						
						/* Specific styling for BBC cookie dialogs */
						div.bbccookies-banner {
							border: 1px solid #0068ff;
							background-color: #f2f8ff;
							padding: 10px;
							margin: 5px 0;
							border-radius: 4px;
						}
						
						.bbccookies-banner button {
							border: 1px solid #0068ff;
							padding: 5px 10px;
							margin: 5px;
							background-color: #fff;
							border-radius: 3px;
							cursor: pointer;
						}
						
						.bbccookies-banner button.continue-button {
							background-color: #0068ff;
							color: white;
						}
						
						/* Amazon style cookie forms */
						form#sp-cc {
							border: 1px solid #ddd;
							padding: 15px;
							font-family: Arial, sans-serif;
						}
						
						.a-button {
							display: inline-block;
							margin: 5px;
						}
						
						.a-button-primary {
							background-color: #ffd814;
							border-color: #fcd200;
						}
					</style>
				</head>
				<body>
					<div class="preview-heading">
						<h2>Cookie Dialog Preview</h2>
						<span class="label ${dialog.reviewed ? 'label-reviewed' : 'label-unreviewed'}">
							${dialog.reviewed ? 'Reviewed' : 'Not Reviewed'}
						</span>
					</div>
					<div class="dialog-info">
						<div class="domain-info">Domain: ${dialog.domain}</div>
						<div class="selector">Selector: ${dialog.selector}</div>
						<div class="button-type">Button Type: ${buttonTypeText}</div>
						${dialog.buttonText ? `<div class="button-text">Button Text: "${dialog.buttonText}"</div>` : ''}
						${dialog.region ? `<div class="region-info">Region: ${dialog.region}</div>` : ''}
						<div class="date-info">Captured: ${new Date(dialog.capturedAt).toLocaleString()}</div>
						${dialog.url ? `<div class="url-info">URL: <a href="${dialog.url}" target="_blank">${dialog.url}</a></div>` : ''}
					</div>
					<h3>Original Dialog</h3>
					<div class="original-dialog-wrapper">
						<div class="original-dialog">${dialog.html}</div>
					</div>
				</body>
			</html>
		`], { type: 'text/html' });
		
		const blobUrl = URL.createObjectURL(blob);
		dialogFrame.src = blobUrl;
		
		// Extract and display buttons from dialog HTML
		displayDialogButtons(dialog);
		
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
			submissionStatus.textContent = 'Rate this match to submit to the cloud database';
		}
	}
	
	function displayDialogButtons(dialog) {
		buttonDisplayContainer.innerHTML = '';
		
		try {
			// Create a temporary div to parse the HTML
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = dialog.html;
			
			// Extract all potential buttons
			const buttons = tempDiv.querySelectorAll('button, a[role="button"], [type="button"], [type="submit"], input[type="submit"], [class*="button"], [class*="btn"]');
			
			if (buttons.length === 0) {
				buttonDisplayContainer.innerHTML = '<p>No buttons found in this dialog</p>';
				return;
			}
			
			// Create a button element for each button found
			buttons.forEach((button, index) => {
				if (!button.textContent.trim() && !button.value) return; // Skip buttons with no text or value
				
				const buttonText = button.textContent.trim() || button.value || 'Button ' + (index + 1);
				const buttonEl = document.createElement('button');
				buttonEl.className = 'cookie-button';
				buttonEl.textContent = buttonText.substring(0, 30);
				
				// Add class based on button text content
				const buttonTextLower = buttonText.toLowerCase();
				if (buttonTextLower.includes('accept') || buttonTextLower.includes('agree') || buttonTextLower.includes('allow')) {
					buttonEl.classList.add('accept');
				} else if (buttonTextLower.includes('necessary') || buttonTextLower.includes('essential')) {
					buttonEl.classList.add('necessary');
				} else if (buttonTextLower.includes('decline') || buttonTextLower.includes('reject')) {
					buttonEl.classList.add('decline');
				} else if (buttonTextLower.includes('settings') || buttonTextLower.includes('preferences') || buttonTextLower.includes('customise')) {
					buttonEl.classList.add('customise');
				}
				
				// Store button ID if it has one
				const originalId = button.id || '';
				
				// Create a button that actually works when clicked
				buttonEl.addEventListener('click', () => {
					try {
						// Get the iframe document
						const iframe = document.getElementById('dialogFrame');
						const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
						
						// Find all buttons in the iframe
						const iframeButtons = iframeDoc.querySelectorAll('button, a[role="button"], [type="button"], [type="submit"], input[type="submit"], [class*="button"], [class*="btn"]');
						
						// Try to find a matching button by text content
						let found = false;
						for (const iframeButton of iframeButtons) {
							const iframeButtonText = iframeButton.textContent.trim() || iframeButton.value || '';
							if (iframeButtonText === buttonText || 
								(originalId && iframeButton.id === originalId)) {
								// Visual feedback for the button click
								iframeButton.style.outline = '2px solid #4CAF50';
								iframeButton.style.boxShadow = '0 0 5px #4CAF50';
								found = true;
								
								// Try to send message to content script to click the real button on the page
								chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
									if (tabs && tabs[0]) {
										// Only try to execute on tabs with matching URL
										if (dialog.url) {
											try {
												const dialogUrl = new URL(dialog.url);
												const tabUrl = new URL(tabs[0].url);
												
												if (dialogUrl.hostname === tabUrl.hostname) {
													// First try to find by ID if available
													if (originalId) {
														chrome.tabs.sendMessage(
															tabs[0].id,
															{
																action: 'simulateButtonClick',
																buttonText: buttonText,
																selector: `#${originalId}`
															},
															function(response) {
																console.log('Button click response:', response);
															}
														);
													} else {
														// Otherwise try using the container selector and button text
														chrome.tabs.sendMessage(
															tabs[0].id,
															{
																action: 'simulateButtonClick',
																buttonText: buttonText,
																selector: dialog.selector
															},
															function(response) {
																console.log('Button click response:', response);
															}
														);
													}
												} else {
													buttonEl.textContent = 'Page mismatch';
													setTimeout(() => {
														buttonEl.textContent = buttonText.substring(0, 30);
													}, 2000);
												}
											} catch (urlError) {
												console.error('URL parsing error:', urlError);
											}
										}
									}
								});
								
								// Reset visual feedback after a short delay
								setTimeout(() => {
									iframeButton.style.outline = '';
									iframeButton.style.boxShadow = '';
								}, 1000);
								
								break;
							}
						}
						
						if (!found) {
							// If no exact match found, highlight the first button as a fallback
							if (iframeButtons.length > 0) {
								iframeButtons[0].style.outline = '2px solid #FFC107';
								iframeButtons[0].style.boxShadow = '0 0 5px #FFC107';
								
								setTimeout(() => {
									iframeButtons[0].style.outline = '';
									iframeButtons[0].style.boxShadow = '';
								}, 1000);
								
								buttonEl.textContent = 'Element not found';
								setTimeout(() => {
									buttonEl.textContent = buttonText.substring(0, 30);
								}, 2000);
							}
						}
					} catch (error) {
						console.error('Error handling button click:', error);
						buttonEl.textContent = 'Error';
						setTimeout(() => {
							buttonEl.textContent = buttonText.substring(0, 30);
						}, 2000);
					}
				});
				
				buttonDisplayContainer.appendChild(buttonEl);
			});
		} catch (error) {
			console.error('Error displaying dialog buttons:', error);
			buttonDisplayContainer.innerHTML = '<p>Error displaying buttons</p>';
		}
	}

	function submitRating(dialogId, rating, isGoodMatch) {
		// Send rating to the background script
		chrome.runtime.sendMessage({ 
			action: 'submitDialogRating',
			data: { dialogId, rating, isGoodMatch } 
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
}); 