/**
 * @jest-environment jsdom
 */

// Import the functions from the utils module
const { 
	log,
	getElementSelector,
	objectToJson,
	jsonToObject,
	delay,
	createClickEvent,
	getQueryParameters,
	isObjectEmpty,
	generateElementPath
} = require('../src/modules/utils.js');

// Mock console.log to prevent output during tests
global.console = {
	log: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	info: jest.fn()
};

describe('Utils Module', () => {
	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();
		
		// Clear test DOM
		document.body.innerHTML = '';
	});
	
	describe('log', () => {
		test('logs messages with prefix when debug is true', () => {
			// Set debug to true
			const originalDebug = global.DEBUG;
			global.DEBUG = true;
			
			log('Test message');
			
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Cookie Consent Manager:'), 'Test message');
			
			// Restore original debug value
			global.DEBUG = originalDebug;
		});
		
		test('does not log when debug is false', () => {
			// Set debug to false
			const originalDebug = global.DEBUG;
			global.DEBUG = false;
			
			log('Test message');
			
			expect(console.log).not.toHaveBeenCalled();
			
			// Restore original debug value
			global.DEBUG = originalDebug;
		});
	});
	
	describe('getElementSelector', () => {
		test('gets selector from element with ID', () => {
			document.body.innerHTML = `<button id="testButton">Test</button>`;
			const element = document.getElementById('testButton');
			
			const selector = getElementSelector(element);
			
			expect(selector).toBe('#testButton');
		});
		
		test('gets selector from element with class', () => {
			document.body.innerHTML = `<button class="test-btn">Test</button>`;
			const element = document.querySelector('.test-btn');
			
			const selector = getElementSelector(element);
			
			expect(selector).toBe('.test-btn');
		});
		
		test('generates xpath-like selector for elements without ID or class', () => {
			document.body.innerHTML = `
				<div>
					<span>Text</span>
				</div>
			`;
			const element = document.querySelector('span');
			
			const selector = getElementSelector(element);
			
			// Should generate something like "div > span"
			expect(selector).toBe('span');
		});
		
		test('handles null element', () => {
			const selector = getElementSelector(null);
			expect(selector).toBe('');
		});
	});
	
	describe('generateElementPath', () => {
		test('generates path for nested element', () => {
			document.body.innerHTML = `
				<div id="container">
					<div class="wrapper">
						<button class="btn">Click me</button>
					</div>
				</div>
			`;
			
			const button = document.querySelector('.btn');
			const path = generateElementPath(button);
			
			expect(path).toBe('#container > .wrapper > .btn');
		});
		
		test('limits path depth', () => {
			document.body.innerHTML = `
				<div>
					<div>
						<div>
							<div>
								<div>
									<div>
										<button id="deepButton">Deep</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			`;
			
			const button = document.getElementById('deepButton');
			const path = generateElementPath(button, 3);
			
			// Should only include 3 levels
			const pathParts = path.split(' > ');
			expect(pathParts.length).toBeLessThanOrEqual(4); // 3 ancestors + button
			expect(pathParts[pathParts.length - 1]).toBe('#deepButton');
		});
		
		test('handles element with no parent', () => {
			const path = generateElementPath(document.body);
			expect(path).toBe('body');
		});
		
		test('handles null element', () => {
			const path = generateElementPath(null);
			expect(path).toBe('');
		});
	});
	
	describe('objectToJson and jsonToObject', () => {
		test('converts object to JSON and back', () => {
			const testObject = {
				name: 'Test',
				value: 123,
				nested: {
					property: true
				}
			};
			
			const json = objectToJson(testObject);
			const result = jsonToObject(json);
			
			expect(typeof json).toBe('string');
			expect(result).toEqual(testObject);
		});
		
		test('handles null values', () => {
			const json = objectToJson(null);
			const result = jsonToObject(json);
			
			expect(json).toBe('null');
			expect(result).toBeNull();
		});
		
		test('handles circular references gracefully', () => {
			const circular = {};
			circular.self = circular;
			
			// Should not throw
			expect(() => objectToJson(circular)).not.toThrow();
		});
		
		test('handles invalid JSON gracefully', () => {
			const result = jsonToObject('invalid json');
			expect(result).toEqual({});
		});
	});
	
	describe('delay', () => {
		test('returns a promise that resolves after specified time', async () => {
			// Mock setTimeout
			jest.useFakeTimers();
			
			const promise = delay(1000);
			
			// Fast-forward time
			jest.advanceTimersByTime(1000);
			
			await expect(promise).resolves.toBeUndefined();
			
			// Restore timers
			jest.useRealTimers();
		});
	});
	
	describe('createClickEvent', () => {
		test('creates MouseEvent with click type', () => {
			const event = createClickEvent();
			
			expect(event).toBeInstanceOf(MouseEvent);
			expect(event.type).toBe('click');
			expect(event.bubbles).toBe(true);
		});
	});
	
	describe('getQueryParameters', () => {
		test('extracts parameters from URL', () => {
			// Set a mock URL
			delete window.location;
			window.location = {
				search: '?param1=value1&param2=value2&flag'
			};
			
			const params = getQueryParameters();
			
			expect(params).toEqual({
				param1: 'value1',
				param2: 'value2',
				flag: ''
			});
		});
		
		test('handles URL without parameters', () => {
			// Set a mock URL without params
			delete window.location;
			window.location = {
				search: ''
			};
			
			const params = getQueryParameters();
			
			expect(params).toEqual({});
		});
		
		test('handles URL encoded parameters', () => {
			// Set a mock URL with encoded params
			delete window.location;
			window.location = {
				search: '?encoded=value%20with%20spaces&special=%26%3D%3F'
			};
			
			const params = getQueryParameters();
			
			expect(params).toEqual({
				encoded: 'value with spaces',
				special: '&=?'
			});
		});
	});
	
	describe('isObjectEmpty', () => {
		test('returns true for empty object', () => {
			expect(isObjectEmpty({})).toBe(true);
		});
		
		test('returns false for non-empty object', () => {
			expect(isObjectEmpty({ key: 'value' })).toBe(false);
		});
		
		test('returns true for null or undefined', () => {
			expect(isObjectEmpty(null)).toBe(true);
			expect(isObjectEmpty(undefined)).toBe(true);
		});
		
		test('returns false for non-object values', () => {
			expect(isObjectEmpty('string')).toBe(false);
			expect(isObjectEmpty(123)).toBe(false);
			expect(isObjectEmpty(true)).toBe(false);
			expect(isObjectEmpty([])).toBe(false);
		});
	});
}); 