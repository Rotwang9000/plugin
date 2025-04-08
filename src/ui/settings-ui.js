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
		toggleClass(element, 'dev-mode-hidden', !isDevMode);
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
 * Show a specific tab
 * @param {string} tabName - Name of tab to show
 */
export function showTab(tabName) {
	// Hide all tabs
	queryAndProcess('.tab-content', tab => {
		tab.classList.remove('active');
	});
	
	// Hide all tab buttons
	queryAndProcess('.tab', tab => {
		tab.classList.remove('active');
	});
	
	// Show selected tab
	const selectedTab = document.querySelector(`.tab-content[id="${tabName}"]`);
	if (selectedTab) {
		selectedTab.classList.add('active');
	}
	
	// Highlight selected tab button
	const selectedTabButton = document.querySelector(`.tab[data-tab="${tabName}"]`);
	if (selectedTabButton) {
		selectedTabButton.classList.add('active');
	}
	
	// Special handling for tabs
	if (tabName === 'history') {
		// Refresh history when showing history tab
		const historyEvent = new CustomEvent('history-tab-shown');
		document.dispatchEvent(historyEvent);
	}
}

/**
 * Initialize tab navigation
 */
export function initTabNavigation() {
	// Set up tab navigation
	queryAndProcess('.tab', tab => {
		tab.addEventListener('click', () => {
			const tabName = tab.dataset.tab;
			showTab(tabName);
		});
	});
	
	// Start on dashboard tab
	showTab('dashboard');
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