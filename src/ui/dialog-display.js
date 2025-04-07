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
 * @param {Object} dialog - Dialog object with detected elements
 * @param {Element} container - Container to display elements
 * @param {boolean} devMode - Whether dev mode is enabled
 */
export function displayDetectedElements(dialog, container, devMode) {
	// Check if we have a valid dialog with detected elements
	if (!container) {
		console.error('Container is missing for displaying detected elements');
		return;
	}
	
	// Ensure dialog has elements property, even if empty array
	const elements = dialog?.detectedElements || [];
	
	// Clear container
	clearElement(container);
	
	// If no elements detected, show a message
	if (elements.length === 0) {
		container.innerHTML = '<div class="no-elements-message">No elements detected in this dialog.</div>';
		return;
	}
	
	// Check for dev mode parameter or detect from DOM
	// If not provided, detect by looking at the body class
	if (devMode === undefined) {
		devMode = !document.body.classList.contains('simple-mode');
	}
	
	console.log(`Displaying ${elements.length} detected elements in ${devMode ? 'dev' : 'regular'} mode`);
	
	// Get classification containers
	const buttonClassificationsContainer = document.getElementById('buttonClassificationsList');
	const optionClassificationsContainer = document.getElementById('optionClassificationsList');
	
	// Get parent containers
	const buttonClassificationsParent = buttonClassificationsContainer?.parentElement;
	const optionClassificationsParent = optionClassificationsContainer?.parentElement;
	
	// Handle visibility of classification containers based on dev mode
	if (buttonClassificationsParent) {
		buttonClassificationsParent.style.display = devMode ? 'block' : 'none';
	}
	
	if (optionClassificationsParent) {
		optionClassificationsParent.style.display = devMode ? 'block' : 'none';
	}
	
	// Different display based on dev mode
	if (devMode) {
		// DEV MODE - Show detailed element information
		
		// Add summary info
		const summaryInfo = createElement('div', { className: 'elements-summary' }, null, container);
		
		// Count buttons and options
		const buttons = elements.filter(el => el.type?.toLowerCase().includes('button') || el.tagName === 'BUTTON');
		const options = elements.filter(el => el.type?.toLowerCase().includes('option') || el.tagName === 'INPUT' && ['checkbox', 'radio'].includes(el.inputType));
		const links = elements.filter(el => el.tagName === 'A' || el.isLink);
		
		// Create summary text
		summaryInfo.innerHTML = `
			<p>Total elements: ${elements.length}</p>
			<p>Buttons: ${buttons.length}</p>
			<p>Options: ${options.length}</p>
			<p>Links: ${links.length}</p>
		`;
		
		// Create the heading row
		const headingRow = createElement('div', { className: 'detected-element-heading' }, null, container);
		headingRow.innerHTML = `
			<div class="element-column">Element</div>
			<div class="type-column">Type</div>
			<div class="action-column">Action</div>
		`;
		
		// Create a row for each detected element
		elements.forEach((element, index) => {
			const row = createElement('div', { className: 'detected-element-row' }, null, container);
			
			// Text column with element info
			const elementText = createElement('div', { className: 'element-column' }, null, row);
			
			// Create text content with appropriate information
			let displayText = element.text || element.value || 'No text';
			if (element.tagName) {
				displayText = `<${element.tagName.toLowerCase()}> ${displayText}`;
			}
			
			// Add href for links
			if (element.href) {
				displayText += `<br><span class="element-href">${element.href}</span>`;
			}
			
			elementText.innerHTML = displayText;
			
			// Type selection column
			const typeColumn = createElement('div', { className: 'type-column' }, null, row);
			
			if (element.type) {
				typeColumn.textContent = element.type;
			} else {
				typeColumn.textContent = 'Unknown';
				typeColumn.style.color = '#999';
			}
			
			// Action column
			const actionColumn = createElement('div', { className: 'action-column' }, null, row);
			
			// Add highlight button
			const highlightButton = createElement('button', { 
				className: 'action-button small',
				dataset: { elementIndex: index }
			}, 'Highlight', actionColumn);
			
			// Add click button
			const clickButton = createElement('button', { 
				className: 'action-button small',
				style: 'margin-left: 5px;',
				dataset: { elementIndex: index }
			}, 'Click', actionColumn);
			
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
	} else {
		// REGULAR MODE - Just show important links
		
		// Extract important links
		const importantLinks = elements.filter(element => isPrivacyOrSettingsLink(element));
		
		// Display important links if found
		if (importantLinks.length > 0) {
			// Create a header for the links section
			createElement('h4', null, 'Privacy & Settings Links', container);
			
			// Create a list for links
			const linksList = createElement('ul', {
				style: 'padding-left: 20px; margin-top: 5px;'
			}, null, container);
			
			// Add each link to the list
			importantLinks.forEach(link => {
				const listItem = createElement('li', null, null, linksList);
				
				if (link.href && link.text) {
					// Create an actual link if we have href
					createElement('a', {
						href: link.href,
						target: '_blank',
						style: 'text-decoration: underline; color: #0066cc;'
					}, link.text, listItem);
				} else {
					// Otherwise just show the text
					createElement('span', null, link.text || 'Unnamed link', listItem);
				}
			});
		} else {
			// Show "no links found" message in non-dev mode
			createElement('p', {
				style: 'color: #666; font-style: italic; margin-top: 10px;'
			}, 'No privacy policy, cookie settings or terms links found.', container);
		}
	}
}

/**
 * Check if an element is likely a privacy or settings link
 * @param {Object} element - Element to check
 * @returns {boolean} True if element is likely a privacy/settings link
 */
function isPrivacyOrSettingsLink(element) {
	if (!element.text) return false;
	
	const textLower = element.text.toLowerCase();
	const href = element.href ? element.href.toLowerCase() : '';
	const tagName = element.tagName ? element.tagName.toLowerCase() : '';
	
	// Keywords that suggest privacy/settings related content
	const keywords = [
		'privacy', 'policy', 'cookie', 'terms', 'conditions', 
		'preferences', 'settings', 'more info', 'learn more', 
		'manage', 'customize', 'customise', 'personal data',
		'data protection', 'choices', 'opt', 'preference', 'gdpr'
	];
	
	// Check text content for keywords
	const hasKeywordInText = keywords.some(keyword => textLower.includes(keyword));
	
	// Check href for keywords if it exists
	const hasKeywordInHref = href && keywords.some(keyword => href.includes(keyword));
	
	// Check if it's a link or button
	const isLinkOrButton = 
		tagName === 'a' || 
		tagName === 'button' ||
		element.role === 'button' || 
		element.isButton;
	
	return isLinkOrButton && (hasKeywordInText || hasKeywordInHref);
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