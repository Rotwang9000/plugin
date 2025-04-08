/**
 * Unit tests for the RegionDetector class
 * Tests the ability to detect cookie consent regions and variations
 */
import { RegionDetector } from '../../../src/utils/finders/regionDetector.js';

// Mock selectors for testing
const mockSelectors = {
	regionDetection: {
		eu: {
			textPatterns: [
				{ pattern: 'gdpr', priority: 10 },
				{ pattern: 'european union', priority: 10 },
				{ pattern: 'eu cookie law', priority: 9 }
			],
			locationPatterns: [
				'.eu',
				'.de',
				'.fr',
				'.uk',
				'.es'
			]
		},
		california: {
			textPatterns: [
				{ pattern: 'ccpa', priority: 10 },
				{ pattern: 'california consumer privacy act', priority: 10 },
				{ pattern: 'california residents', priority: 8 }
			],
			locationPatterns: [
				'.ca.gov'
			]
		},
		international: {
			textPatterns: [
				{ pattern: 'international', priority: 5 },
				{ pattern: 'global', priority: 5 }
			]
		}
	}
};

describe('RegionDetector', () => {
	let regionDetector;
	let dialog;
	
	beforeEach(() => {
		regionDetector = new RegionDetector(mockSelectors);
		dialog = document.createElement('div');
	});
	
	test('detectRegion should identify EU region from text', () => {
		dialog.textContent = 'This site uses cookies to comply with GDPR regulations.';
		const region = regionDetector.detectRegion(dialog, 'example.com');
		expect(region).toBe('eu');
	});
	
	test('detectRegion should identify California region from text', () => {
		dialog.textContent = 'Cookie Notice for California Residents (CCPA)';
		const region = regionDetector.detectRegion(dialog, 'example.com');
		expect(region).toBe('california');
	});
	
	test('detectRegion should identify region from domain TLD', () => {
		dialog.textContent = 'Cookie Policy';
		const region = regionDetector.detectRegion(dialog, 'example.eu');
		expect(region).toBe('eu');
	});
	
	test('detectRegion should identify region from subdomain', () => {
		dialog.textContent = 'Cookie Policy';
		const region = regionDetector.detectRegion(dialog, 'sub.agency.ca.gov');
		expect(region).toBe('california');
	});
	
	test('detectRegion should default to international if no matches', () => {
		dialog.textContent = 'Cookie Policy';
		const region = regionDetector.detectRegion(dialog, 'example.com');
		expect(region).toBe('international');
	});
	
	test('detectRegion should prioritize text patterns over domain', () => {
		dialog.textContent = 'This site complies with CCPA regulations';
		const region = regionDetector.detectRegion(dialog, 'example.eu');
		expect(region).toBe('california');
	});
	
	test('detectRegion should find nested text', () => {
		dialog.innerHTML = `
			<div>
				<h2>Cookie Notice</h2>
				<p>We comply with <span>GDPR</span> regulations.</p>
			</div>
		`;
		const region = regionDetector.detectRegion(dialog, 'example.com');
		expect(region).toBe('eu');
	});
	
	test('detectRegionVariation should identify dark pattern variation', () => {
		dialog.innerHTML = `
			<div>
				<button id="accept" style="background-color: green; font-size: 20px;">Accept All</button>
				<button id="reject" style="color: #999; font-size: 12px;">Reject All</button>
			</div>
		`;
		const acceptButton = dialog.querySelector('#accept');
		const rejectButton = dialog.querySelector('#reject');
		
		const variation = regionDetector.detectRegionVariation(dialog, acceptButton, rejectButton);
		expect(variation).toBe('dark-pattern');
	});
	
	test('detectRegionVariation should identify standard variation', () => {
		dialog.innerHTML = `
			<div>
				<button id="accept" style="font-size: 16px;">Accept All</button>
				<button id="reject" style="font-size: 16px;">Reject All</button>
			</div>
		`;
		const acceptButton = dialog.querySelector('#accept');
		const rejectButton = dialog.querySelector('#reject');
		
		const variation = regionDetector.detectRegionVariation(dialog, acceptButton, rejectButton);
		expect(variation).toBe('standard');
	});
	
	test('detectRegionVariation should identify no-choice variation when only accept is available', () => {
		dialog.innerHTML = `
			<div>
				<button id="accept">Accept All</button>
			</div>
		`;
		const acceptButton = dialog.querySelector('#accept');
		
		const variation = regionDetector.detectRegionVariation(dialog, acceptButton, null);
		expect(variation).toBe('no-choice');
	});
	
	test('detectRegionVariation should return unknown for unusual layouts', () => {
		dialog.innerHTML = `
			<div>
				<button id="accept">OK</button>
				<button id="settings">Settings</button>
			</div>
		`;
		const acceptButton = dialog.querySelector('#accept');
		const settingsButton = dialog.querySelector('#settings');
		
		// Neither button is a reject button
		const variation = regionDetector.detectRegionVariation(dialog, acceptButton, settingsButton);
		expect(variation).toBe('unknown');
	});
	
	test('compareButtonStyles should detect style differences', () => {
		dialog.innerHTML = `
			<div>
				<button id="large" style="padding: 12px 24px; font-size: 18px; background-color: blue;">Large</button>
				<button id="small" style="padding: 6px 12px; font-size: 12px; background-color: gray;">Small</button>
			</div>
		`;
		const largeButton = dialog.querySelector('#large');
		const smallButton = dialog.querySelector('#small');
		
		const hasSignificantDifference = regionDetector.compareButtonStyles(largeButton, smallButton);
		expect(hasSignificantDifference).toBe(true);
	});
	
	test('compareButtonStyles should detect minimal style differences', () => {
		dialog.innerHTML = `
			<div>
				<button id="first" style="padding: 10px; font-size: 16px; background-color: blue;">First</button>
				<button id="second" style="padding: 10px; font-size: 16px; background-color: blue;">Second</button>
			</div>
		`;
		const firstButton = dialog.querySelector('#first');
		const secondButton = dialog.querySelector('#second');
		
		const hasSignificantDifference = regionDetector.compareButtonStyles(firstButton, secondButton);
		expect(hasSignificantDifference).toBe(false);
	});
}); 