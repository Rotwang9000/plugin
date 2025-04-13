/**
 * UI utilities for history tab
 */

import { createElement, clearElement } from '../modules/dom-utils.js';
import { getDialogHistory, markDialogAsReviewed } from '../modules/storage.js';

/**
 * Load all dialogs from history
 * @param {string} filterType - Type of filter to apply (all, auto_accepted, ignored, current_page)
 * @param {Function} callback - Optional callback function to call with the loaded dialogs
 * @returns {Promise} Promise that resolves with filtered dialogs
 */
export function loadAllDialogs(filterType = 'all', callback) {
	return new Promise((resolve) => {
		getDialogHistory((dialogs) => {
			// Debug: Log what we're getting
			console.log(`Loading dialogs with filter: ${filterType}. Total: ${dialogs.length}`);
			
			if (filterType === 'all') {
				if (typeof callback === 'function') callback(dialogs);
				resolve(dialogs);
				return;
			}
			
			// Get current page URL for filtering
			chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
				const currentPageUrl = tabs && tabs[0] ? tabs[0].url : '';
				let filteredDialogs = [];
				
				switch(filterType) {
					case 'auto_accepted':
						// Filter to only show auto-accepted dialogs
						filteredDialogs = dialogs.filter(dialog => 
							dialog.method && (
								dialog.method.includes('auto') || 
								dialog.method.includes('cloud') || 
								dialog.method.includes('smart')
							)
						);
						break;
					case 'ignored':
						// Filter to show dialogs that were NOT auto-accepted
						filteredDialogs = dialogs.filter(dialog => 
							!dialog.method || (
								!dialog.method.includes('auto') && 
								!dialog.method.includes('cloud') && 
								!dialog.method.includes('smart')
							)
						);
						break;
					case 'current_page':
						// Filter to show only dialogs from the current domain
						filteredDialogs = dialogs.filter(dialog => {
							if (!dialog.domain || !currentPageUrl) return false;
							
							try {
								const currentDomain = new URL(currentPageUrl).hostname;
								return currentDomain.includes(dialog.domain) || dialog.domain.includes(currentDomain);
							} catch (e) {
								console.error('Error parsing URL:', e);
								return false;
							}
						});
						break;
					default:
						filteredDialogs = dialogs;
				}
				
				console.log(`Filter ${filterType} resulted in ${filteredDialogs.length} dialogs`);
				
				// Call the callback if provided
				if (typeof callback === 'function') {
					callback(filteredDialogs);
				}
				
				resolve(filteredDialogs);
			});
		});
	});
}

/**
 * Display captured cookie dialogs in history panel with pagination
 * @param {Array} dialogs - Array of dialog objects
 */
