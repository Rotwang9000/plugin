// Import modules
import { loadSettings, updateUIFromSettings, updateDevModeUI, toggleDevModeTabs, showTab, initTabNavigation, initSettingsControls } from './src/ui/settings-ui.js';
import { loadAllDialogs, displayAllDialogs, renderDialogItems, getButtonTypeDisplayText, markDialogReviewed } from './src/ui/history-ui.js';
import { displayDetectionStatus, displayDetectedElements } from './src/ui/dialog-display.js';
import { updateDialogCount, clearBadgeCount, displayStatistics, displayChart } from './src/ui/stats-ui.js';
import { initTooltips } from './src/ui/tooltip-ui.js';
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

// Global variables to track current dialog
let currentDialog = null;
let currentDialogId = null;
let settings = {};

// Initialize the popup when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
	// Set up settings toggles and their visual state
	setupSettingsToggles();
	
	// Set up tab switching
	setupTabSwitching();
	
	// Check for cookie dialogs
	checkForCookieBoxes();
	
	// Setup account tab
	setupAccountTab();
	
	// Load button preferences
	loadButtonPreferences();
	
	// Disable premium features for non-premium users
	disablePremiumFeatures();
	
	// Update cookie detection status
	updateCookieDetectionStatus();
	
	// ... (rest of existing DOMContentLoaded code) ...
});

