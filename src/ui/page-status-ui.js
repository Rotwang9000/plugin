/**
 * Page Status UI Module - Handles the current page status display
 */

import { createElement, clearElement } from '../modules/dom-utils.js';
import { getDialogHistoryAsync } from '../modules/storage.js';
import { sendMessageToActiveTabAsync } from '../api/messaging.js';

/**
 * Update the current page status to show the most recent dialog
 */
export function updateCurrentPageStatus() {
	const statusContainer = document.getElementById('currentPageStatus');
	if (!statusContainer) return;
	
	// Clear existing content
	statusContainer.innerHTML = '';
	
	// Create header and content divs
	const headerDiv = document.createElement('div');
	headerDiv.className = 'detection-header';
	headerDiv.textContent = 'Current Page Status';
	
	const contentDiv = document.createElement('div');
	contentDiv.className = 'detection-content';
	
	// Add loading message initially
	contentDiv.innerHTML = '<p>Checking for cookie dialogs on this page...</p>';
	
	// Append header and content to container
	statusContainer.appendChild(headerDiv);
	statusContainer.appendChild(contentDiv);
	
	// Check for dialog history on the current page
	chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
		if (!tabs || tabs.length === 0) {
			contentDiv.innerHTML = '<p>No active tab detected.</p>';
			return;
		}
		
		const currentTabId = tabs[0].id;
		const currentUrl = tabs[0].url;
		const currentDomain = currentUrl ? new URL(currentUrl).hostname : '';
		
		getDialogHistoryAsync().then(history => {
			// Find dialogs for this domain
			const domainDialogs = history.filter(dialog => 
				dialog.domain && 
				(dialog.domain === currentDomain || 
				 currentDomain.includes(dialog.domain) || 
				 dialog.domain.includes(currentDomain))
			);
			
			if (domainDialogs.length > 0) {
				// Sort by most recent
				domainDialogs.sort((a, b) => {
					return new Date(b.capturedAt) - new Date(a.capturedAt);
				});
				
				// Get most recent dialog
				const latestDialog = domainDialogs[0];
				
				// Format the time
				const captureDate = new Date(latestDialog.capturedAt);
				const formattedDate = captureDate.toLocaleString('en-GB', {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				});
				
				// Determine dialog status and set appropriate styling
				let statusClass = 'status-info';
				let statusTitle = 'Cookie Dialog Detected';
				
				if (latestDialog.method && latestDialog.method.includes('auto')) {
					statusClass = 'status-success';
					statusTitle = 'Cookie Dialog Auto-Handled';
				} else if (latestDialog.reviewed) {
					statusClass = 'status-success';
					statusTitle = 'Cookie Dialog Reviewed';
				}
				
				// Update container styling
				statusContainer.className = `cookie-detection-status ${statusClass}`;
				headerDiv.textContent = statusTitle;
				
				// Create content for the most recent dialog
				contentDiv.innerHTML = '';
				
				// Show domain and date
				const infoDiv = document.createElement('div');
				infoDiv.innerHTML = `
					<p><strong>${latestDialog.domain}</strong></p>
					<p class="small text-muted">Detected: ${formattedDate}</p>
				`;
				
				// Add method info if available
				if (latestDialog.method) {
					const methodP = document.createElement('p');
					methodP.className = 'small text-muted';
					methodP.textContent = `Method: ${latestDialog.method}`;
					infoDiv.appendChild(methodP);
				}
				
				// Make the entire status container clickable to go to details tab
				statusContainer.style.cursor = 'pointer';
				statusContainer.onclick = function() {
					// Store this dialog as the current dialog
					window.currentDialog = latestDialog;
					
					// Switch to the details tab
					const detailsTab = document.querySelector('.tab[data-tab="details"]');
					if (detailsTab) {
						detailsTab.click();
					}
				};
				
				// Add a hint that it's clickable
				const viewDetailsP = document.createElement('p');
				viewDetailsP.className = 'view-details-hint';
				viewDetailsP.textContent = 'Click to view details';
				viewDetailsP.style.textAlign = 'right';
				viewDetailsP.style.color = '#673AB7';
				viewDetailsP.style.fontSize = '12px';
				viewDetailsP.style.marginTop = '10px';
				viewDetailsP.style.fontStyle = 'italic';
				
				contentDiv.appendChild(infoDiv);
				contentDiv.appendChild(viewDetailsP);
			} else {
				// No history found for this domain
				statusContainer.className = 'cookie-detection-status status-none';
				headerDiv.textContent = 'No Cookie Dialogs Detected';
				
				contentDiv.innerHTML = `
					<p>No cookie consent dialogs have been detected on ${currentDomain}.</p>
					<button id="checkCookieBoxes" class="action-button">Scan Page</button>
				`;
				
				// Add event listener to the scan button
				const scanButton = contentDiv.querySelector('#checkCookieBoxes');
				if (scanButton) {
					scanButton.addEventListener('click', function() {
						// Update the status to scanning
						contentDiv.innerHTML = '<p>Scanning for cookie dialogs...</p>';
						
						// Send message to content script to check for cookie boxes
						sendMessageToActiveTabAsync({ action: 'checkForCookieBoxes' })
							.then(response => {
								// Update UI with response
								updateCurrentPageStatus();
							})
							.catch(error => {
								console.error('Error sending message:', error);
								contentDiv.innerHTML = `
									<p>Error scanning page: ${error.message || 'Unknown error'}</p>
									<button id="checkCookieBoxes" class="action-button">Try Again</button>
								`;
								
								// Re-add the event listener to the new button
								const newScanButton = contentDiv.querySelector('#checkCookieBoxes');
								if (newScanButton) {
									newScanButton.addEventListener('click', () => updateCurrentPageStatus());
								}
							});
					});
				}
			}
		}).catch(error => {
			console.error('Error getting dialog history:', error);
			contentDiv.innerHTML = `
				<p>Error loading history: ${error.message || 'Unknown error'}</p>
				<button id="retryButton" class="action-button">Retry</button>
			`;
			
			// Add event listener to retry button
			const retryButton = contentDiv.querySelector('#retryButton');
			if (retryButton) {
				retryButton.addEventListener('click', () => updateCurrentPageStatus());
			}
		});
	});
}

/**
 * Update the page status UI based on detection response
 * @param {Object} response - Response from the cookie detection
 */
export function updatePageStatusUI(response) {
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

/**
 * Handle cookie action clicks (accept/customize)
 * @param {string} action - The action to perform ('accept' or 'customize')
 */
export function handleCookieAction(action) {
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