export function displayAllDialogs(dialogs) {
	const historyListContainer = document.getElementById('historyList');
	if (!historyListContainer) return;
	
	// Clear the list first
	clearElement(historyListContainer);
	
	// Show message if no dialogs
	if (!dialogs || dialogs.length === 0) {
		historyListContainer.innerHTML = '<div class="no-dialogs">No cookie dialogs have been captured yet.</div>';
		return;
	}
	
	// Sort by captured date, newest first
	const sortedDialogs = [...dialogs].sort((a, b) => {
		const dateA = a.capturedAt ? new Date(a.capturedAt) : new Date(0);
		const dateB = b.capturedAt ? new Date(b.capturedAt) : new Date(0);
		return dateB - dateA;
	});
	
	// Create a container for the items
	const itemsContainer = createElement('div', { id: 'historyItemsContainer' }, null, historyListContainer);
	
	// Initial display count and total
	const initialCount = 20;
	const totalDialogs = sortedDialogs.length;
	const initialDialogs = sortedDialogs.slice(0, initialCount);
	
	// Render initial set of dialog items
	renderDialogBatch(initialDialogs, itemsContainer);
	
	// Add Load More button if there are more dialogs
	if (totalDialogs > initialCount) {
		const loadMoreContainer = createElement('div', { 
			className: 'load-more-container',
			style: 'text-align: center; margin-top: 15px;'
		}, null, historyListContainer);
		
		const loadMoreButton = createElement('button', {
			className: 'action-button',
			id: 'loadMoreDialogs'
		}, `Load More (${initialCount} of ${totalDialogs} shown)`, loadMoreContainer);
		
		// Track how many are currently shown
		let currentlyShown = initialCount;
		
		// Add click event to load more
		loadMoreButton.addEventListener('click', () => {
			// Calculate how many more to load
			const loadCount = 20;
			const nextBatch = sortedDialogs.slice(currentlyShown, currentlyShown + loadCount);
			
			// Render the next batch
			renderDialogBatch(nextBatch, itemsContainer);
			
			// Update count
			currentlyShown += nextBatch.length;
			
			// Update button text or hide if all loaded
			if (currentlyShown >= totalDialogs) {
				loadMoreContainer.style.display = 'none';
			} else {
				loadMoreButton.textContent = `Load More (${currentlyShown} of ${totalDialogs} shown)`;
			}
		});
	}
	
	// Helper function to render a batch of dialogs and set up their click handlers
	function renderDialogBatch(dialogBatch, container) {
		dialogBatch.forEach(dialog => {
			const reviewClass = dialog.reviewed ? 'reviewed' : 'not-reviewed';
			const dateStr = dialog.capturedAt 
				? new Date(dialog.capturedAt).toLocaleString('en-GB') 
				: 'Unknown date';
			
			const item = createElement('div', {
				className: `history-item ${reviewClass}`,
				dataset: { id: dialog.id }
			}, null, container);
			
			// Add domain/URL
			createElement('div', { className: 'history-item-domain' }, 
				(dialog.domain || (dialog.url ? new URL(dialog.url).hostname : 'Unknown')), item);
			
			// Add detection method without "Method: " prefix
			const methodDisplay = dialog.method 
				? dialog.method  // Removed "Method: " prefix
				: 'manual';
			
			// Create method and date in the same container to reduce spacing
			const metaContainer = createElement('div', { 
				className: 'history-item-meta',
				style: 'display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-top: 2px;'
			}, null, item);
			
			// Add method
			createElement('div', { className: 'history-item-method' }, methodDisplay, metaContainer);
			
			// Add date
			createElement('div', { className: 'history-item-date' }, dateStr, metaContainer);
			
			// Add click handler to this specific item
			item.addEventListener('click', () => {
				// Remove active class from all items
				document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
				
				// Add active class to clicked item
				item.classList.add('active');
				
				// Display dialog details
				displayDialogDetails(dialog);
				
				// Switch to details tab using the proper exported function
				switchToDetailsTab();
			});
		});
	}
	
	// Helper function to switch to details tab
	function switchToDetailsTab() {
		// Find all tabs and tab contents
		const tabs = document.querySelectorAll('.tab');
		const tabContents = document.querySelectorAll('.tab-content');
		
		// Remove active class from all tabs and contents
		tabs.forEach(tab => tab.classList.remove('active'));
		tabContents.forEach(content => content.classList.remove('active'));
		
		// Activate the details tab
		const detailsTab = document.querySelector('.tab[data-tab="details"]');
		const detailsContent = document.getElementById('details-tab');
		
		if (detailsTab) detailsTab.classList.add('active');
		if (detailsContent) detailsContent.classList.add('active');
		
		// Get container elements
		const dialogDetailContainer = document.getElementById('dialogDetailContainer');
		const noSelectionMessage = document.getElementById('noSelectionMessage');
		const detectedElementsContainer = document.getElementById('detectedElementsContainer');
		const buttonClassificationsContainer = document.getElementById('buttonClassificationsContainer'); 
		const optionClassificationsContainer = document.getElementById('optionClassificationsContainer');
		const reviewContainer = document.getElementById('reviewContainer');
		
		// Check if we have a current dialog
		if (window.currentDialog) {
			// Show dialog details and hide no selection message
			if (dialogDetailContainer) dialogDetailContainer.style.display = 'block';
			if (noSelectionMessage) noSelectionMessage.style.display = 'none';
			
			// Dispatch an event for popup_fixed.js to handle the classifications
			const dialogDetailsEvent = new CustomEvent('switchedToDetailsTab', { 
				detail: window.currentDialog 
			});
			document.dispatchEvent(dialogDetailsEvent);
		} else {
			// No dialog selected, show message and hide details
			if (dialogDetailContainer) dialogDetailContainer.style.display = 'none';
			if (noSelectionMessage) noSelectionMessage.style.display = 'block';
			
			// Hide all detail containers when no dialog is selected
			if (detectedElementsContainer) detectedElementsContainer.style.display = 'none';
			if (buttonClassificationsContainer) buttonClassificationsContainer.style.display = 'none';
			if (optionClassificationsContainer) optionClassificationsContainer.style.display = 'none';
			if (reviewContainer) reviewContainer.style.display = 'none';
		}
	}
}

