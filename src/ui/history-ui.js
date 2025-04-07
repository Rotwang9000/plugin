/**
 * UI utilities for history tab
 */

import { createElement, clearElement } from '../modules/dom-utils.js';
import { getDialogHistory, markDialogAsReviewed } from '../modules/storage.js';

/**
 * Load all dialogs from history
 * @param {string} filterType - Type of filter to apply (all, auto_accepted, ignored, current_page)
 * @returns {Promise} Promise that resolves with filtered dialogs
 */
export function loadAllDialogs(filterType = 'all') {
	return new Promise((resolve) => {
		getDialogHistory((dialogs) => {
			// Debug: Log what we're getting
			console.log(`Loading dialogs with filter: ${filterType}. Total: ${dialogs.length}`);
			
			if (filterType === 'all') {
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
				
				// Switch to details tab
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
		
		// Also show the dialog details container and hide the "no selection" message
		const dialogDetailContainer = document.getElementById('dialogDetailContainer');
		const noSelectionMessage = document.getElementById('noSelectionMessage');
		
		if (dialogDetailContainer) dialogDetailContainer.style.display = 'block';
		if (noSelectionMessage) noSelectionMessage.style.display = 'none';
	}
}

/**
 * Render dialog items in a container
 * @param {Array} dialogs - Array of dialog objects
 * @param {Element} container - Container element
 */
export function renderDialogItems(dialogs, container) {
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
		
		// Add detection method
		const methodDisplay = dialog.method 
			? `Method: ${dialog.method}` 
			: 'Manual detection';
		createElement('div', { className: 'history-item-method' }, methodDisplay, item);
		
		// Add date
		createElement('div', { className: 'history-item-date' }, dateStr, item);
		
		// Add indicators for auto-accepted and current page
		const indicators = createElement('div', { className: 'indicators' }, null, item);
		
		// Check if this is auto-accepted
		if (dialog.method && (
			dialog.method.includes('auto') || 
			dialog.method.includes('cloud') || 
			dialog.method.includes('smart')
		)) {
			createElement('span', { 
				className: 'site-indicator auto-accepted',
				title: 'Auto-accepted'
			}, '', indicators);
		}
		
		// Check if this is from the current page - will be determined when displaying
		chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
			if (tabs && tabs[0] && dialog.domain) {
				try {
					const currentUrl = tabs[0].url;
					const currentDomain = new URL(currentUrl).hostname;
					
					if (currentDomain.includes(dialog.domain) || dialog.domain.includes(currentDomain)) {
						createElement('span', { 
							className: 'site-indicator current-page',
							title: 'Current page'
						}, '', indicators);
					}
				} catch (e) {
					console.error('Error checking current page:', e);
				}
			}
		});
	});
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
	
	// Store dialog globally for later reference
	window.currentDialog = dialog;
	window.currentDialogId = dialog.id;
	
	// Now we need to call a function from popup_fixed.js to handle the element classifications
	// This can be done via a custom event since we can't directly import it
	const dialogDetailsEvent = new CustomEvent('dialogDetailsLoaded', { detail: dialog });
	document.dispatchEvent(dialogDetailsEvent);
}

/**
 * Switch to the details tab and update UI
 */
export function switchToDetailsTab() {
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
	
	// Also show the dialog details container and hide the "no selection" message
	const dialogDetailContainer = document.getElementById('dialogDetailContainer');
	const noSelectionMessage = document.getElementById('noSelectionMessage');
	
	if (dialogDetailContainer) dialogDetailContainer.style.display = 'block';
	if (noSelectionMessage) noSelectionMessage.style.display = 'none';
	
	// Dispatch an event for popup_fixed.js to handle the classifications
	if (window.currentDialog) {
		const dialogDetailsEvent = new CustomEvent('switchedToDetailsTab', { 
			detail: window.currentDialog 
		});
		document.dispatchEvent(dialogDetailsEvent);
	}
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