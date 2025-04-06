/**
 * Utility functions for DOM manipulation
 */

/**
 * Create and append a new element with specified attributes and content
 * @param {string} tag - The HTML tag to create
 * @param {Object} attributes - The attributes to set on the element
 * @param {string|Node} content - The text content or child node
 * @param {Element} parent - The parent element to append to
 * @returns {Element} - The created element
 */
export function createElement(tag, attributes = {}, content = null, parent = null) {
	const element = document.createElement(tag);
	
	// Set attributes
	if (attributes && typeof attributes === 'object') {
		Object.entries(attributes).forEach(([key, value]) => {
			if (key === 'className') {
				element.className = value;
			} else if (key === 'innerHTML') {
				element.innerHTML = value;
			} else if (key === 'textContent') {
				element.textContent = value;
			} else if (key.startsWith('data-')) {
				element.dataset[key.substring(5)] = value;
			} else {
				element.setAttribute(key, value);
			}
		});
	}
	
	// Add content
	if (content) {
		if (typeof content === 'string') {
			element.textContent = content;
		} else if (content instanceof Node) {
			element.appendChild(content);
		}
	}
	
	// Append to parent if provided
	if (parent) {
		parent.appendChild(element);
	}
	
	return element;
}

/**
 * Find elements matching a selector and apply a callback to each
 * @param {string} selector - The CSS selector to match
 * @param {Function} callback - The function to apply to each element
 * @param {Element} parent - The parent element to search in (default: document)
 */
export function queryAndProcess(selector, callback, parent = document) {
	const elements = parent.querySelectorAll(selector);
	elements.forEach(callback);
}

/**
 * Remove all children from an element
 * @param {Element} element - The element to clear
 */
export function clearElement(element) {
	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
}

/**
 * Toggle a class on an element based on a condition
 * @param {Element} element - The element to modify
 * @param {string} className - The class to toggle
 * @param {boolean} condition - Whether to add or remove the class
 */
export function toggleClass(element, className, condition) {
	if (condition) {
		element.classList.add(className);
	} else {
		element.classList.remove(className);
	}
}

/**
 * Add event listener with debounce
 * @param {Element} element - The element to add listener to
 * @param {string} event - The event type
 * @param {Function} callback - The callback function
 * @param {number} delay - Debounce delay in milliseconds
 */
export function addDebouncedEventListener(element, event, callback, delay = 300) {
	let timeout;
	
	element.addEventListener(event, function(e) {
		clearTimeout(timeout);
		timeout = setTimeout(() => callback(e), delay);
	});
} 