/**
 * Render dialog items in a container
 * @param {Array} dialogs - Array of dialog objects
 * @param {Element} container - Container element
 */
export function renderDialogItems(dialogs, container) {
	console.log(`Rendering ${dialogs.length} dialog items in container:`, container);
	
	// Clear the container first to avoid duplicate entries
	clearElement(container);
	
	// Show a message if no dialogs found
	if (!dialogs || dialogs.length === 0) {
		container.innerHTML = '<div class="no-dialogs">No cookie dialogs have been captured yet.</div>';
		return;
	}
	
	// Add each dialog item to the container
	dialogs.forEach(dialog => {
		const reviewClass = dialog.reviewed ? 'reviewed' : 'not-reviewed';
		const dateStr = dialog.capturedAt 
			? new Date(dialog.capturedAt).toLocaleString('en-GB') 
			: 'Unknown date';
		
		const item = createElement('div', {
			className: `history-item ${reviewClass}`,
			dataset: { id: dialog.id }
		}, null, container);
		
		// Add domain/URL
		createElement('div', { className: 'history-item-domain' }, 
			(dialog.domain || (dialog.url ? new URL(dialog.url).hostname : 'Unknown')), item);
		
		// Create method and date in the same container to reduce spacing
		const metaContainer = createElement('div', { 
			className: 'history-item-meta',
			style: 'display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-top: 2px;'
		}, null, item);
		
		// Add method
		const methodDisplay = dialog.method 
			? dialog.method
			: 'manual';
		createElement('div', { className: 'history-item-method' }, methodDisplay, metaContainer);
		
		// Add date
		createElement('div', { className: 'history-item-date' }, dateStr, metaContainer);
		
		// Add click handler to this specific item
		item.addEventListener('click', () => {
			// Remove active class from all items
			document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
			
			// Add active class to clicked item
			item.classList.add('active');
			
			// Display dialog details
			displayDialogDetails(dialog);
			
			// Switch to details tab using the proper exported function
			switchToDetailsTab();
		});
	});
	
	console.log(`Rendered ${dialogs.length} dialog items successfully`);
}

/**
 * Display details for a specific cookie dialog
 * @param {Object} dialog - Dialog object to display
 */
