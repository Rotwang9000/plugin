/**
 * Unit tests for the ElementFinder base class
 * Tests the fundamental element finding functionality
 */
import { ElementFinder } from '../../../src/utils/finders/elementFinder.js';

describe('ElementFinder', () => {
	let elementFinder;
	let container;
	
	beforeEach(() => {
		// Create a simple mock selectors object
		const mockSelectors = {
			testSelectors: {
				selectors: [
					{ query: '#testId', priority: 10 },
					{ query: '.test-class', priority: 8 },
					{ query: '[data-test]', priority: 6 }
				],
				textPatterns: [
					{ pattern: 'test text', priority: 10 },
					{ pattern: 'sample', priority: 7 },
					{ pattern: 'example', priority: 5 }
				]
			}
		};
		
		elementFinder = new ElementFinder(mockSelectors);
		container = document.createElement('div');
		document.body.appendChild(container);
	});
	
	afterEach(() => {
		document.body.removeChild(container);
	});
	
	test('findElementBySelector should find element by ID', () => {
		container.innerHTML = '<div id="testId">Test Element</div>';
		const element = elementFinder.findElementBySelector(container, '#testId');
		expect(element).not.toBeNull();
		expect(element.id).toBe('testId');
	});
	
	test('findElementBySelector should find element by class', () => {
		container.innerHTML = '<div class="test-class">Test Element</div>';
		const element = elementFinder.findElementBySelector(container, '.test-class');
		expect(element).not.toBeNull();
		expect(element.className).toBe('test-class');
	});
	
	test('findElementBySelector should find element by attribute', () => {
		container.innerHTML = '<div data-test="value">Test Element</div>';
		const element = elementFinder.findElementBySelector(container, '[data-test]');
		expect(element).not.toBeNull();
		expect(element.getAttribute('data-test')).toBe('value');
	});
	
	test('findElementBySelector should return null if no match', () => {
		container.innerHTML = '<div>Test Element</div>';
		const element = elementFinder.findElementBySelector(container, '#nonexistent');
		expect(element).toBeNull();
	});
	
	test('findElementsBySelectors should find element with highest priority first', () => {
		container.innerHTML = `
			<div class="test-class">Class Element</div>
			<div id="testId">ID Element</div>
			<div data-test="value">Attribute Element</div>
		`;
		
		const selectors = [
			{ query: '#testId', priority: 10 },
			{ query: '.test-class', priority: 8 },
			{ query: '[data-test]', priority: 6 }
		];
		
		const element = elementFinder.findElementsBySelectors(container, selectors);
		expect(element).not.toBeNull();
		expect(element.id).toBe('testId');
	});
	
	test('findElementsBySelectors should return lower priority if higher not found', () => {
		container.innerHTML = `
			<div class="test-class">Class Element</div>
			<div data-test="value">Attribute Element</div>
		`;
		
		const selectors = [
			{ query: '#testId', priority: 10 },
			{ query: '.test-class', priority: 8 },
			{ query: '[data-test]', priority: 6 }
		];
		
		const element = elementFinder.findElementsBySelectors(container, selectors);
		expect(element).not.toBeNull();
		expect(element.className).toBe('test-class');
	});
	
	test('findElementByText should find element by exact text match', () => {
		container.innerHTML = `
			<div>Other text</div>
			<div>Test Text</div>
		`;
		
		const element = elementFinder.findElementByText(container, 'test text');
		expect(element).not.toBeNull();
		expect(element.textContent).toBe('Test Text');
	});
	
	test('findElementByText should find element by partial text match', () => {
		container.innerHTML = `
			<div>Other information</div>
			<div>This is a sample text</div>
		`;
		
		const element = elementFinder.findElementByText(container, 'sample');
		expect(element).not.toBeNull();
		expect(element.textContent).toBe('This is a sample text');
	});
	
	test('findElementByText should ignore case', () => {
		container.innerHTML = `
			<div>Other text</div>
			<div>TEST TEXT</div>
		`;
		
		const element = elementFinder.findElementByText(container, 'test text');
		expect(element).not.toBeNull();
		expect(element.textContent).toBe('TEST TEXT');
	});
	
	test('findElementsByTextPatterns should prioritize by priority and match quality', () => {
		container.innerHTML = `
			<div>This has sample in it</div>
			<div>This is a test text element</div>
			<div>This is an example</div>
		`;
		
		const textPatterns = [
			{ pattern: 'test text', priority: 10 },
			{ pattern: 'sample', priority: 7 },
			{ pattern: 'example', priority: 5 }
		];
		
		const element = elementFinder.findElementsByTextPatterns(container, textPatterns);
		expect(element).not.toBeNull();
		expect(element.textContent).toBe('This is a test text element');
	});
	
	test('findElementsByTextPatterns should find lower priority if higher not available', () => {
		container.innerHTML = `
			<div>This has sample in it</div>
			<div>This is an example</div>
		`;
		
		const textPatterns = [
			{ pattern: 'test text', priority: 10 },
			{ pattern: 'sample', priority: 7 },
			{ pattern: 'example', priority: 5 }
		];
		
		const element = elementFinder.findElementsByTextPatterns(container, textPatterns);
		expect(element).not.toBeNull();
		expect(element.textContent).toBe('This has sample in it');
	});
	
	test('isExcluded should identify excluded elements', () => {
		container.innerHTML = `
			<footer>
				<div class="test-footer">Footer Element</div>
			</footer>
			<div class="test-content">Content Element</div>
		`;
		
		const footerElement = container.querySelector('.test-footer');
		const contentElement = container.querySelector('.test-content');
		
		const excludeSelectors = ['footer *'];
		
		expect(elementFinder.isExcluded(footerElement, excludeSelectors)).toBe(true);
		expect(elementFinder.isExcluded(contentElement, excludeSelectors)).toBe(false);
	});
	
	test('normalizeText should remove extra whitespace and convert to lowercase', () => {
		expect(elementFinder.normalizeText('  Test   Text  ')).toBe('test text');
		expect(elementFinder.normalizeText('Multi\nLine\tText')).toBe('multi line text');
	});
	
	test('getTextContent should get text from element and its children', () => {
		container.innerHTML = `
			<div id="test">
				Parent Text
				<span>Child Text</span>
			</div>
		`;
		
		const element = container.querySelector('#test');
		const text = elementFinder.getTextContent(element);
		expect(text).toContain('parent text');
		expect(text).toContain('child text');
	});
}); 