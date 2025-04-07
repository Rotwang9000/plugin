/**
 * Messaging module for cross-script communication
 */

/**
 * Send a message to the background script
 * @param {Object} message - Message object to send
 * @param {Function} callback - Callback for response
 */
export function sendMessageToBackground(message, callback) {
	try {
		// Check if we have a valid runtime before sending
		if (!chrome || !chrome.runtime) {
			console.error('Chrome runtime is not available');
			if (typeof callback === 'function') {
				callback({ error: 'Extension runtime is not available' });
			}
			return;
		}
		
		chrome.runtime.sendMessage(message, response => {
			if (chrome.runtime.lastError) {
				console.error('Error sending message:', chrome.runtime.lastError);
				if (typeof callback === 'function') {
					callback({ error: chrome.runtime.lastError.message });
				}
				return;
			}
			
			if (typeof callback === 'function') {
				callback(response);
			}
		});
	} catch (error) {
		console.error('Failed to send message:', error);
		if (typeof callback === 'function') {
			callback({ error: error.message || 'Unknown error' });
		}
	}
}

/**
 * Promise-based wrapper for sendMessageToBackground
 * @param {Object} message - Message object to send
 * @returns {Promise} - Promise resolving with the response
 */
export function sendMessageToBackgroundAsync(message) {
	return new Promise((resolve, reject) => {
		try {
			sendMessageToBackground(message, response => {
				if (response && response.error) {
					reject(new Error(response.error));
				} else {
					resolve(response || {});
				}
			});
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Send a message to a specific tab
 * @param {number} tabId - ID of tab to send message to
 * @param {Object} message - Message object to send
 * @param {Function} callback - Callback for response
 */
export function sendMessageToTab(tabId, message, callback) {
	try {
		chrome.tabs.sendMessage(tabId, message, response => {
			// Check for runtime errors first
			if (chrome.runtime.lastError) {
				const errorMessage = chrome.runtime.lastError.message || 'Unknown error sending message to tab';
				console.error('Error sending message to tab:', errorMessage);
				
				// Content script may not be loaded yet
				const contentScriptMissing = 
					errorMessage.includes('Receiving end does not exist') || 
					errorMessage.includes('Could not establish connection');
					
				if (contentScriptMissing) {
					if (typeof callback === 'function') {
						callback({ 
							error: 'Content script not yet loaded',
							contentScriptNotReady: true 
						});
					}
				} else {
					if (typeof callback === 'function') {
						callback({ error: errorMessage });
					}
				}
				return;
			}
			
			// No error, proceed with response
			if (typeof callback === 'function') {
				callback(response);
			}
		});
	} catch (error) {
		console.error('Failed to send message to tab:', error);
		if (typeof callback === 'function') {
			callback({ error: error.message || 'Unknown error' });
		}
	}
}

/**
 * Promise-based wrapper for sendMessageToTab
 * @param {number} tabId - ID of tab to send message to
 * @param {Object} message - Message object to send
 * @returns {Promise} - Promise resolving with the response
 */
export function sendMessageToTabAsync(tabId, message) {
	return new Promise((resolve, reject) => {
		try {
			sendMessageToTab(tabId, message, response => {
				if (response && response.error) {
					reject(new Error(response.error));
				} else {
					resolve(response || {});
				}
			});
		} catch (error) {
			reject(error);
		}
	});
}

/**
 * Send a message to the active tab
 * @param {Object} message - Message object to send
 * @param {Function} callback - Callback for response
 */
export function sendMessageToActiveTab(message, callback) {
	try {
		// Check if we have a valid tabs API before sending
		if (!chrome || !chrome.tabs) {
			console.error('Chrome tabs API is not available');
			if (typeof callback === 'function') {
				callback({ error: 'Extension tabs API is not available' });
			}
			return;
		}
		
		chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
			if (tabs.length === 0) {
				console.error('No active tab found');
				if (typeof callback === 'function') {
					callback({ error: 'No active tab found' });
				}
				return;
			}
			
			// Check if this tab can receive messages
			const tabUrl = tabs[0].url || '';
			
			// Only block browser internal pages that can't support content scripts
			const browserPaths = ['chrome:', 'chrome-extension:', 'devtools:', 'view-source:', 'about:'];
			const isBrowserPage = browserPaths.some(path => tabUrl.startsWith(path));
			
			if (isBrowserPage) {
				console.log('Tab is a browser page that does not support content scripts:', tabUrl);
				if (typeof callback === 'function') {
					callback({ error: 'Tab does not support content scripts' });
				}
				return;
			}
			
			// For all other URLs, attempt to send the message
			sendMessageToTab(tabs[0].id, message, callback);
		});
	} catch (error) {
		console.error('Failed to get active tab:', error);
		if (typeof callback === 'function') {
			callback({ error: error.message || 'Unknown error' });
		}
	}
}

/**
 * Promise-based wrapper for sendMessageToActiveTab
 * @param {Object} message - Message object to send
 * @returns {Promise} - Promise resolving with the response
 */
export function sendMessageToActiveTabAsync(message) {
	return new Promise((resolve, reject) => {
		try {
			sendMessageToActiveTab(message, response => {
				// Special handling for connection errors that shouldn't stop functionality
				if (response && response.error) {
					// Handle browser pages
					if (response.error === 'Tab does not support content scripts' ||
						response.error === 'No active tab found' ||
						response.error === 'Extension tabs API is not available') {
						
						resolve({ 
							unsupportedTab: true,
							error: response.error,
							dialogFound: false 
						});
					} 
					// Handle content script not ready yet
					else if (response.contentScriptNotReady || 
							(typeof response.error === 'string' && 
							 response.error.includes('Receiving end does not exist'))) {
						
						resolve({ 
							contentScriptNotReady: true,
							error: "Content script not yet loaded",
							dialogFound: false
						});
					}
					else {
						// For other unexpected errors, still reject
						reject(new Error(response.error));
					}
				} else {
					// Normal success case
					resolve(response || {});
				}
			});
		} catch (error) {
			console.error('Error in sendMessageToActiveTabAsync:', error);
			reject(error);
		}
	});
}

/**
 * Register a message handler
 * @param {Object} handlers - Object mapping action names to handler functions
 * @returns {Function} - Message listener function that was registered
 */
export function registerMessageHandlers(handlers) {
	if (!handlers || typeof handlers !== 'object') {
		console.error('Invalid handlers object');
		return null;
	}
	
	const listener = (message, sender, sendResponse) => {
		if (!message || !message.action) {
			return false;
		}
		
		const handler = handlers[message.action];
		if (typeof handler === 'function') {
			try {
				const result = handler(message, sender);
				
				// If handler returned a promise, wait for it
				if (result instanceof Promise) {
					result.then(data => {
						sendResponse(data);
					}).catch(error => {
						console.error(`Error in handler for ${message.action}:`, error);
						sendResponse({ error: error.message || 'Unknown error' });
					});
					
					return true; // Keep the message channel open
				} else if (result !== undefined) {
					// If handler returned a value, send it
					sendResponse(result);
				}
			} catch (error) {
				console.error(`Error in handler for ${message.action}:`, error);
				sendResponse({ error: error.message || 'Unknown error' });
			}
		} else {
			console.warn(`No handler for action: ${message.action}`);
		}
		
		return true; // Keep the message channel open
	};
	
	chrome.runtime.onMessage.addListener(listener);
	return listener;
}

/**
 * Remove a message handler
 * @param {Function} listener - Listener function to remove
 */
export function unregisterMessageHandler(listener) {
	if (typeof listener === 'function') {
		chrome.runtime.onMessage.removeListener(listener);
	}
} 