export function displayDialogDetails(dialog) {
	const dialogDetailContainer = document.getElementById('dialogDetailContainer');
	const noSelectionMessage = document.getElementById('noSelectionMessage');
	const detailedInfo = document.getElementById('detailedInfo');
	const buttonClassificationsList = document.getElementById('buttonClassificationsList');
	const optionClassificationsList = document.getElementById('optionClassificationsList');
	const detectedElementsContainer = document.getElementById('detectedElementsContainer');
	const buttonClassificationsContainer = document.getElementById('buttonClassificationsContainer');
	const optionClassificationsContainer = document.getElementById('optionClassificationsContainer');
	const reviewContainer = document.getElementById('reviewContainer');
	
	if (!dialogDetailContainer || !detailedInfo) {
		console.error('Dialog detail container not found');
		return;
	}
	
	// Show dialog details and hide no selection message
	dialogDetailContainer.style.display = 'block';
	if (noSelectionMessage) noSelectionMessage.style.display = 'none';
	
	// Clear previous content
	clearElement(detailedInfo);
	if (buttonClassificationsList) clearElement(buttonClassificationsList);
	if (optionClassificationsList) clearElement(optionClassificationsList);
	
	// 1. Create info card with dialog details
	const infoCard = createElement('div', { className: 'info-card' }, null, detailedInfo);
	
	// Header
	createElement('div', { className: 'info-card-header' }, 'Cookie Dialog Information', infoCard);
	
	// Content
	const infoContent = createElement('div', { className: 'info-card-content' }, null, infoCard);
	
	// Format date
	const captureDate = dialog.capturedAt 
		? new Date(dialog.capturedAt).toLocaleString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}) 
		: 'Unknown';
	
	// Create detail items
	const detailItems = [
		{ icon: '🌐', label: 'Domain', value: dialog.domain || 'Unknown' },
		{ icon: '🔗', label: 'URL', value: dialog.url ? 
			`<a href="${dialog.url}" target="_blank" title="${dialog.url}">${dialog.url}</a>` : 'Not available' },
		{ icon: '⚙️', label: 'Method', value: dialog.method || 'Manual' },
		{ icon: '📍', label: 'Region', value: dialog.region || 'Not detected' },
		{ icon: '🕒', label: 'Captured', value: captureDate },
		{ icon: '✓', label: 'Reviewed', value: dialog.reviewed ? 'Yes' : 'No' }
	];
	
	// Add each detail item
	detailItems.forEach(item => {
		const detailItem = createElement('div', { className: 'detail-item' }, null, infoContent);
		createElement('span', { className: 'detail-icon' }, item.icon, detailItem);
		createElement('strong', null, `${item.label}:`, detailItem);
		const valueSpan = createElement('span', { className: 'detail-value' }, null, detailItem);
		valueSpan.innerHTML = item.value; // Using innerHTML to support links
	});
	
	// Show/hide containers based on dialog content
	if (detectedElementsContainer) {
		detectedElementsContainer.style.display = dialog.detectedElements && dialog.detectedElements.length > 0 ? 'block' : 'none';
	}
	
	// Button classifications container should only be shown if dialog has buttons
	if (buttonClassificationsContainer) {
		const hasButtons = dialog.detectedElements && dialog.detectedElements.some(el => 
			el.type?.toLowerCase().includes('button') || el.tagName === 'BUTTON' || 
			(el.tagName === 'A' && el.role === 'button'));
		buttonClassificationsContainer.style.display = hasButtons ? 'block' : 'none';
	}
	
	// Option classifications container should only be shown if dialog has options
	if (optionClassificationsContainer) {
		const hasOptions = dialog.detectedElements && dialog.detectedElements.some(el => 
			el.type?.toLowerCase().includes('option') || 
			(el.tagName === 'INPUT' && ['checkbox', 'radio'].includes(el.inputType)));
		optionClassificationsContainer.style.display = hasOptions ? 'block' : 'none';
	}
	
	// Always show review container when a dialog is selected
	if (reviewContainer) {
		reviewContainer.style.display = 'block';
	}
	
	// Store dialog globally for later reference
	window.currentDialog = dialog;
	window.currentDialogId = dialog.id;
	
	// Now we need to call a function from popup_fixed.js to handle the element classifications
	// This can be done via a custom event since we can't directly import it
	const dialogDetailsEvent = new CustomEvent('dialogDetailsLoaded', { detail: dialog });
	document.dispatchEvent(dialogDetailsEvent);
}

/**
 * Add a detail item to a container
 * @param {string} label - Detail label
 * @param {string} value - Detail value
 * @param {Element} container - Container element
 */
