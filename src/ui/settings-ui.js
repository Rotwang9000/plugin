/**
 * Settings UI functions for managing user preferences
 */

import { createElement, toggleClass, queryAndProcess } from '../modules/dom-utils.js';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../modules/storage.js';

/**
 * Load settings from storage
 * @param {Function} callback - Callback with loaded settings
 * @returns {Promise} Promise that resolves with settings
 */
export function loadSettings(callback) {
	return new Promise((resolve) => {
		getSettings((settings) => {
			if (typeof callback === 'function') {
				callback(settings);
			}
			resolve(settings);
		});
	});
}

/**
 * Update UI based on current settings
 * @param {Object} settings - Settings object
 */
export function updateUIFromSettings(settings) {
	// Update checkboxes
	queryAndProcess('input[type="checkbox"][data-setting]', checkbox => {
		const settingName = checkbox.dataset.setting;
		checkbox.checked = settings[settingName] === true;
		
		// If not the enabled checkbox itself, disable it when extension is disabled
		if (settingName !== 'enabled') {
			checkbox.disabled = !settings.enabled;
		}
	});
	
	// Direct update of checkboxes by ID for backward compatibility
	const settingIds = ['enabled', 'autoAccept', 'smartMode', 'cloudMode', 'privacyMode', 'gdprCompliance', 'devMode'];
	settingIds.forEach(id => {
		const element = document.getElementById(id);
		if (element) {
			element.checked = settings[id] === true;
			
			// Disable all checkboxes except 'enabled' when extension is disabled
			if (id !== 'enabled') {
				element.disabled = !settings.enabled;
			}
		}
	});
	
	// Apply disabled styling to settings sections when extension is disabled
	queryAndProcess('.settings-section', section => {
		// Don't style the section containing the enabled checkbox
		if (!section.querySelector('#enabled')) {
			if (!settings.enabled) {
				section.classList.add('disabled-section');
			} else {
				section.classList.remove('disabled-section');
			}
		}
	});
	
	// Apply disabled styling to individual setting rows when extension is disabled
	queryAndProcess('.setting-row', row => {
		// Don't style the row containing the enabled checkbox
		if (!row.querySelector('#enabled')) {
			if (!settings.enabled) {
				row.classList.add('disabled-setting');
			} else {
				row.classList.remove('disabled-setting');
			}
		}
	});
	
	// Apply disabled styling to labels when the extension is disabled
	queryAndProcess('.setting-label', label => {
		// Don't style the label for the enabled checkbox
		const inputId = label.getAttribute('for');
		if (inputId && inputId !== 'enabled') {
			if (!settings.enabled) {
				label.classList.add('disabled-text');
			} else {
				label.classList.remove('disabled-text');
			}
		}
	});
	
	// Update UI for dev mode
	updateDevModeUI(settings.devMode);
	
	// Update tab display based on dev mode
	toggleDevModeTabs(settings.devMode);
}

/**
 * Update Dev Mode UI elements
 * @param {boolean} isDevMode - Whether dev mode is enabled
 */
export function updateDevModeUI(isDevMode) {
	// Log dev mode changes
	console.log(`Updating UI for dev mode: ${isDevMode ? 'enabled' : 'disabled'}`);
	
	// Update dev mode specific elements
	queryAndProcess('.dev-mode-only', element => {
		toggleClass(element, 'hidden', !isDevMode);
	});
	
	// Update non-dev mode elements
	queryAndProcess('.non-dev-mode-only', element => {
		toggleClass(element, 'hidden', isDevMode);
	});
	
	// Update body class
	document.body.classList.toggle('simple-mode', !isDevMode);
	
	// Update dev mode tabs
	queryAndProcess('.tab[data-tab="analyze"]', element => {
		console.log('Setting Analyze tab display to:', isDevMode ? 'block' : 'none');
		element.style.display = isDevMode ? 'block' : 'none';
		toggleClass(element, 'dev-mode-hidden', !isDevMode);
	});
	
	// If currently on the analyze tab but dev mode is disabled, switch to settings
	if (!isDevMode) {
		const activeTab = document.querySelector('.tab.active');
		if (activeTab && activeTab.getAttribute('data-tab') === 'analyze') {
			// Switch to settings tab
			const settingsTab = document.querySelector('.tab[data-tab="settings"]');
			if (settingsTab) {
				settingsTab.click();
			}
		}
	}
	
	// Direct manipulation for older DOM structures
	document.querySelectorAll('.dev-mode-only').forEach(element => {
		element.style.display = isDevMode ? 'block' : 'none';
	});
}

/**
 * Toggle tab visibility based on dev mode
 * @param {boolean} isDevMode - Whether dev mode is enabled
 */
