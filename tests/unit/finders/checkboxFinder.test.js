/**
 * Unit tests for the CheckboxFinder class
 * Tests the ability to find checkboxes of various types in a dialog
 */
import { CheckboxFinder } from '../../../src/utils/finders/checkboxFinder.js';

// Mock selectors for testing
const mockSelectors = {
	checkboxTypes: {
		analytics: {
			selectors: [
				{ query: '#analyticsCheckbox', priority: 10 },
				{ query: 'input[name*="analytics"]', priority: 8 },
				{ query: '.analytics-checkbox', priority: 9 }
			],
			textPatterns: [
				{ pattern: 'analytics cookies', priority: 10 },
				{ pattern: 'analytics', priority: 8 },
				{ pattern: 'statistics', priority: 6 }
			]
		},
		advertising: {
			selectors: [
				{ query: '#advertisingCheckbox', priority: 10 },
				{ query: 'input[name*="advertising"]', priority: 8 },
				{ query: '.advertising-checkbox', priority: 9 }
			],
			textPatterns: [
				{ pattern: 'advertising cookies', priority: 10 },
				{ pattern: 'marketing', priority: 8 },
				{ pattern: 'targeting', priority: 7 }
			]
		},
		necessary: {
			selectors: [
				{ query: '#necessaryCheckbox', priority: 10 },
				{ query: 'input[name*="necessary"]', priority: 8 },
				{ query: '.necessary-checkbox', priority: 9 }
			],
			textPatterns: [
				{ pattern: 'necessary cookies', priority: 10 },
				{ pattern: 'essential', priority: 9 },
				{ pattern: 'required', priority: 8 }
			]
		}
	}
};