// Initialize tab navigation with proper tab switching
function initProperTabNavigation() {
	const tabs = document.querySelectorAll('.tab');
	const tabContents = document.querySelectorAll('.tab-content');
	
	// Function to switch to a specific tab
	function switchToTab(tabId) {
		// Deactivate all tabs and content
		tabs.forEach(tab => tab.classList.remove('active'));
		tabContents.forEach(content => content.classList.remove('active'));
		
		// Activate the selected tab and content
		const selectedTab = document.querySelector(`.tab[data-tab="${tabId}"]`);
		const selectedContent = document.getElementById(`${tabId}-tab`);
		
		if (selectedTab) selectedTab.classList.add('active');
		if (selectedContent) selectedContent.classList.add('active');
		
		// Special handling for history tab
		if (tabId === 'history') {
			loadAllDialogs().then(dialogs => {
				displayHistoryDialogs(dialogs);
			});
		}
	}
	
	// Add click listeners to all tabs
	tabs.forEach(tab => {
		const tabId = tab.getAttribute('data-tab');
		
		tab.addEventListener('click', () => {
			const tabName = tabId;
			
			// Remove active class from all tabs
			tabs.forEach(t => t.classList.remove('active'));
			tabContents.forEach(tc => tc.classList.remove('active'));
			
			// Add active class to current tab
			tab.classList.add('active');
			document.getElementById(`${tabName}-tab`).classList.add('active');
			
			// Special handling for review tab
			if (tabName === 'review') {
				// Get the current filter value
				const historyFilter = document.getElementById('historyFilter');
				const filterValue = historyFilter ? historyFilter.value : 'all';
				
				console.log('Loading dialogs with filter:', filterValue);
				
				// Import modules and load dialogs
				import('./src/ui/history-ui.js').then(module => {
					module.loadAllDialogs(filterValue).then(dialogs => {
						module.displayAllDialogs(dialogs);
					}).catch(error => {
						console.error('Error loading dialogs:', error);
						const historyList = document.getElementById('historyList');
						if (historyList) {
							historyList.innerHTML = '<div class="no-dialogs">Error loading dialogs. Please try again.</div>';
						}
					});
				}).catch(error => {
					console.error('Error importing history-ui.js:', error);
					// Fallback to legacy method
					loadAllDialogs(filterValue);
				});
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
	
	// Expose the switchToTab function for programmatic tab switching
	window.switchToTab = switchToTab;
}

// Initialize settings controls with proper saving
function initProperSettingsControls() {
	const settingsElements = {
		enabled: document.getElementById('enabled'),
		autoAccept: document.getElementById('autoAccept'),
		smartMode: document.getElementById('smartMode'),
		preferEssential: document.getElementById('preferEssential'),
		cloudMode: document.getElementById('cloudMode'),
		cloudModePremium: document.getElementById('cloudModePremium'),
		devMode: document.getElementById('devMode')
	};
	
	// Add change listeners to all settings controls
	Object.keys(settingsElements).forEach(key => {
		const element = settingsElements[key];
		if (element) {
			element.addEventListener('change', function() {
				// Special handling for premium features for non-premium users
				if ((key === 'preferEssential' || key === 'cloudMode') && this.checked) {
					// Check for test premium mode first
					chrome.storage.local.get(['testPremiumMode'], (testResult) => {
						if (testResult.testPremiumMode === true) {
							// In test mode, allow premium features
							updateSettingAndSave(key, this.checked);
							return;
						}
						
						// Otherwise check actual premium status
						sendMessageToBackgroundAsync({ action: 'checkPremiumStatus' })
							.then(response => {
								if (!response.isPremium) {
									// Not premium, show message and redirect to account tab
									this.checked = false;
									alert('This is a premium feature. Please upgrade to access it.');
									// Switch to the account tab using the global function
									if (window.switchToTab) {
										window.switchToTab('account');
									}
									return;
								}
								// User is premium, continue with normal settings update
								updateSettingAndSave(key, this.checked);
							})
							.catch(error => {
								console.error('Error checking premium status:', error);
								// Revert on error
								this.checked = false;
							});
					});
					return;
				}
				
				// Normal handling for other settings or premium users
				updateSettingAndSave(key, this.checked);
			});
		}
	});
	
	// Set up the advanced button preferences UI for premium users
	setupButtonPreferences();
	
	// Helper function to update and save a setting
	function updateSettingAndSave(key, value) {
		// Load current settings first
		loadSettings().then(settings => {
			// Update the changed setting
			settings[key] = value;
			
			// Special handling for toggling extension or auto-accept
			const isEnabledChange = key === 'enabled';
			const isAutoAcceptChange = key === 'autoAccept';
			
			// Immediately update UI based on settings change
			updateUIFromSettings(settings);
			
			// If it's an enabled change, update disabled state of all other controls
			if (isEnabledChange) {
				// Set disabled state on all checkboxes except enabled
				document.querySelectorAll('input[type="checkbox"]:not(#enabled)').forEach(checkbox => {
					checkbox.disabled = !settings.enabled;
				});
				
				// Apply or remove disabled styling to all settings sections
				document.querySelectorAll('.settings-section').forEach(section => {
					if (!section.querySelector('#enabled')) {
						if (!settings.enabled) {
							section.classList.add('disabled-section');
						} else {
							section.classList.remove('disabled-section');
						}
					}
				});
				
				// Apply or remove disabled styling to individual setting rows
				document.querySelectorAll('.setting-row').forEach(row => {
					if (!row.querySelector('#enabled')) {
						if (!settings.enabled) {
							row.classList.add('disabled-setting');
						} else {
							row.classList.remove('disabled-setting');
						}
					}
				});
				
				// Apply or remove disabled styling to labels
				document.querySelectorAll('.setting-label').forEach(label => {
					const inputId = label.getAttribute('for');
					if (inputId && inputId !== 'enabled') {
						if (!settings.enabled) {
							label.classList.add('disabled-text');
						} else {
							label.classList.remove('disabled-text');
						}
					}
				});
			}
			
			// Save the updated settings
			saveSettings(settings).then(() => {
				// Display success status
				updateStatus(settings);
				
				// If dev mode changed, update visibility
				if (key === 'devMode') {
					updateDevModeUI(settings.devMode);
				}
				
				// Send settings to background script with specific flags for enabled/autoAccept changes
				const messageData = {
					action: 'settingsUpdated',
					settings: {
						...settings,
						// For background script to know which setting changed
						_changedSetting: key
					}
				};
				
				sendMessageToBackgroundAsync(messageData).catch(error => {
					console.error('Error updating settings in background script:', error);
				});
			});
		});
	}
}

// Set up the draggable button preferences UI for premium users
function setupButtonPreferences() {
	const preferenceList = document.getElementById('buttonPreferenceList');
	if (!preferenceList) return;
	
	// Get all preference items
	const items = preferenceList.querySelectorAll('.preference-item');
	
	// Initialize drag functionality
	items.forEach(item => {
		// Make the entire item draggable for better usability
		item.addEventListener('mousedown', function(e) {
			// Skip if clicked on toggle or inside toggle
			if (e.target.closest('.toggle')) {
				return;
			}
			
			// Check for test premium mode first
			chrome.storage.local.get(['testPremiumMode'], (testResult) => {
				if (testResult.testPremiumMode === true) {
					// In test mode, allow drag and drop
					initiateDrag(e);
					return;
				}
				
				// Otherwise check actual premium status
				sendMessageToBackgroundAsync({ action: 'checkPremiumStatus' })
					.then(response => {
						if (!response.isPremium) {
							alert('Reordering preferences is a premium feature. Please upgrade to use this functionality.');
							return;
						}
						
						// User is premium, allow drag and drop
						initiateDrag(e);
					})
					.catch(error => {
						console.error('Error checking premium status:', error);
						// Don't allow drag on error
					});
			});
		});
		
		// Handle toggle events for enabling/disabling button types
		const toggle = item.querySelector('input[type="checkbox"]');
		if (toggle) {
			toggle.addEventListener('change', function() {
				// Check for test premium mode first
				chrome.storage.local.get(['testPremiumMode'], (testResult) => {
					if (testResult.testPremiumMode === true) {
						// In test mode, allow toggling
						saveButtonPreferences();
						return;
					}
					
					// Otherwise check actual premium status
					sendMessageToBackgroundAsync({ action: 'checkPremiumStatus' })
						.then(response => {
							if (!response.isPremium) {
								alert('Customizing button preferences is a premium feature. Please upgrade to use this functionality.');
								this.checked = !this.checked; // Revert change
								return;
							}
							
							// Save the enabled/disabled state
							saveButtonPreferences();
						})
						.catch(error => {
							console.error('Error checking premium status:', error);
							this.checked = !this.checked; // Revert change
						});
				});
			});
		}
		
		// Function to handle the drag operation
		function initiateDrag(e) {
			// Don't initiate drag if clicking on the toggle
			if (e.target.closest('.toggle')) {
				return;
			}
			
			e.preventDefault();
			
			// Add dragging class
			item.classList.add('dragging');
			
			// Set dragging state on body
			document.body.classList.add('dragging-active');
			
			// Get scroll position at start of drag
			const initialScrollY = window.scrollY;
			
			// Get the initial position of the mouse relative to the item
			const itemRect = item.getBoundingClientRect();
			const offsetY = e.clientY - itemRect.top;
			
			// Clone the item for the drag effect
			const clone = item.cloneNode(true);
			clone.style.position = 'fixed'; // Use fixed positioning to avoid scroll issues
			clone.style.width = `${itemRect.width}px`;
			clone.style.opacity = '0.8';
			clone.style.pointerEvents = 'none';
			clone.style.zIndex = '1000';
			document.body.appendChild(clone);
			
			// Set initial position
			clone.style.top = `${e.clientY - offsetY}px`;
			clone.style.left = `${itemRect.left}px`;
			
			// Initial position
			let currentIndex = Array.from(items).indexOf(item);
			
			// Create a ghost placeholder for the top position
			const ghostPlaceholder = document.createElement('div');
			ghostPlaceholder.className = 'preference-item ghost-placeholder';
			ghostPlaceholder.style.height = '0';
			ghostPlaceholder.style.padding = '0';
			ghostPlaceholder.style.overflow = 'hidden';
			ghostPlaceholder.style.transition = 'height 0.2s ease';
			preferenceList.insertBefore(ghostPlaceholder, preferenceList.firstChild);
			
			// Update clone position and check for reordering
			function moveClone(e) {
				// Update the clone position (fixed positioning)
				clone.style.top = `${e.clientY - offsetY}px`;
				clone.style.left = `${itemRect.left}px`;
				
				// Check if we need to reorder
				const newIndex = findNewPosition(e.clientY);
				if (newIndex !== currentIndex && newIndex !== -1) {
					// Handle the ghost placeholder
					if (newIndex === 0) {
						ghostPlaceholder.style.height = `${item.offsetHeight}px`;
						ghostPlaceholder.style.padding = '8px 10px';
						ghostPlaceholder.style.borderBottom = '1px solid #eee';
					} else {
						ghostPlaceholder.style.height = '0';
						ghostPlaceholder.style.padding = '0';
						ghostPlaceholder.style.borderBottom = 'none';
					}
					
					// Reorder the items in the DOM (skip index 0 when dealing with real items)
					if (newIndex > 0) {
						const referenceNode = newIndex < items.length ? 
							items[newIndex < currentIndex ? newIndex : newIndex + 1] : null;
						preferenceList.insertBefore(item, referenceNode);
					}
					
					// Update current index
					currentIndex = newIndex;
				}
			}
			
			// Find the new position based on mouse Y
			function findNewPosition(y) {
				// Check if we're above the first item (including the ghost)
				const firstItemRect = preferenceList.firstChild.getBoundingClientRect();
				if (y < firstItemRect.top + firstItemRect.height / 2) {
					return 0; // Special index for the ghost placeholder at top
				}
				
				// Skip the ghost placeholder when checking positions
				for (let i = 0; i < items.length; i++) {
					const rect = items[i].getBoundingClientRect();
					const middle = rect.top + rect.height / 2;
					
					if (y < middle) {
						return i + 1; // +1 to account for the ghost placeholder
					}
				}
				return items.length;
			}
			
			// Clean up when done
			function stopDrag() {
				document.removeEventListener('mousemove', moveClone);
				document.removeEventListener('mouseup', stopDrag);
				document.body.removeChild(clone);
				item.classList.remove('dragging');
				
				// Remove dragging state from body
				document.body.classList.remove('dragging-active');
				
				// Remove ghost placeholder
				if (ghostPlaceholder && ghostPlaceholder.parentNode) {
					preferenceList.removeChild(ghostPlaceholder);
				}
				
				// If currentIndex is 0, move item to top
				if (currentIndex === 0 && preferenceList.firstChild !== item) {
					preferenceList.insertBefore(item, preferenceList.firstChild);
				}
				
				// Save the new order
				saveButtonPreferences();
			}
			
			// Add event listeners for dragging
			document.addEventListener('mousemove', moveClone);
			document.addEventListener('mouseup', stopDrag);
			
			// Initial position of the clone
			moveClone(e);
		}
	});
	
	// Save the current button preferences
	function saveButtonPreferences() {
		// Get the current order and enabled state
		const items = document.querySelectorAll('.preference-item');
		const order = [];
		const enabled = {};
		
		items.forEach(item => {
			const type = item.getAttribute('data-type');
			const toggle = item.querySelector('input[type="checkbox"]');
			
			order.push(type);
			enabled[type] = toggle.checked;
		});
		
		// Load settings and update buttonPreferences
		loadSettings().then(settings => {
			settings.buttonPreferences = {
				order: order,
				enabled: enabled
			};
			
			// Save the updated settings
			saveSettings(settings).then(() => {
				// Send settings to background script
				sendMessageToBackgroundAsync({
					action: 'settingsUpdated',
					settings: settings
				}).catch(error => {
					console.error('Error updating settings in background script:', error);
				});
			});
		});
	}
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
		dragHandle.textContent = '≡';
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

// Check current page for cookie dialogs and update the status
function updateCurrentPageStatus() {
	const statusContainer = document.getElementById('currentPageStatus');
	if (!statusContainer) return;
	
	const headerDiv = statusContainer.querySelector('.detection-header');
	const contentDiv = statusContainer.querySelector('.detection-content');
	if (!headerDiv || !contentDiv) return;
	
	// Set to loading state
	headerDiv.textContent = 'Current Page Status';
	contentDiv.innerHTML = '<p>Checking for cookie dialogs on this page...</p>';
	
	// First, check if we have any recent button clicks
	sendMessageToBackgroundAsync({ action: 'getLastButtonClick' })
		.then(buttonClickResponse => {
			// Check current tab
			chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
				if (!tabs || tabs.length === 0) {
					// Show error for no active tab
					statusContainer.className = 'cookie-detection-status status-error';
					headerDiv.textContent = 'No Active Tab';
					contentDiv.innerHTML = '<p>Please open a website tab and try again.</p>' +
						'<button id="checkCookieBoxes" class="action-button">Try Again</button>';
					
					// Add event listener to the button
					const checkButton = contentDiv.querySelector('#checkCookieBoxes');
					if (checkButton) {
						checkButton.addEventListener('click', () => updateCurrentPageStatus());
					}
					return;
				}
				
				const currentTab = tabs[0];
				const url = currentTab.url || '';
				
				// Check if URL is a restricted one (browser internal pages)
				if (url.startsWith('chrome:') || 
					url.startsWith('chrome-extension:') || 
					url.startsWith('devtools:') || 
					url.startsWith('view-source:') ||
					url.startsWith('about:')) {
					
					// Show browser page message
					statusContainer.className = 'cookie-detection-status status-info';
					headerDiv.textContent = 'Browser Page';
					contentDiv.innerHTML = '<p>This appears to be a browser page or extension page.</p>' +
						'<p class="small text-muted">Cookie detection only works on regular websites. Try opening a website to use this extension.</p>';
					return;
				}
				
				// Check if we have a recent button click for this tab
				const lastClick = buttonClickResponse.lastClick;
				if (lastClick && lastClick.tabId === currentTab.id) {
					// We have a recent click for this tab - show that info
					statusContainer.className = 'cookie-detection-status status-success';
					headerDiv.textContent = 'Cookie Dialog Handled';
					
					// Format the timestamp
					const clickTime = new Date(lastClick.timestamp);
					const formattedTime = clickTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
					
					// Create content for dialog found and handled
					contentDiv.innerHTML = '';
					createElement('p', null, 'A cookie consent dialog was detected and handled on this page.', contentDiv);
					createElement('p', { className: 'small text-muted' }, 
						`Button clicked: ${lastClick.buttonType || 'unknown'} (${formattedTime})`, contentDiv);
					
					if (lastClick.buttonText) {
						createElement('p', { className: 'small text-muted' }, 
							`Button text: "${lastClick.buttonText}"`, contentDiv);
					}
					
					// Add scan again button
					const scanButton = createElement('button', { 
						className: 'action-button'
					}, 'Scan Again', contentDiv);
					
					scanButton.addEventListener('click', proceedWithContentScriptCheck);
				} else {
					// For actual websites, proceed with the check
					proceedWithContentScriptCheck();
				}
			});
		})
		.catch(error => {
			console.error('Error checking for last button click:', error);
			// If there's an error, just proceed with the content script check
			proceedWithContentScriptCheck();
		});
	
	// Function to proceed with checking for cookie dialogs
	function proceedWithContentScriptCheck() {
		// First try to inject content script preemptively
		sendMessageToBackgroundAsync({ action: 'injectContentScript' })
			.then(injectionResult => {
				if (injectionResult.unsupportedTab) {
					// This is a browser page
					statusContainer.className = 'cookie-detection-status status-info';
					headerDiv.textContent = 'Browser Page';
					contentDiv.innerHTML = '<p>This appears to be a browser page or extension page.</p>' +
						'<p class="small text-muted">Cookie detection only works on regular websites. Try opening a website to use this extension.</p>';
					return;
				}
				
				// Wait a moment for the script to initialize if injected
				setTimeout(() => {
					// Now try to check for cookie dialogs
					sendMessageToActiveTabAsync({ action: 'checkForCookieBoxes' })
						.then(response => {
							// Check if this is an unsupported tab
							if (response.unsupportedTab) {
								statusContainer.className = 'cookie-detection-status status-info';
								headerDiv.textContent = 'Browser Page';
								contentDiv.innerHTML = '<p>This appears to be a browser page or extension page.</p>' +
									'<p class="small text-muted">Cookie detection only works on regular websites. Try opening a website to use this extension.</p>';
								return;
							}
							
							// Normal response handling
							updatePageStatusUI(response);
						})
						.catch(error => {
							console.error('Error checking current page:', error);
							
							// Show error message
							statusContainer.className = 'cookie-detection-status status-error';
							headerDiv.textContent = 'Extension Issue';
							contentDiv.innerHTML = 
								'<p>Unable to access the page content.</p>' +
								'<p class="small text-muted">This may happen if the page blocks extensions or has security restrictions. Try refreshing the page.</p>' +
								'<button id="checkCookieBoxes" class="action-button">Try Again</button>';
							
							// Add event listener to the try again button
							const checkButton = contentDiv.querySelector('#checkCookieBoxes');
							if (checkButton) {
								checkButton.addEventListener('click', () => updateCurrentPageStatus());
							}
						});
				}, 500); // Give content script time to initialize
			})
			.catch(error => {
				console.error('Error injecting content script:', error);
				
				// Show error message
				statusContainer.className = 'cookie-detection-status status-error';
				headerDiv.textContent = 'Extension Issue';
				contentDiv.innerHTML = 
					'<p>Failed to inject content script.</p>' +
					'<p class="small text-muted">This may happen if the page blocks extensions or has security restrictions. Try refreshing the page.</p>' +
					'<button id="checkCookieBoxes" class="action-button">Try Again</button>';
				
				// Add event listener to the try again button
				const checkButton = contentDiv.querySelector('#checkCookieBoxes');
				if (checkButton) {
					checkButton.addEventListener('click', () => updateCurrentPageStatus());
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
	sendMessageToActiveTabAsync({ 
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

// History filter change
if (historyFilter) {
	historyFilter.addEventListener('change', () => {
		// Import loadAllDialogs from history-ui.js
		import('./src/ui/history-ui.js').then(module => {
			// Call loadAllDialogs with the selected filter
			module.loadAllDialogs(historyFilter.value).then(dialogs => {
				// Display the filtered dialogs
				module.displayAllDialogs(dialogs);
			}).catch(error => {
				console.error('Error loading filtered dialogs:', error);
				// Show error message
				const historyList = document.getElementById('historyList');
				if (historyList) {
					historyList.innerHTML = '<div class="no-dialogs">Error loading dialogs. Please try again.</div>';
				}
			});
		}).catch(error => {
			console.error('Error importing history-ui.js module:', error);
			// Fallback to old method or show error
			loadAllDialogs(historyFilter.value);
		});
	});
} 

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

// Update feature toggles when enabled/disabled state changes
function updateFeatureTogglesState(enabled) {
	// Get all toggles except the main enabled toggle
	const featureToggles = document.querySelectorAll('input[type="checkbox"]:not(#enabled)');
	const featureLabels = document.querySelectorAll('.toggle-label:not(:first-child)');
	
	featureToggles.forEach(toggle => {
		// Set visual style for disable state, but don't actually change the checked state
		// This prevents losing user settings when temporarily turning off the extension
		toggle.disabled = !enabled;
		
		// Add/remove greyed-out appearance
		const slider = toggle.nextElementSibling;
		if (slider && slider.classList.contains('slider')) {
			if (!enabled) {
				slider.classList.add('disabled-slider');
			} else {
				slider.classList.remove('disabled-slider');
			}
		}
	});
	
	// Also grey out the labels
	featureLabels.forEach(label => {
		if (!enabled) {
			label.classList.add('disabled-label');
		} else {
			label.classList.remove('disabled-label');
		}
	});
}

// Setup settings toggle handlers
function setupSettingsToggles() {
	// Get all setting toggle elements
	const enabledToggle = document.getElementById('enabled');
	const autoAcceptToggle = document.getElementById('autoAccept');
	const smartModeToggle = document.getElementById('smartMode');
	const preferEssentialToggle = document.getElementById('preferEssential');
	const preferEssentialPremiumToggle = document.getElementById('preferEssentialPremium');
	const cloudModeToggle = document.getElementById('cloudMode');
	
	// Load initial settings and update UI toggles
	loadSettings().then(settings => {
		if (enabledToggle) enabledToggle.checked = settings.enabled;
		if (autoAcceptToggle) autoAcceptToggle.checked = settings.autoAccept;
		if (smartModeToggle) smartModeToggle.checked = settings.smartMode;
		if (preferEssentialToggle) preferEssentialToggle.checked = settings.preferEssential;
		if (preferEssentialPremiumToggle) preferEssentialPremiumToggle.checked = settings.preferEssential;
		if (cloudModeToggle) cloudModeToggle.checked = settings.cloudMode;
		
		// Apply visual disabled state based on enabled setting
		updateFeatureTogglesState(settings.enabled);
	});
	
	// Add style for disabled sliders if it doesn't exist
	if (!document.getElementById('disabled-slider-style')) {
		const style = document.createElement('style');
		style.id = 'disabled-slider-style';
		style.textContent = `
			.disabled-slider {
				opacity: 0.5;
				background-color: #ccc !important;
			}
			.disabled-slider:before {
				background-color: #999 !important;
			}
			.disabled-label {
				opacity: 0.5;
				color: #777;
			}
		`;
		document.head.appendChild(style);
	}
	
	// Add event listener for enabled toggle
	if (enabledToggle) {
		enabledToggle.addEventListener('change', function() {
			// Save the setting change
			saveSettings({ enabled: this.checked }, 'enabled')
			.then(() => {
				// Update visual appearance of other toggles
				updateFeatureTogglesState(this.checked);
				
				// Show status
				showStatus(`Extension ${this.checked ? 'enabled' : 'disabled'}`);
			});
		});
	}
	
	// ... (existing code for other toggle event listeners) ...
} 