/**
 * UI utilities for history tab
 */

import { createElement, clearElement } from '../modules/dom-utils.js';
import { getDialogHistory, markDialogAsReviewed } from '../modules/storage.js';

/**
 * Load all dialogs from history
 * @returns {Promise} Promise that resolves with dialogs
 */
export function loadAllDialogs() {
	return new Promise((resolve) => {
		getDialogHistory((dialogs) => {
			resolve(dialogs);
		});
	});
}

/**
 * Display captured cookie dialogs in history panel
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
	
	// Render the dialog items
	renderDialogItems(sortedDialogs, historyListContainer);
	
	// Add click event to items
	const items = historyListContainer.querySelectorAll('.history-item');
	items.forEach(item => {
		item.addEventListener('click', () => {
			// Remove active class from all items
			items.forEach(i => i.classList.remove('active'));
			
			// Add active class to clicked item
			item.classList.add('active');
			
			// Get dialog data
			const dialogId = item.dataset.id;
			const dialog = sortedDialogs.find(d => d.id === dialogId);
			
			if (dialog) {
				displayDialogDetails(dialog);
			}
		});
	});
	
	// Click the first item to display its details
	if (items.length > 0) {
		items[0].click();
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
			? new Date(dialog.capturedAt).toLocaleString() 
			: 'Unknown date';
		
		const item = createElement('div', {
			className: `history-item ${reviewClass}`,
			dataset: { id: dialog.id }
		}, null, container);
		
		// Add domain/URL
		createElement('div', { className: 'history-item-domain' }, 
			(dialog.domain || new URL(dialog.url).hostname), item);
		
		// Add detection method
		const methodDisplay = dialog.detectionMethod 
			? `Detected via: ${dialog.detectionMethod}` 
			: 'Automatic detection';
		createElement('div', { className: 'history-item-method' }, methodDisplay, item);
		
		// Add date
		createElement('div', { className: 'history-item-date' }, dateStr, item);
	});
}

/**
 * Display details for a specific dialog
 * @param {Object} dialog - Dialog object to display
 */
function displayDialogDetails(dialog) {
	const detailsContainer = document.getElementById('dialogDetails');
	if (!detailsContainer) return;
	
	// Clear previous details
	clearElement(detailsContainer);
	
	// Create details wrapper
	const detailsWrapper = createElement('div', { className: 'details-wrapper' }, null, detailsContainer);
	
	// Dialog info
	const infoSection = createElement('div', { className: 'detail-section' }, null, detailsWrapper);
	createElement('h3', null, 'Dialog Information', infoSection);
	
	// Create detail items
	addDetailItem('URL', dialog.url, infoSection);
	addDetailItem('Domain', dialog.domain || new URL(dialog.url).hostname, infoSection);
	addDetailItem('Detected On', new Date(dialog.capturedAt).toLocaleString(), infoSection);
	addDetailItem('Detection Method', dialog.detectionMethod || 'Automatic detection', infoSection);
	
	// Button information
	const buttonsSection = createElement('div', { className: 'detail-section' }, null, detailsWrapper);
	createElement('h3', null, 'Button Details', buttonsSection);
	
	if (dialog.buttonType) {
		const buttonTypeText = getButtonTypeDisplayText(dialog.buttonType);
		addDetailItem('Button Type', buttonTypeText, buttonsSection);
	}
	
	if (dialog.buttonText) {
		addDetailItem('Button Text', dialog.buttonText, buttonsSection);
	}
	
	// Elements section
	const elementsSection = createElement('div', { className: 'detail-section' }, null, detailsWrapper);
	createElement('h3', null, 'Detected Elements', elementsSection);
	
	if (dialog.selector) {
		addDetailItem('Element Selector', dialog.selector, elementsSection);
	}
	
	if (dialog.html) {
		// Create HTML preview with toggle
		const htmlPreview = createElement('div', { className: 'detail-item' }, null, elementsSection);
		createElement('strong', null, 'HTML Content: ', htmlPreview);
		
		const toggleButton = createElement('button', {
			className: 'action-button',
			style: 'margin-left: 10px;'
		}, 'Show/Hide HTML', htmlPreview);
		
		const contentDiv = createElement('div', {
			className: 'html-content',
			style: 'display: none; max-height: 300px; overflow: auto; margin-top: 10px; font-family: monospace; font-size: 12px; white-space: pre-wrap; background-color: #f8f8f8; padding: 10px; border-radius: 3px;'
		}, null, htmlPreview);
		
		// Format HTML with line numbers
		contentDiv.innerHTML = dialog.html;
		
		// Toggle visibility on click
		toggleButton.addEventListener('click', () => {
			contentDiv.style.display = contentDiv.style.display === 'none' ? 'block' : 'none';
		});
	}
	
	// Review section
	const reviewSection = createElement('div', { className: 'detail-section' }, null, detailsWrapper);
	createElement('h3', null, 'Review', reviewSection);
	
	// Add review status
	addDetailItem('Status', dialog.reviewed ? 'Reviewed' : 'Not reviewed', reviewSection);
	
	// Add mark as reviewed button if not already reviewed
	if (!dialog.reviewed) {
		const reviewButton = createElement('button', { className: 'action-button' }, 
			'Mark as Reviewed', reviewSection);
		
		reviewButton.addEventListener('click', () => {
			markDialogAsReviewed(dialog.id, () => {
				// Update the UI
				reviewButton.disabled = true;
				reviewButton.textContent = 'Marked as Reviewed';
				
				// Add reviewed class to the item
				const item = document.querySelector(`.history-item[data-id="${dialog.id}"]`);
				if (item) {
					item.classList.remove('not-reviewed');
					item.classList.add('reviewed');
				}
			});
		});
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