function addDetailItem(label, value, container) {
	const item = createElement('div', { className: 'detail-item' }, null, container);
	createElement('strong', null, `${label}: `, item);
	createElement('span', null, value, item);
}

/**
 * Get display text for button type
 * @param {string} buttonType - Button type
 * @returns {string} Display text
 */
export function getButtonTypeDisplayText(buttonType) {
	switch (buttonType) {
		case 'accept':
			return 'Accept All Cookies';
		case 'reject':
			return 'Reject Non-Essential Cookies';
		case 'necessary':
			return 'Accept Only Necessary Cookies';
		case 'preferences':
			return 'Cookie Preferences/Settings';
		default:
			return buttonType || 'Unknown';
	}
}

/**
 * Mark a dialog as reviewed
 * @param {string} dialogId - Dialog ID
 */
export function markDialogReviewed(dialogId) {
	markDialogAsReviewed(dialogId, () => {
		// Update UI to reflect the change
		const item = document.querySelector(`.history-item[data-id="${dialogId}"]`);
		if (item) {
			item.classList.remove('not-reviewed');
			item.classList.add('reviewed');
		}
	});
}

/**
 * Display history dialogs in the UI with filter controls
 * @param {Array} dialogs - Array of dialog objects
 */
export function displayHistoryDialogs(dialogs) {
	const historyContainer = document.getElementById('historyList');
	console.log(`displayHistoryDialogs called with ${dialogs?.length || 0} dialogs, container:`, historyContainer);
	
	if (!historyContainer) {
		console.error('History container (historyList) not found!');
		return;
	}
	
	// Clear existing content
	clearElement(historyContainer);
	
	if (!dialogs || dialogs.length === 0) {
		console.log('No dialogs to display, showing empty message');
		historyContainer.innerHTML = '<div class="no-dialogs">No cookie dialogs have been captured yet.</div>';
		return;
	}
	
	// Check if we have filter controls
	const controls = {
		filterSelect: document.getElementById('historyFilter'),
		clearButton: document.getElementById('clearHistoryBtn')
	};
	
	// Sort dialogs by date, newest first
	const sortedDialogs = [...dialogs].sort((a, b) => {
		return new Date(b.capturedAt || 0) - new Date(a.capturedAt || 0);
	});
	
	console.log(`Rendering ${sortedDialogs.length} sorted dialogs`);
	
	// Render the dialog items directly to the history container
	renderDialogItems(sortedDialogs, historyContainer);
	
	// Add filter change handler
	if (controls.filterSelect) {
		// Only add listener if it doesn't already have one
		if (!controls.filterSelect.hasChangeListener) {
			controls.filterSelect.addEventListener('change', () => {
				console.log(`Filter changed to ${controls.filterSelect.value}, loading dialogs...`);
				loadAllDialogs(controls.filterSelect.value, displayHistoryDialogs);
			});
			controls.filterSelect.hasChangeListener = true;
		}
	}
	
	// Add clear history handler
	if (controls.clearButton) {
		// Only add listener if it doesn't already have one
		if (!controls.clearButton.hasClickListener) {
			controls.clearButton.addEventListener('click', () => {
				if (confirm('Are you sure you want to clear all history?')) {
					chrome.storage.local.set({ dialogHistory: [] }, () => {
						// Refresh the list after clearing
						loadAllDialogs('all', displayHistoryDialogs);
					});
				}
			});
			controls.clearButton.hasClickListener = true;
		}
	}
}

/**
 * Switch to the details tab and update UI
 */
export function switchToDetailsTab() {
	// Find the details tab element
	const detailsTab = document.querySelector('.tab[data-tab="details"]');
	
	if (detailsTab) {
		// Programmatically click the tab to trigger the tab's click handler
		// This will call the showTab function in popup_fixed.js
		detailsTab.click();
	} else {
		console.error('Details tab element not found');
	}
} 