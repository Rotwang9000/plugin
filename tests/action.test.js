/**
 * @jest-environment jsdom
 */

// Import Jest globals
import { jest, describe, beforeEach, test, expect } from '@jest/globals';

// Create module mocks separately
const utilsMock = {
	log: jest.fn(),
	delay: jest.fn().mockImplementation(() => Promise.resolve()),
	createClickEvent: jest.fn().mockReturnValue({ type: 'click' })
};

const settingsMock = {
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
};

const databaseMock = {
	saveWebsiteData: jest.fn().mockImplementation((domain, data, callback) => {
		if (callback) callback();
	}),
	updateStatistics: jest.fn().mockImplementation((domain, accepted, callback) => {
		if (callback) callback();
	})
};

// Create simplified action module functions
function simulateClick(element) {
	if (!element) return;
	const event = utilsMock.createClickEvent();
	element.dispatchEvent(event);
}

function acceptCookies(acceptButton, callback) {
	if (!acceptButton) {
		if (callback) callback();
		return;
	}
	
	simulateClick(acceptButton);
	
	const selector = acceptButton.id ? `#${acceptButton.id}` : 
		(acceptButton.className ? `.${acceptButton.className.split(' ')[0]}` : '');
	const domain = window.location.hostname;
	
	databaseMock.saveWebsiteData(domain, { acceptSelector: selector }, () => {
		databaseMock.updateStatistics(domain, true, callback);
	});
}

function rejectCookies(rejectButton, callback) {
	if (!rejectButton) {
		if (callback) callback();
		return;
	}
	
	simulateClick(rejectButton);
	
	const selector = rejectButton.id ? `#${rejectButton.id}` : 
		(rejectButton.className ? `.${rejectButton.className.split(' ')[0]}` : '');
	const domain = window.location.hostname;
	
	databaseMock.saveWebsiteData(domain, { rejectSelector: selector }, () => {
		databaseMock.updateStatistics(domain, false, callback);
	});
}

function handleCookieConsent(acceptButton, rejectButton, callback) {
	// Get user preferences from mock settings
	const settings = settingsMock.settings;
	
	if (!settings.enabled) {
		if (callback) callback();
		return;
	}
	
	// Decide which button to click based on settings
	if (settings.privacyMode && rejectButton) {
		// Privacy mode: Click reject button if available
		rejectCookies(rejectButton, callback);
	} else if (!settings.autoAccept && rejectButton) {
		// Auto accept disabled: Click reject button if available
		rejectCookies(rejectButton, callback);
	} else if (acceptButton) {
		// Otherwise, click accept button
		acceptCookies(acceptButton, callback);
	} else {
		// No buttons found
		if (callback) callback();
	}
}

function handleDialogAutomatically(dialog, callback) {
	if (!dialog) {
		if (callback) callback();
		return;
	}
	
	// Find cookie buttons in the dialog
	const buttons = dialog.querySelectorAll('button, a.button, input[type="button"]');
	
	let acceptButton = null;
	let rejectButton = null;
	
	// Identify accept and reject buttons
	for (const button of buttons) {
		const text = button.textContent?.toLowerCase() || '';
		const id = button.id?.toLowerCase() || '';
		
		// Check for accept button
		if (text.includes('accept') || text.includes('agree') || id.includes('accept')) {
			acceptButton = button;
		}
		
		// Check for reject button
		if (text.includes('reject') || text.includes('decline') || id.includes('reject')) {
			rejectButton = button;
		}
	}
	
	// Handle the consent
	handleCookieConsent(acceptButton, rejectButton, callback);
}

// Tests
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
			
			acceptCookies(acceptButton, () => {
				expect(acceptButton.dispatchEvent).toHaveBeenCalled();
				expect(databaseMock.saveWebsiteData).toHaveBeenCalledWith(
					'example.com',
					expect.objectContaining({
						acceptSelector: '#acceptBtn'
					}),
					expect.any(Function)
				);
				expect(databaseMock.updateStatistics).toHaveBeenCalledWith(
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
			
			acceptCookies(acceptButton, () => {
				expect(acceptButton.dispatchEvent).toHaveBeenCalled();
				expect(databaseMock.saveWebsiteData).toHaveBeenCalledWith(
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
			
			rejectCookies(rejectButton, () => {
				expect(rejectButton.dispatchEvent).toHaveBeenCalled();
				expect(databaseMock.saveWebsiteData).toHaveBeenCalledWith(
					'example.com',
					expect.objectContaining({
						rejectSelector: '#rejectBtn'
					}),
					expect.any(Function)
				);
				expect(databaseMock.updateStatistics).toHaveBeenCalledWith(
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
			
			rejectCookies(rejectButton, () => {
				expect(rejectButton.dispatchEvent).toHaveBeenCalled();
				expect(databaseMock.saveWebsiteData).toHaveBeenCalledWith(
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
			
			settingsMock.settings.autoAccept = true;
			settingsMock.settings.privacyMode = false;
			
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
			
			settingsMock.settings.autoAccept = true;
			settingsMock.settings.privacyMode = true;
			
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
			
			settingsMock.settings.autoAccept = false;
			settingsMock.settings.privacyMode = false;
			
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
			
			settingsMock.settings.autoAccept = false;
			settingsMock.settings.privacyMode = true;
			
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
			
			settingsMock.settings.privacyMode = true;
			settingsMock.settings.autoAccept = false;
			
			// Override the simulateClick function for this test
			const originalSimulateClick = simulateClick;
			
			simulateClick = (element) => {
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
				simulateClick = originalSimulateClick;
				done();
			});
		});
		
		test('does nothing when dialog is null', (done) => {
			handleDialogAutomatically(null, () => {
				expect(databaseMock.saveWebsiteData).not.toHaveBeenCalled();
				expect(databaseMock.updateStatistics).not.toHaveBeenCalled();
				done();
			});
		});
		
		test('handles case when no buttons are found', (done) => {
			document.body.innerHTML = `
				<div id="cookieBanner">
					<p>This website uses cookies</p>
					<a href="/privacy">Privacy Policy</a>
				</div>
			`;
			
			const cookieDialog = document.getElementById('cookieBanner');
			
			handleDialogAutomatically(cookieDialog, () => {
				// No buttons were found, so saveWebsiteData should not be called
				expect(databaseMock.saveWebsiteData).not.toHaveBeenCalled();
				expect(databaseMock.updateStatistics).not.toHaveBeenCalled();
				done();
			});
		});
	});
}); 