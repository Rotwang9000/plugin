const fs = require('fs');
const path = require('path');

describe('Manifest.json', () => {
	let manifestContent;
	
	beforeAll(() => {
		// Load the manifest.json file
		const manifestPath = path.join(__dirname, '..', 'manifest.json');
		manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	});
	
	test('has valid manifest version', () => {
		expect(manifestContent.manifest_version).toBe(3);
	});
	
	test('has required name and version', () => {
		expect(manifestContent.name).toBeDefined();
		expect(manifestContent.version).toBeDefined();
		expect(typeof manifestContent.name).toBe('string');
		expect(typeof manifestContent.version).toBe('string');
	});
	
	test('has valid permissions', () => {
		expect(Array.isArray(manifestContent.permissions)).toBe(true);
		// Check for essential permissions
		expect(manifestContent.permissions).toContain('storage');
		expect(manifestContent.permissions).toContain('activeTab');
	});
	
	test('has content_scripts properly configured', () => {
		expect(Array.isArray(manifestContent.content_scripts)).toBe(true);
		expect(manifestContent.content_scripts.length).toBeGreaterThan(0);
		
		// First content script should have proper configuration
		const contentScript = manifestContent.content_scripts[0];
		expect(Array.isArray(contentScript.matches)).toBe(true);
		expect(contentScript.matches).toContain('<all_urls>');
		expect(Array.isArray(contentScript.js)).toBe(true);
		expect(contentScript.js).toContain('content.js');
	});
	
	test('has background script properly configured', () => {
		expect(manifestContent.background).toBeDefined();
		expect(manifestContent.background.service_worker).toBe('background.js');
	});
	
	test('has action (popup) properly configured', () => {
		expect(manifestContent.action).toBeDefined();
		expect(manifestContent.action.default_popup).toBe('popup.html');
		expect(manifestContent.action.default_icon).toBeDefined();
	});
	
	test('has host permissions for cross-origin operation', () => {
		expect(Array.isArray(manifestContent.host_permissions)).toBe(true);
		expect(manifestContent.host_permissions).toContain('<all_urls>');
	});
}); 