export function toggleDevModeTabs(isDevMode) {
	// Hide or show tabs based on dev mode
	queryAndProcess('.tab[data-tab="analyze"]', tab => {
		toggleClass(tab, 'dev-mode-hidden', !isDevMode);
	});
	
	// If dev mode is disabled and analyze tab is active, switch to dashboard
	if (!isDevMode && document.querySelector('.tab-content[id="analyze"].active')) {
		showTab('dashboard');
	}
}

/**
 * Initialize tab navigation
 */
export function initTabNavigation() {
	console.log('Initializing tabs');
	const tabs = document.querySelectorAll('.tab');
	const tabContents = document.querySelectorAll('.tab-content');
	
	// Add click event listeners to all tabs
	tabs.forEach(tab => {
		tab.addEventListener('click', function() {
			console.log('Tab clicked:', this.getAttribute('data-tab'));
			
			// Get the tab name from the data-tab attribute
			const tabName = this.getAttribute('data-tab');
			
			// Call the showTab function to handle the tab switch
			showTab(tabName);
		});
	});
	
	// Start on settings tab by default (not dashboard as there is no dashboard tab)
	showTab('settings');
}

/**
 * Show a specific tab and handle any tab-specific actions
 * @param {string} tabName - The name of the tab to show
 */
export function showTab(tabName) {
	console.log(`Switching to tab: ${tabName}`);
	
	const tabs = document.querySelectorAll('.tab');
	const tabContents = document.querySelectorAll('.tab-content');
	
	// Remove active class from all tabs and content
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
	
	// Special handling for review tab - load dialogs
	if (tabName === 'review') {
		// Use window.loadAllDialogs to access the imported function from the global scope
		if (typeof window.loadAllDialogs === 'function') {
			window.loadAllDialogs();
		}
		
		// Or dispatch a custom event that can be listened for
		document.dispatchEvent(new CustomEvent('history-tab-shown'));
	}
	
	// Special handling for details tab - check if dialog is selected
	if (tabName === 'details') {
		handleDetailsTabSwitch();
	}
}

/**
 * Handle details tab special behavior
 */
function handleDetailsTabSwitch() {
	const dialogDetailContainer = document.getElementById('dialogDetailContainer');
	const noSelectionMessage = document.getElementById('noSelectionMessage');
	
	// Check if we have a current dialog (in window scope)
	if (!window.currentDialog) {
		// No dialog selected
		if (dialogDetailContainer) dialogDetailContainer.style.display = 'none';
		if (noSelectionMessage) noSelectionMessage.style.display = 'block';
	} else {
		// Dialog selected
		if (dialogDetailContainer) dialogDetailContainer.style.display = 'block';
		if (noSelectionMessage) noSelectionMessage.style.display = 'none';
		
		// Refresh the displayed dialog
		// Use window.displayDetectedElements to access the imported function
		if (typeof window.displayDetectedElements === 'function') {
			window.displayDetectedElements(window.currentDialog);
		}
		
		// Dispatch a custom event that can be listened for
		document.dispatchEvent(new CustomEvent('switchedToDetailsTab', { 
			detail: window.currentDialog 
		}));
	}
}

/**
 * Initialize settings controls
 * @param {Object} settings - Current settings
 * @param {Function} onSettingChange - Callback when settings change
 */
export function initSettingsControls(settings, onSettingChange) {
	// Set up settings checkboxes
	queryAndProcess('input[type="checkbox"][data-setting]', checkbox => {
		// Set initial state
		const settingName = checkbox.dataset.setting;
		checkbox.checked = settings[settingName] === true;
		
		// Add change handler
		checkbox.addEventListener('change', () => {
			// Update setting
			settings[settingName] = checkbox.checked;
			
			// Handle special case for dev mode
			if (settingName === 'devMode') {
				updateDevModeUI(checkbox.checked);
			}
			
			// Save settings
			saveSettings(settings, () => {
				if (typeof onSettingChange === 'function') {
					onSettingChange(settings);
				}
			});
		});
	});
	
	// For direct ID-based controls (backward compatibility)
	const settingIds = ['enabled', 'autoAccept', 'smartMode', 'cloudMode', 'privacyMode', 'gdprCompliance', 'devMode'];
	settingIds.forEach(id => {
		const element = document.getElementById(id);
		if (element) {
			// Set initial state
			element.checked = settings[id] === true;
			
			// Add change handler if not already set
			if (!element.hasChangeListener) {
				element.addEventListener('change', () => {
					// Update setting
					settings[id] = element.checked;
					
					// Handle special case for dev mode
					if (id === 'devMode') {
						updateDevModeUI(element.checked);
					}
					
					// Save settings
					saveSettings(settings, () => {
						if (typeof onSettingChange === 'function') {
							onSettingChange(settings);
						}
					});
				});
				element.hasChangeListener = true;
			}
		}
	});
} 