describe('CheckboxFinder', () => {
	let checkboxFinder;
	let container;
	
	beforeEach(() => {
		checkboxFinder = new CheckboxFinder(mockSelectors);
		container = document.createElement('div');
		document.body.appendChild(container);
	});
	
	afterEach(() => {
		document.body.removeChild(container);
	});
	
	test('findAnalyticsCheckbox should find checkbox by ID', () => {
		container.innerHTML = '<input type="checkbox" id="analyticsCheckbox">';
		const checkbox = checkboxFinder.findAnalyticsCheckbox(container);
		expect(checkbox).not.toBeNull();
		expect(checkbox.id).toBe('analyticsCheckbox');
	});
	
	test('findAnalyticsCheckbox should find checkbox by name attribute', () => {
		container.innerHTML = '<input type="checkbox" name="analytics-cookies">';
		const checkbox = checkboxFinder.findAnalyticsCheckbox(container);
		expect(checkbox).not.toBeNull();
		expect(checkbox.name).toBe('analytics-cookies');
	});
	
	test('findAnalyticsCheckbox should find checkbox by class', () => {
		container.innerHTML = '<input type="checkbox" class="analytics-checkbox">';
		const checkbox = checkboxFinder.findAnalyticsCheckbox(container);
		expect(checkbox).not.toBeNull();
		expect(checkbox.className).toBe('analytics-checkbox');
	});
	
	test('findAnalyticsCheckbox should find checkbox by associated label text', () => {
		container.innerHTML = `
			<div>
				<input type="checkbox" id="analytics">
				<label for="analytics">Analytics Cookies</label>
			</div>
		`;
		const checkbox = checkboxFinder.findAnalyticsCheckbox(container);
		expect(checkbox).not.toBeNull();
		expect(checkbox.id).toBe('analytics');
	});
	
	test('findAdvertisingCheckbox should find checkbox by ID', () => {
		container.innerHTML = '<input type="checkbox" id="advertisingCheckbox">';
		const checkbox = checkboxFinder.findAdvertisingCheckbox(container);
		expect(checkbox).not.toBeNull();
		expect(checkbox.id).toBe('advertisingCheckbox');
	});
	
	test('findAdvertisingCheckbox should find checkbox by marketing-related text', () => {
		container.innerHTML = `
			<div>
				<input type="checkbox" id="marketing">
				<label for="marketing">Marketing Cookies</label>
			</div>
		`;
		const checkbox = checkboxFinder.findAdvertisingCheckbox(container);
		expect(checkbox).not.toBeNull();
		expect(checkbox.id).toBe('marketing');
	});
	
	test('findNecessaryCheckbox should find checkbox by ID', () => {
		container.innerHTML = '<input type="checkbox" id="necessaryCheckbox">';
		const checkbox = checkboxFinder.findNecessaryCheckbox(container);
		expect(checkbox).not.toBeNull();
		expect(checkbox.id).toBe('necessaryCheckbox');
	});
	
	test('findNecessaryCheckbox should find checkbox by essential-related text', () => {
		container.innerHTML = `
			<div>
				<input type="checkbox" id="essential">
				<label for="essential">Essential Cookies</label>
			</div>
		`;
		const checkbox = checkboxFinder.findNecessaryCheckbox(container);
		expect(checkbox).not.toBeNull();
		expect(checkbox.id).toBe('essential');
	});
	
	test('findAllCheckboxes should find all checkboxes in container', () => {
		container.innerHTML = `
			<div>
				<input type="checkbox" id="cb1">
				<input type="checkbox" id="cb2">
				<div class="checkbox" role="checkbox" id="cb3"></div>
			</div>
		`;
		const checkboxes = checkboxFinder.findAllCheckboxes(container);
		expect(checkboxes.length).toBe(3);
		expect(checkboxes[0].id).toBe('cb1');
		expect(checkboxes[1].id).toBe('cb2');
		expect(checkboxes[2].id).toBe('cb3');
	});
	
	test('determineCheckboxType should identify analytics checkbox', () => {
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.id = 'analytics';
		const label = document.createElement('label');
		label.setAttribute('for', 'analytics');
		label.textContent = 'Analytics Cookies';
		container.appendChild(checkbox);
		container.appendChild(label);
		
		const type = checkboxFinder.determineCheckboxType(checkbox);
		expect(type).toBe('analytics');
	});
	
	test('determineCheckboxType should identify advertising checkbox', () => {
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.id = 'marketing';
		const label = document.createElement('label');
		label.setAttribute('for', 'marketing');
		label.textContent = 'Marketing';
		container.appendChild(checkbox);
		container.appendChild(label);
		
		const type = checkboxFinder.determineCheckboxType(checkbox);
		expect(type).toBe('advertising');
	});
	
	test('determineCheckboxType should identify necessary checkbox', () => {
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.id = 'essential';
		const label = document.createElement('label');
		label.setAttribute('for', 'essential');
		label.textContent = 'Essential Cookies';
		container.appendChild(checkbox);
		container.appendChild(label);
		
		const type = checkboxFinder.determineCheckboxType(checkbox);
		expect(type).toBe('necessary');
	});
	
	test('determineCheckboxType should return null for unknown checkbox', () => {
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.id = 'random';
		const label = document.createElement('label');
		label.setAttribute('for', 'random');
		label.textContent = 'Some Random Checkbox';
		container.appendChild(checkbox);
		container.appendChild(label);
		
		const type = checkboxFinder.determineCheckboxType(checkbox);
		expect(type).toBeNull();
	});

	test('findAndToggleCheckboxes should toggle specified checkboxes', () => {
		container.innerHTML = `
			<div>
				<input type="checkbox" id="necessaryCheckbox" checked>
				<label for="necessaryCheckbox">Necessary Cookies</label>
				
				<input type="checkbox" id="analyticsCheckbox" checked>
				<label for="analyticsCheckbox">Analytics Cookies</label>
				
				<input type="checkbox" id="advertisingCheckbox" checked>
				<label for="advertisingCheckbox">Advertising Cookies</label>
			</div>
		`;
		
		const config = {
			necessary: true,
			analytics: false,
			advertising: false
		};
		
		const result = checkboxFinder.findAndToggleCheckboxes(container, config);
		
		expect(result.necessary).toBe(true);
		expect(result.analytics).toBe(true);
		expect(result.advertising).toBe(true);
		
		const necessaryCheckbox = document.getElementById('necessaryCheckbox');
		const analyticsCheckbox = document.getElementById('analyticsCheckbox');
		const advertisingCheckbox = document.getElementById('advertisingCheckbox');
		
		expect(necessaryCheckbox.checked).toBe(true);
		expect(analyticsCheckbox.checked).toBe(false);
		expect(advertisingCheckbox.checked).toBe(false);
	});
}); 