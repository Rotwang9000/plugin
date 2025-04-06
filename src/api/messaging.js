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
 * Send a message to a specific tab
 * @param {number} tabId - ID of tab to send message to
 * @param {Object} message - Message object to send
 * @param {Function} callback - Callback for response
 */
export function sendMessageToTab(tabId, message, callback) {
	try {
		chrome.tabs.sendMessage(tabId, message, response => {
			if (chrome.runtime.lastError) {
				console.error('Error sending message to tab:', chrome.runtime.lastError);
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
		console.error('Failed to send message to tab:', error);
		if (typeof callback === 'function') {
			callback({ error: error.message || 'Unknown error' });
		}
	}
}

/**
 * Send a message to the active tab
 * @param {Object} message - Message object to send
 * @param {Function} callback - Callback for response
 */
export function sendMessageToActiveTab(message, callback) {
	try {
		chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
			if (tabs.length === 0) {
				console.error('No active tab found');
				if (typeof callback === 'function') {
					callback({ error: 'No active tab found' });
				}
				return;
			}
			
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