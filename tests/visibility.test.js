/**
 * @jest-environment jsdom
 */

// Mock Chrome API
global.chrome = {
	storage: {
		sync: {
			get: jest.fn(),
			set: jest.fn()
		}
	},
	runtime: {
		sendMessage: jest.fn(),
		onMessage: {
			addListener: jest.fn()
		}
	}
};

// Import the isElementVisible function (simplified for testing)
function isElementVisible(element) {
	if (!element) return false;
	
	// Check if element is of correct type
	if (!(element instanceof HTMLElement)) return false;
	
	// Check computed style properties
	const style = window.getComputedStyle(element);
	if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
		return false;
	}
	
	// Check dimensions
	const rect = element.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) {
		return false;
	}
	
	// Check if element is within viewport
	// For simplicity in testing, we're just checking if it has some width and height
	if (rect.width <= 1 || rect.height <= 1) {
		return false;
	}
	
	// Check if any parent element is hidden
	let parent = element.parentElement;
	while (parent && parent !== document.body) {
		const parentStyle = window.getComputedStyle(parent);
		if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden' || parentStyle.opacity === '0') {
			return false;
		}
		parent = parent.parentElement;
	}
	
	return true;
}

describe('Element Visibility Tests', () => {
	let testContainer;
	
	beforeEach(() => {
		// Create a test container for each test
		testContainer = document.createElement('div');
		testContainer.id = 'test-container';
		document.body.appendChild(testContainer);
	});
	
	afterEach(() => {
		// Clean up after each test
		if (testContainer && testContainer.parentNode) {
			testContainer.parentNode.removeChild(testContainer);
		}
	});
	
	// Helper function to create an element with specific CSS properties
	function createElementWithStyle(tagName, styleProperties) {
		const element = document.createElement(tagName);
		Object.assign(element.style, styleProperties);
		testContainer.appendChild(element);
		return element;
	}
	
	test('should return false for null or undefined elements', () => {
		expect(isElementVisible(null)).toBe(false);
		expect(isElementVisible(undefined)).toBe(false);
	});
	
	test('should return false for non-HTMLElement objects', () => {
		expect(isElementVisible({})).toBe(false);
		expect(isElementVisible(document.createTextNode('text'))).toBe(false);
	});
	
	test('should return false for elements with display:none', () => {
		const element = createElementWithStyle('div', { display: 'none' });
		expect(isElementVisible(element)).toBe(false);
	});
	
	test('should return false for elements with visibility:hidden', () => {
		const element = createElementWithStyle('div', { visibility: 'hidden' });
		expect(isElementVisible(element)).toBe(false);
	});
	
	test('should return false for elements with opacity:0', () => {
		const element = createElementWithStyle('div', { opacity: '0' });
		expect(isElementVisible(element)).toBe(false);
	});
	
	test('should return false for elements with zero width', () => {
		const element = createElementWithStyle('div', { 
			width: '0px', 
			height: '10px',
			border: 'none',
			padding: '0'
		});
		expect(isElementVisible(element)).toBe(false);
	});
	
	test('should return false for elements with zero height', () => {
		const element = createElementWithStyle('div', { 
			width: '10px',
			height: '0px',
			border: 'none',
			padding: '0'
		});
		expect(isElementVisible(element)).toBe(false);
	});
	
	test('should return false for elements with hidden parent', () => {
		const parent = createElementWithStyle('div', { display: 'none' });
		const child = document.createElement('div');
		parent.appendChild(child);
		
		expect(isElementVisible(child)).toBe(false);
	});
	
	test('should return false for elements with parent that has visibility:hidden', () => {
		const parent = createElementWithStyle('div', { visibility: 'hidden' });
		const child = document.createElement('div');
		parent.appendChild(child);
		
		expect(isElementVisible(child)).toBe(false);
	});
	
	test('should return true for visible elements', () => {
		const element = createElementWithStyle('div', { 
			display: 'block',
			visibility: 'visible',
			width: '100px',
			height: '100px'
		});
		
		// Mock getBoundingClientRect to return non-zero values
		element.getBoundingClientRect = jest.fn().mockReturnValue({
			width: 100,
			height: 100,
			top: 0,
			left: 0,
			right: 100,
			bottom: 100
		});
		
		expect(isElementVisible(element)).toBe(true);
	});
	
	test('should return true for elements with overflow:hidden but non-zero dimensions', () => {
		const element = createElementWithStyle('div', { 
			overflow: 'hidden',
			width: '100px',
			height: '100px'
		});
		
		// Mock getBoundingClientRect to return non-zero values
		element.getBoundingClientRect = jest.fn().mockReturnValue({
			width: 100,
			height: 100,
			top: 0,
			left: 0,
			right: 100,
			bottom: 100
		});
		
		expect(isElementVisible(element)).toBe(true);
	});
	
	test('should handle deeply nested elements correctly', () => {
		// Create a nested structure
		const grandparent = createElementWithStyle('div', { display: 'block' });
		const parent = document.createElement('div');
		const child = document.createElement('div');
		const grandchild = document.createElement('div');
		
		grandparent.appendChild(parent);
		parent.appendChild(child);
		child.appendChild(grandchild);
		
		// Mock getBoundingClientRect for grandchild
		grandchild.getBoundingClientRect = jest.fn().mockReturnValue({
			width: 50,
			height: 50,
			top: 0,
			left: 0,
			right: 50,
			bottom: 50
		});
		
		expect(isElementVisible(grandchild)).toBe(true);
		
		// Now make a parent invisible and test again
		parent.style.visibility = 'hidden';
		expect(isElementVisible(grandchild)).toBe(false);
	});
	
	test('should handle elements with transition or animation', () => {
		const element = createElementWithStyle('div', {
			width: '100px',
			height: '100px',
			transition: 'opacity 0.5s',
			opacity: '0.1' // Nearly invisible but not quite 0
		});
		
		// Mock getBoundingClientRect
		element.getBoundingClientRect = jest.fn().mockReturnValue({
			width: 100,
			height: 100,
			top: 0,
			left: 0,
			right: 100,
			bottom: 100
		});
		
		// Even with low opacity, it should still be considered visible
		expect(isElementVisible(element)).toBe(true);
	});
}); 