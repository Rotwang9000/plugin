/**
 * Check if an element is visible
 * @param {Element} element - The element to check
 * @returns {boolean} Whether the element is visible
 */
function isElementVisible(element) {
	if (!element) return false;
	
	const style = window.getComputedStyle(element);
	return style.display !== 'none' && 
		style.visibility !== 'hidden' && 
		style.opacity !== '0' &&
		element.offsetWidth > 0 &&
		element.offsetHeight > 0;
}

/**
 * Check if an element has a high z-index or is positioned for visibility
 * @param {Element} element - The element to check
 * @returns {boolean} Whether the element likely has high visibility
 */
function hasHighZIndex(element) {
	const style = window.getComputedStyle(element);
	const zIndex = parseInt(style.zIndex, 10);
	
	// Check if it has a high z-index (common for overlays and popups)
	if (!isNaN(zIndex) && zIndex > 100) {
		return true;
	}
	
	// Check if it's fixed or absolute positioned (common for overlays)
	const position = style.position;
	if (position === 'fixed' || position === 'absolute') {
		// Check if it's near the top or bottom of the viewport
		const rect = element.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		
		// Bottom banners are often within 200px of the bottom
		if (viewportHeight - rect.bottom < 200) {
			return true;
		}
		
		// Top/center banners often start in the top half of the screen
		if (rect.top < viewportHeight / 2 && rect.height > 50) {
			return true;
		}
	}
	
	return false;
}

/**
 * Click an element with safety checks to prevent page navigation
 * @param {Element} element - The element to click
 * @returns {boolean} Whether the click was successful
 */
