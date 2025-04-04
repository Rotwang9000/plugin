/**
 * @jest-environment jsdom
 */

// Import the functions from the action module
const { 
	acceptCookies,
	rejectCookies,
	handleCookieConsent,
	simulateClick,
	handleDialogAutomatically
} = require('../src/modules/action.js');

// Mock dependencies
jest.mock('../src/modules/utils.js', () => ({
	log: jest.fn(),
	delay: jest.fn().mockImplementation(() => Promise.resolve()),
	createClickEvent: jest.fn().mockReturnValue({ type: 'click' })
}));

jest.mock('../src/modules/settings.js', () => ({
	settings: {
		enabled: true,
		autoAccept: true,
		privacyMode: false,
		smartMode: true
	},
	loadSettings: jest.fn().mockImplementation(callback => {
		callback({
			enabled: true,
			autoAccept: true,
			privacyMode: false,
			smartMode: true
		});
	})
}));

jest.mock('../src/modules/database.js', () => ({
	saveWebsiteData: jest.fn().mockImplementation((domain, data, callback) => {
		if (callback) callback();
	}),
	updateStatistics: jest.fn().mockImplementation((domain, accepted, callback) => {
		if (callback) callback();
	})
}));

describe('Action Module', () => {
	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();
		
		// Set up DOM for testing
		document.body.innerHTML = '';
		
		// Mock window location
		Object.defineProperty(window, 'location', {
			value: {
				hostname: 'example.com',
				href: 'https://example.com/page'
			},
			writable: true
		});
	});
	
	describe('simulateClick', () => {
		test('dispatches click event on element', () => {
			// Setup test element
			document.body.innerHTML = `<button id="testButton">Click Me</button>`;
			const testButton = document.getElementById('testButton');
			
			// Mock the dispatchEvent method of the button
			testButton.dispatchEvent = jest.fn();
			
			simulateClick(testButton);
			
			expect(testButton.dispatchEvent).toHaveBeenCalled();
		});
		
		test('handles null element gracefully', () => {
			// This should not throw an error
			expect(() => simulateClick(null)).not.toThrow();
		});
	});
	
	describe('acceptCookies', () => {
		test('clicks accept button and updates database', (done) => {
			// Setup test DOM
			document.body.innerHTML = `
				<div id="cookieBanner">
					<button id="acceptBtn">Accept</button>
				</div>
			`;
			
			const acceptButton = document.getElementById('acceptBtn');
			acceptButton.dispatchEvent = jest.fn();
			
			const { saveWebsiteData, updateStatistics } = require('../src/modules/database.js');
			
			acceptCookies(acceptButton, () => {
				expect(acceptButton.dispatchEvent).toHaveBeenCalled();
				expect(saveWebsiteData).toHaveBeenCalledWith(
					'example.com',
					expect.objectContaining({
						acceptSelector: '#acceptBtn'
					}),
					expect.any(Function)
				);
				expect(updateStatistics).toHaveBeenCalledWith(
					'example.com',
					true,
					expect.any(Function)
				);
				done();
			});
		});
		
		test('works with button that has no ID using querySelector', (done) => {
			// Setup test DOM with button having class instead of ID
			document.body.innerHTML = `
				<div id="cookieBanner">
					<button class="accept-btn">Accept</button>
				</div>
			`;
			
			const acceptButton = document.querySelector('.accept-btn');
			acceptButton.dispatchEvent = jest.fn();
			
			const { saveWebsiteData } = require('../src/modules/database.js');
			
			acceptCookies(acceptButton, () => {
				expect(acceptButton.dispatchEvent).toHaveBeenCalled();
				expect(saveWebsiteData).toHaveBeenCalledWith(
					'example.com',
					expect.objectContaining({
						acceptSelector: '.accept-btn'
					}),
					expect.any(Function)
				);
				done();
			});
		});
		
		test('handles null button gracefully', (done) => {
			// This should not throw an error
			acceptCookies(null, () => {
				// Should still call the callback
				done();
			});
		});
	});
	
	describe('rejectCookies', () => {
		test('clicks reject button and updates database', (done) => {
			// Setup test DOM
			document.body.innerHTML = `
				<div id="cookieBanner">
					<button id="rejectBtn">Reject</button>
				</div>
			`;
			
			const rejectButton = document.getElementById('rejectBtn');
			rejectButton.dispatchEvent = jest.fn();
			
			const { saveWebsiteData, updateStatistics } = require('../src/modules/database.js');
			
			rejectCookies(rejectButton, () => {
				expect(rejectButton.dispatchEvent).toHaveBeenCalled();
				expect(saveWebsiteData).toHaveBeenCalledWith(
					'example.com',
					expect.objectContaining({
						rejectSelector: '#rejectBtn'
					}),
					expect.any(Function)
				);
				expect(updateStatistics).toHaveBeenCalledWith(
					'example.com',
					false,
					expect.any(Function)
				);
				done();
			});
		});
		
		test('works with button that has no ID using querySelector', (done) => {
			// Setup test DOM with button having class instead of ID
			document.body.innerHTML = `
				<div id="cookieBanner">
					<button class="reject-btn">Reject</button>
				</div>
			`;
			
			const rejectButton = document.querySelector('.reject-btn');
			rejectButton.dispatchEvent = jest.fn();
			
			const { saveWebsiteData } = require('../src/modules/database.js');
			
			rejectCookies(rejectButton, () => {
				expect(rejectButton.dispatchEvent).toHaveBeenCalled();
				expect(saveWebsiteData).toHaveBeenCalledWith(
					'example.com',
					expect.objectContaining({
						rejectSelector: '.reject-btn'
					}),
					expect.any(Function)
				);
				done();
			});
		});
		
		test('handles null button gracefully', (done) => {
			// This should not throw an error
			rejectCookies(null, () => {
				// Should still call the callback
				done();
			});
		});
	});
	
	describe('handleCookieConsent', () => {
		test('accepts cookies when autoAccept is true', (done) => {
			// Setup test DOM
			document.body.innerHTML = `
				<div id="cookieBanner">
					<button id="acceptBtn">Accept</button>
					<button id="rejectBtn">Reject</button>
				</div>
			`;
			
			const acceptButton = document.getElementById('acceptBtn');
			const rejectButton = document.getElementById('rejectBtn');
			
			acceptButton.dispatchEvent = jest.fn();
			rejectButton.dispatchEvent = jest.fn();
			
			// Mock settings
			const settings = require('../src/modules/settings.js');
			settings.settings.autoAccept = true;
			settings.settings.privacyMode = false;
			
			handleCookieConsent(acceptButton, rejectButton, () => {
				expect(acceptButton.dispatchEvent).toHaveBeenCalled();
				expect(rejectButton.dispatchEvent).not.toHaveBeenCalled();
				done();
			});
		});
		
		test('rejects cookies when privacyMode is true', (done) => {
			// Setup test DOM
			document.body.innerHTML = `
				<div id="cookieBanner">
					<button id="acceptBtn">Accept</button>
					<button id="rejectBtn">Reject</button>
				</div>
			`;
			
			const acceptButton = document.getElementById('acceptBtn');
			const rejectButton = document.getElementById('rejectBtn');
			
			acceptButton.dispatchEvent = jest.fn();
			rejectButton.dispatchEvent = jest.fn();
			
			// Mock settings
			const settings = require('../src/modules/settings.js');
			settings.settings.autoAccept = true;
			settings.settings.privacyMode = true;
			
			handleCookieConsent(acceptButton, rejectButton, () => {
				expect(acceptButton.dispatchEvent).not.toHaveBeenCalled();
				expect(rejectButton.dispatchEvent).toHaveBeenCalled();
				done();
			});
		});
		
		test('rejects cookies when autoAccept is false', (done) => {
			// Setup test DOM
			document.body.innerHTML = `
				<div id="cookieBanner">
					<button id="acceptBtn">Accept</button>
					<button id="rejectBtn">Reject</button>
				</div>
			`;
			
			const acceptButton = document.getElementById('acceptBtn');
			const rejectButton = document.getElementById('rejectBtn');
			
			acceptButton.dispatchEvent = jest.fn();
			rejectButton.dispatchEvent = jest.fn();
			
			// Mock settings
			const settings = require('../src/modules/settings.js');
			settings.settings.autoAccept = false;
			settings.settings.privacyMode = false;
			
			handleCookieConsent(acceptButton, rejectButton, () => {
				expect(acceptButton.dispatchEvent).not.toHaveBeenCalled();
				expect(rejectButton.dispatchEvent).toHaveBeenCalled();
				done();
			});
		});
		
		test('handles missing reject button by accepting', (done) => {
			// Setup test DOM with only accept button
			document.body.innerHTML = `
				<div id="cookieBanner">
					<button id="acceptBtn">Accept</button>
				</div>
			`;
			
			const acceptButton = document.getElementById('acceptBtn');
			acceptButton.dispatchEvent = jest.fn();
			
			// Mock settings to prefer rejection
			const settings = require('../src/modules/settings.js');
			settings.settings.autoAccept = false;
			settings.settings.privacyMode = true;
			
			// Even with settings set to reject, should accept if no reject button
			handleCookieConsent(acceptButton, null, () => {
				expect(acceptButton.dispatchEvent).toHaveBeenCalled();
				done();
			});
		});
	});
	
	describe('handleDialogAutomatically', () => {
		test('handles cookie dialog when both buttons are found', (done) => {
			// Setup test DOM
			document.body.innerHTML = `
				<div id="cookieBanner">
					<p>This site uses cookies</p>
					<button id="acceptBtn">Accept</button>
					<button id="rejectBtn">Reject</button>
				</div>
			`;
			
			const cookieDialog = document.getElementById('cookieBanner');
			const acceptButton = document.getElementById('acceptBtn');
			const rejectButton = document.getElementById('rejectBtn');
			
			// Create mock functions for the buttons that Jest can track
			acceptButton.dispatchEvent = jest.fn();
			rejectButton.dispatchEvent = jest.fn();
			
			// Force privacy mode to be true to test reject button clicking
			const settings = require('../src/modules/settings.js');
			settings.settings.privacyMode = true;
			settings.settings.autoAccept = false;
			
			// Override the simulateClick function for this test
			const action = require('../src/modules/action.js');
			const originalSimulateClick = action.simulateClick;
			
			action.simulateClick = (element) => {
				if (element === acceptButton) {
					acceptButton.dispatchEvent();
				} else if (element === rejectButton) {
					rejectButton.dispatchEvent();
				}
			};
			
			handleDialogAutomatically(cookieDialog, () => {
				// In privacy mode, the reject button should be clicked
				expect(rejectButton.dispatchEvent).toHaveBeenCalled();
				expect(acceptButton.dispatchEvent).not.toHaveBeenCalled();
				
				// Restore the original function
				action.simulateClick = originalSimulateClick;
				done();
			});
		});
		
		test('does nothing when dialog is null', (done) => {
			const { saveWebsiteData, updateStatistics } = require('../src/modules/database.js');
			
			handleDialogAutomatically(null, () => {
				expect(saveWebsiteData).not.toHaveBeenCalled();
				expect(updateStatistics).not.toHaveBeenCalled();
				done();
			});
		});
		
		test('handles case when no buttons are found', (done) => {
			// Setup test DOM with no buttons
			document.body.innerHTML = `
				<div id="cookieBanner">
					<p>This site uses cookies</p>
				</div>
			`;
			
			const cookieDialog = document.getElementById('cookieBanner');
			
			const { saveWebsiteData, updateStatistics } = require('../src/modules/database.js');
			
			handleDialogAutomatically(cookieDialog, () => {
				expect(saveWebsiteData).not.toHaveBeenCalled();
				expect(updateStatistics).not.toHaveBeenCalled();
				done();
			});
		});
	});
}); 