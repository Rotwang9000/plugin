/**
 * UI utilities for displaying cookie dialogs
 */

import { createElement, clearElement } from '../modules/dom-utils.js';

/**
 * Display cookie detection status
 * @param {Object} response - Detection response
 * @param {Element} container - Container to display status
 */
export function displayDetectionStatus(response, container) {
	if (!container) return;
	
	// Clear container
	clearElement(container);
	
	// Create status element
	const statusDiv = createElement('div', {
		className: `cookie-detection-status ${response.dialogFound ? 'status-success' : 'status-none'}`
	}, null, container);
	
	// Create header
	const headerDiv = createElement('div', { className: 'detection-header' }, null, statusDiv);
	
	// Set header content based on detection
	if (response.dialogFound) {
		headerDiv.textContent = 'Cookie Dialog Detected';
	} else {
		headerDiv.textContent = 'No Cookie Dialog Detected';
	}
	
	// Create content
	const contentDiv = createElement('div', { className: 'detection-content' }, null, statusDiv);
	
	// Set content based on detection
	if (response.dialogFound) {
		createElement('p', null, 'A cookie consent dialog was found on this page.', contentDiv);
		
		// Create button row
		const actionDiv = createElement('div', { className: 'action-buttons' }, null, contentDiv);
		
		// Add accept button
		const acceptButton = createElement('button', { 
			className: 'action-button',
			id: 'acceptCookiesBtn'
		}, 'Accept Cookies', actionDiv);
		
		// Add reject button
		const rejectButton = createElement('button', { 
			className: 'action-button',
			id: 'rejectCookiesBtn',
			style: 'margin-left: 10px;'
		}, 'Reject Cookies', actionDiv);
		
		// Add settings button
		const settingsButton = createElement('button', { 
			className: 'action-button',
			id: 'customizeCookiesBtn',
			style: 'margin-left: 10px;'
		}, 'Customize Settings', actionDiv);
		
		// Add view details link
		createElement('a', { 
			className: 'view-details',
			id: 'viewDialogDetails'
		}, 'View dialog details', contentDiv);
	} else {
		createElement('p', null, 'No cookie consent dialog was detected on this page.', contentDiv);
		
		// Add check button
		const checkButton = createElement('button', { 
			className: 'action-button',
			id: 'checkCookieBoxes'
		}, 'Check for Cookie Dialog', contentDiv);
	}
}

/**
 * Display detected cookie dialog elements
 * @param {Object} response - Detection response
 * @param {Element} container - Container to display elements
 */
export function displayDetectedElements(response, container) {
	if (!container || !response.elements || response.elements.length === 0) {
		return;
	}
	
	// Clear container
	clearElement(container);
	
	// Create elements header
	createElement('h3', null, 'Detected Elements', container);
	
	// Create elements list
	const elementsList = createElement('div', { className: 'elements-list' }, null, container);
	
	// Add each element
	response.elements.forEach((element, index) => {
		const elementRow = createElement('div', { className: 'element-row' }, null, elementsList);
		
		// Element number
		createElement('div', { className: 'element-number' }, `#${index + 1}`, elementRow);
		
		// Element type
		createElement('div', { className: 'element-type' }, element.type || 'Unknown', elementRow);
		
		// Element selector
		createElement('div', { className: 'element-selector' }, element.selector || '', elementRow);
		
		// Element actions
		const actionsDiv = createElement('div', { className: 'element-actions' }, null, elementRow);
		
		// Add highlight button
		const highlightButton = createElement('button', { 
			className: 'action-button small',
			dataset: { elementIndex: index }
		}, 'Highlight', actionsDiv);
		
		// Add click button
		const clickButton = createElement('button', { 
			className: 'action-button small',
			style: 'margin-left: 5px;',
			dataset: { elementIndex: index }
		}, 'Click', actionsDiv);
		
		// Add event listeners
		highlightButton.addEventListener('click', () => {
			// Send message to highlight element
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (tabs.length > 0) {
					chrome.tabs.sendMessage(tabs[0].id, {
						action: 'highlightElement',
						elementIndex: index
					});
				}
			});
		});
		
		clickButton.addEventListener('click', () => {
			// Send message to click element
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (tabs.length > 0) {
					chrome.tabs.sendMessage(tabs[0].id, {
						action: 'clickElement',
						elementIndex: index
					});
				}
			});
		});
	});
	
	// Button type detection
	if (response.buttonTypes) {
		const buttonSection = createElement('div', { className: 'button-section' }, null, container);
		createElement('h4', null, 'Detected Button Types', buttonSection);
		
		// Create button type list
		const buttonList = createElement('div', { className: 'button-type-list' }, null, buttonSection);
		
		// Add each button type
		for (const [type, count] of Object.entries(response.buttonTypes)) {
			createElement('div', { className: 'button-type-item' }, 
				`${type}: ${count}`, buttonList);
		}
	}
}

/**
 * Format a time string
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
function formatTime(ms) {
	if (ms < 1000) {
		return `${ms}ms`;
	} else {
		return `${(ms / 1000).toFixed(2)}s`;
	}
}

/**
 * Apply highlighting to an element
 * @param {Element} element - Element to highlight
 */
function highlightElement(element) {
	// Save original styles
	const originalOutline = element.style.outline;
	const originalOutlineOffset = element.style.outlineOffset;
	const originalTransition = element.style.transition;
	
	// Apply highlight
	element.style.outline = '2px solid red';
	element.style.outlineOffset = '2px';
	element.style.transition = 'outline 0.3s ease-in-out';
	
	// Remove highlight after 2 seconds
	setTimeout(() => {
		element.style.outline = originalOutline;
		element.style.outlineOffset = originalOutlineOffset;
		element.style.transition = originalTransition;
	}, 2000);
} 