function clickElement(element) {
	// Import settings to access clickedElements
	const { clickedElements } = require('../modules/settings.js');
	
	// Check if the element has already been clicked
	if (clickedElements.has(element)) {
		console.log('Cookie Consent Manager: Button already clicked, ignoring this click attempt');
		return false;
	}
	
	// Extra safety check for informational links that shouldn't be clicked
	if (element.tagName === 'A') {
		const text = element.textContent.toLowerCase().trim();
		const href = element.getAttribute('href') || '';
		const target = element.getAttribute('target') || '';
		const rel = element.getAttribute('rel') || '';
		const ariaLabel = element.getAttribute('aria-label') || '';
		
		// Informational link indicators
		const informationalPhrases = [
			'more about', 'learn more', 'read more', 'cookie policy', 'privacy policy',
			'cookie information', 'more information', 'our cookies', 'data protection',
			'learn about', 'find out more', 'privacy statement'
		];
		
		// Don't click if:
		// 1. It's a link with target="_blank" (opens in new tab)
		// 2. Contains text that suggests it's informational
		// 3. Has rel="noopener" which often indicates external links
		// 4. Points to a URL with "policy", "cookies", "privacy", etc.
		if ((target === '_blank' || rel.includes('noopener')) && 
			(informationalPhrases.some(phrase => text.includes(phrase) || ariaLabel.includes(phrase)) ||
			 href.includes('policy') || href.includes('cookie') || href.includes('privacy') || 
			 href.includes('data-protection') || href.includes('legal'))) {
			
			console.log('Cookie Consent Manager: Detected informational link, not clicking:', text);
			return false;
		}
	}
	
	// Mark this element as clicked before proceeding
	clickedElements.set(element, true);
	
	if (element && isElementVisible(element)) {
		// Check if this element might open a new tab or page
		const mightOpenNewTab = (element.tagName === 'A' && 
			(element.getAttribute('target') === '_blank' || 
			 element.getAttribute('rel')?.includes('noopener'))) ||
			(element.getAttribute('onclick') && 
			(element.getAttribute('onclick').includes('window.open') || 
			 element.getAttribute('onclick').includes('open(')));
		
		if (mightOpenNewTab) {
			// Do a final safety check - don't click links with phrases that suggest information pages
			const text = element.textContent.toLowerCase().trim();
			const informationalPhrases = ['more about', 'learn more', 'read more', 'cookie policy', 'privacy policy'];
			
			if (informationalPhrases.some(phrase => text.includes(phrase))) {
				console.log('Cookie Consent Manager: Skipping link that appears to be informational:', text);
				return false;
			}
			
			// Record this as a potential new tab trigger
			const currentUrl = window.location.href;
			chrome.storage.local.get(['recentlyOpenedTabs'], (result) => {
				const recentlyOpenedTabs = result.recentlyOpenedTabs || [];
				recentlyOpenedTabs.push({
					url: currentUrl,
					timestamp: Date.now()
				});
				chrome.storage.local.set({ recentlyOpenedTabs: recentlyOpenedTabs });
			});
		}
		
		// First check if we're in a form that might submit
		const form = element.closest('form');
		
		// Check if we're in a dialog-like container
		const isInDialog = element.closest('[role="dialog"]') || 
						  element.closest('[aria-modal="true"]') ||
						  element.closest('.cookie-banner') ||
						  element.closest('.cookie-dialog') ||
						  element.closest('.consent-dialog') ||
						  element.closest('[data-testid*="cookie"]');
		
		// Check for Twitter-style React/React Native buttons with css- and r- classes
		const hasTwitterStyleClasses = element.className && 
			(typeof element.className === 'string') && 
			element.className.split(' ').some(cls => cls.startsWith('css-') || cls.startsWith('r-'));
		
		if (form) {
			// Prevent the form from submitting by aggressively overriding the submit behavior
			try {
				// Store original methods
				const originalOnSubmit = form.onsubmit;
				const originalSubmit = form.submit;
				const originalAction = form.action;
				
				// Completely override form submission
				form.onsubmit = (e) => {
					if (e) {
						e.preventDefault();
						e.stopPropagation();
						e.stopImmediatePropagation();
					}
					return false;
				};
				
				// Also override the submit method
				form.submit = () => {
					console.log('Cookie Consent Manager: Prevented form submission');
					return false;
				};
				
				// Temporarily change the action to prevent navigation
				if (form.action) {
					form.action = 'javascript:void(0);';
				}
				
				// Block all form events
				const blockSubmit = (e) => {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					return false;
				};
				form.addEventListener('submit', blockSubmit, true);
				
				// Add click event listener to prevent default on the element
				const clickHandler = (e) => {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
				};
				element.addEventListener('click', clickHandler, true);
				
				// Create a backup - if clicking the element somehow navigates away,
				// restore the page in a few milliseconds
				const currentLocation = window.location.href;
				const backupTimer = setTimeout(() => {
					// Check if location changed
					if (window.location.href !== currentLocation) {
						console.log('Cookie Consent Manager: Detected navigation after click, restoring page');
						history.back();
					}
				}, 300);
				
				// Simulate the click but prevent default behavior
				try {
					// Use a direct DOM event that bypasses any handlers
					const clickEvent = new MouseEvent('click', {
						bubbles: true,
						cancelable: true,
						view: window
					});
					
					// Dispatch the event directly on the element
					element.dispatchEvent(clickEvent);
				} catch (error) {
					// Fallback to normal click if MouseEvent fails
					element.click();
				}
				
				// Clean up
				clearTimeout(backupTimer);
				form.removeEventListener('submit', blockSubmit, true);
				element.removeEventListener('click', clickHandler, true);
				
				// Restore original form properties
				form.submit = originalSubmit;
				form.onsubmit = originalOnSubmit;
				if (form.action === 'javascript:void(0);') {
					form.action = originalAction;
				}
				
				console.log('Cookie Consent Manager: Clicked button in form with submission prevention', element);
			} catch (error) {
				console.error('Error in form click handling:', error);
				// Last resort
				element.click();
			}
		} else if (isInDialog || 
				  element.tagName === 'BUTTON' || 
				  element.tagName === 'A' || 
				  element.getAttribute('role') === 'button' ||
				  hasTwitterStyleClasses) {
			try {
				// Set a temporary event listener to prevent default actions
				const clickHandler = (e) => {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
				};
				element.addEventListener('click', clickHandler, true);
				
				// Add global safeguards to prevent page reload/navigation
				const originalSubmit = HTMLFormElement.prototype.submit;
				const originalOnBeforeUnload = window.onbeforeunload;
				
				// Override form submit globally (temporarily)
				HTMLFormElement.prototype.submit = function() {
					console.log('Cookie Consent Manager: Prevented global form submission');
					return false;
				};
				
				// Add a beforeunload handler to catch navigation attempts
				window.onbeforeunload = (e) => {
					e.preventDefault();
					e.returnValue = '';
					return '';
				};
				
				// Create a backup - if clicking the element somehow navigates away,
				// restore the page in a few milliseconds
				const currentLocation = window.location.href;
				const backupTimer = setTimeout(() => {
					// Check if location changed
					if (window.location.href !== currentLocation) {
						console.log('Cookie Consent Manager: Detected navigation after click, restoring page');
						window.stop(); // Stop any current page load
						history.back();
					}
					
					// Restore original functionality
					HTMLFormElement.prototype.submit = originalSubmit;
					window.onbeforeunload = originalOnBeforeUnload;
				}, 300);
				
				// Try to click without triggering default behavior
				try {
					// Approach 1: Create a more comprehensive mouse event for React components
					// Create both mousedown and mouseup events followed by click
					const eventOptions = {
						bubbles: true,
						cancelable: true,
						view: window,
						detail: 1, // simulates single click
						screenX: 0,
						screenY: 0,
						clientX: 0,
						clientY: 0,
						ctrlKey: false,
						altKey: false,
						shiftKey: false,
						metaKey: false,
						button: 0, // primary button (left)
						relatedTarget: null
					};
					
					// Dispatch mousedown, mouseup, then click in sequence
					element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
					element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
					element.dispatchEvent(new MouseEvent('click', eventOptions));
					
					// For React components, try direct activation if click didn't work
					if (hasTwitterStyleClasses || element.getAttribute('role') === 'button') {
						// For many React components, dispatching 'focus' first helps
						element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
						// Then try to trigger an Enter keypress which often activates buttons
						element.dispatchEvent(new KeyboardEvent('keydown', { 
							bubbles: true, 
							cancelable: true,
							key: 'Enter',
							code: 'Enter',
							keyCode: 13
						}));
					}
				} catch (error) {
					// Approach 2: Clone the element, click the clone, then remove it
					try {
						// Create a clone of the button without event listeners
						const clone = element.cloneNode(true);
						clone.style.position = 'absolute';
						clone.style.opacity = '0';
						clone.style.pointerEvents = 'none';
						
						// Append to body, click, then remove
						document.body.appendChild(clone);
						clone.click();
						document.body.removeChild(clone);
					} catch (cloneError) {
						// Last resort: regular click
						element.click();
					}
				}
				
				// Clean up
				clearTimeout(backupTimer);
				element.removeEventListener('click', clickHandler, true);
				HTMLFormElement.prototype.submit = originalSubmit;
				window.onbeforeunload = originalOnBeforeUnload;
				
				console.log('Cookie Consent Manager: Clicked dialog/button element with navigation prevention', element);
			} catch (error) {
				console.error('Error in button click handling:', error);
				// Last resort
				element.click();
			}
		} else {
			// For other elements, just click normally
			element.click();
			console.log('Cookie Consent Manager: Clicked element', element);
		}
		
		return true;
	}
	
	return false;
}

export { 
	isElementVisible, 
	hasHighZIndex, 
	clickElement 
}; 