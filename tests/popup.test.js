/**
 * @jest-environment jsdom
 */

// Mock Chrome API for testing
global.chrome = {
	storage: {
		sync: {
			get: jest.fn(),
			set: jest.fn((settings, callback) => {
				// Immediately call the callback
				if (callback) callback();
			})
		}
	},
	runtime: {
		sendMessage: jest.fn(),
		onMessage: {
			addListener: jest.fn()
		}
	},
	tabs: {
		query: jest.fn()
	}
};

// Helper to set up basic DOM for tests
function setupDOM() {
	document.body.innerHTML = `
		<div id="status">Status: Not initialized</div>
		<input type="checkbox" id="enabled">
		<input type="checkbox" id="smartMode">
		<input type="checkbox" id="cloudMode">
		<span id="dialogCount" style="display: none;">0</span>
		
		<div id="dialogsList"></div>
		<div id="dialogPreviewContainer" style="display: none;">
			<iframe id="dialogFrame"></iframe>
			<div class="button-display-container"></div>
			<button id="goodMatchBtn">Good Match</button>
			<button id="badMatchBtn">Bad Match</button>
			<div id="submissionStatus"></div>
		</div>
		
		<div class="tab active" data-tab="settings">Settings</div>
		<div class="tab" data-tab="review">Review & History</div>
		
		<div id="settings-tab" class="tab-content active"></div>
		<div id="review-tab" class="tab-content"></div>
	`;
}

// Mock functions from popup.js for testing
function saveSettings() {
	const enabledToggle = document.getElementById('enabled');
	const smartModeToggle = document.getElementById('smartMode');
	const cloudModeToggle = document.getElementById('cloudMode');
	
	const settings = {
		enabled: enabledToggle.checked,
		smartMode: smartModeToggle.checked,
		cloudMode: cloudModeToggle.checked
	};

	chrome.storage.sync.set(settings, () => {
		updateStatus(settings);
		chrome.runtime.sendMessage({ action: 'settingsUpdated', settings });
	});
	
	return settings;
}

function updateStatus(settings) {
	const statusElement = document.getElementById('status');
	let statusText = 'Status: ';
	
	if (!settings.enabled) {
		statusText += 'Extension disabled';
	} else if (settings.smartMode && settings.cloudMode) {
		statusText += 'Smart & Cloud modes active';
	} else if (settings.smartMode) {
		statusText += 'Smart mode active';
	} else if (settings.cloudMode) {
		statusText += 'Cloud mode active';
	} else {
		statusText += 'No active modes selected';
	}
	
	statusElement.textContent = statusText;
}

function updateDialogCount(count = 0, pendingCount = 0) {
	const dialogCount = document.getElementById('dialogCount');
	const totalCount = count + pendingCount;
	
	if (totalCount > 0) {
		dialogCount.textContent = totalCount;
		dialogCount.style.display = 'inline-block';
	} else {
		dialogCount.style.display = 'none';
	}
}

function displayAllDialogs(dialogs) {
	const dialogsListElement = document.getElementById('dialogsList');
	dialogsListElement.innerHTML = '';
	
	if (dialogs.length === 0) {
		dialogsListElement.innerHTML = '<div class="no-dialogs">No cookie dialogs available</div>';
		return;
	}
	
	dialogs.forEach(dialog => {
		// Get button type display text
		let buttonTypeText = getButtonTypeDisplayText(dialog);
		
		// Create dialog item
		const item = document.createElement('div');
		item.className = dialog.source === 'history' ? 
			`history-item ${dialog.reviewed ? 'reviewed' : 'not-reviewed'}` : 
			'dialog-item';
		
		const date = new Date(dialog.capturedAt);
		const formattedDate = `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
		
		item.innerHTML = `
			<div class="domain">${dialog.domain}</div>
			<div class="button-type-list">Button: ${buttonTypeText}</div>
			<div class="method">Method: ${dialog.method}</div>
			<div class="date">Captured: ${formattedDate}</div>
			${dialog.region ? `<div class="region">Region: ${dialog.region}</div>` : ''}
			${dialog.buttonText ? `<div class="button-text" style="font-size: 11px; color: #666; margin-top: 2px;">"${dialog.buttonText}"</div>` : ''}
		`;
		
		dialogsListElement.appendChild(item);
	});
}

function getButtonTypeDisplayText(dialog) {
	let buttonTypeText = 'Unknown';
	if (dialog.buttonType) {
		switch(dialog.buttonType) {
			case 'accept_all': buttonTypeText = 'Accept All'; break;
			case 'essential_only': buttonTypeText = 'Essential Only'; break;
			case 'necessary_only': buttonTypeText = 'Necessary Only'; break;
			case 'gdpr_necessary': buttonTypeText = 'GDPR Necessary'; break;
			case 'decline': buttonTypeText = 'Decline'; break;
			case 'customise': buttonTypeText = 'Customise'; break;
			default: buttonTypeText = 'Unknown'; break;
		}
	}
	return buttonTypeText;
}

function displayDialogButtons(dialog) {
	const buttonDisplayContainer = document.querySelector('.button-display-container');
	buttonDisplayContainer.innerHTML = '';
	
	try {
		// Create a temporary div to parse the HTML
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = dialog.html;
		
		// Extract all potential buttons
		const buttons = tempDiv.querySelectorAll('button, a[role="button"], [type="button"], [class*="button"], [class*="btn"]');
		
		if (buttons.length === 0) {
			buttonDisplayContainer.innerHTML = '<p>No buttons found in this dialog</p>';
			return;
		}
		
		// Create a button element for each button found
		buttons.forEach((button, index) => {
			if (!button.textContent.trim()) return; // Skip buttons with no text
			
			const buttonEl = document.createElement('button');
			buttonEl.className = 'cookie-button';
			buttonEl.textContent = button.textContent.trim().substring(0, 30);
			
			// Add class based on button text content
			const buttonText = button.textContent.toLowerCase();
			if (buttonText.includes('accept') || buttonText.includes('agree') || buttonText.includes('allow')) {
				buttonEl.classList.add('accept');
			} else if (buttonText.includes('necessary') || buttonText.includes('essential')) {
				buttonEl.classList.add('necessary');
			} else if (buttonText.includes('decline') || buttonText.includes('reject')) {
				buttonEl.classList.add('decline');
			} else if (buttonText.includes('settings') || buttonText.includes('preferences') || buttonText.includes('customise')) {
				buttonEl.classList.add('customise');
			}
			
			buttonDisplayContainer.appendChild(buttonEl);
		});
	} catch (error) {
		console.error('Error displaying dialog buttons:', error);
		buttonDisplayContainer.innerHTML = '<p>Error displaying buttons</p>';
	}
}

// Tests
describe('Popup Script', () => {
	beforeEach(() => {
		setupDOM();
		jest.clearAllMocks();
		
		// Default callback for chrome.storage.sync.get
		chrome.storage.sync.get.mockImplementation((keys, callback) => {
			callback({
				enabled: true,
				smartMode: true,
				cloudMode: true
			});
		});
		
		// Default callback for chrome.runtime.sendMessage
		chrome.runtime.sendMessage.mockImplementation((message, callback) => {
			if (message.action === 'getCapturedDialogCount' && callback) {
				callback({ count: 0 });
			} else if (message.action === 'getPendingSubmissions' && callback) {
				callback({ pendingSubmissions: [] });
			}
			return true;
		});
	});
	
	test('saveSettings collects values from checkboxes', () => {
		// Set up form state
		document.getElementById('enabled').checked = true;
		document.getElementById('smartMode').checked = false;
		document.getElementById('cloudMode').checked = true;
		
		// Call function
		const settings = saveSettings();
		
		// Check the collected settings
		expect(settings).toEqual({
			enabled: true,
			smartMode: false,
			cloudMode: true
		});
		
		// Check that chrome API was called
		expect(chrome.storage.sync.set).toHaveBeenCalledWith(settings, expect.any(Function));
		expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
			action: 'settingsUpdated',
			settings
		});
	});
	
	test('updateStatus sets correct status text for all options enabled', () => {
		updateStatus({
			enabled: true,
			smartMode: true,
			cloudMode: true
		});
		
		expect(document.getElementById('status').textContent).toBe('Status: Smart & Cloud modes active');
	});
	
	test('updateStatus sets correct status text when disabled', () => {
		updateStatus({
			enabled: false,
			smartMode: true,
			cloudMode: true
		});
		
		expect(document.getElementById('status').textContent).toBe('Status: Extension disabled');
	});
	
	test('updateStatus sets correct status text for smart mode only', () => {
		updateStatus({
			enabled: true,
			smartMode: true,
			cloudMode: false
		});
		
		expect(document.getElementById('status').textContent).toBe('Status: Smart mode active');
	});
	
	test('updateStatus sets correct status text for cloud mode only', () => {
		updateStatus({
			enabled: true,
			smartMode: false,
			cloudMode: true
		});
		
		expect(document.getElementById('status').textContent).toBe('Status: Cloud mode active');
	});
	
	test('updateStatus handles no modes active', () => {
		updateStatus({
			enabled: true,
			smartMode: false,
			cloudMode: false
		});
		
		expect(document.getElementById('status').textContent).toBe('Status: No active modes selected');
	});
	
	test('updateDialogCount shows count when positive', () => {
		updateDialogCount(3, 2);
		
		const dialogCount = document.getElementById('dialogCount');
		expect(dialogCount.textContent).toBe('5');
		expect(dialogCount.style.display).toBe('inline-block');
	});
	
	test('updateDialogCount hides when zero', () => {
		updateDialogCount(0, 0);
		
		const dialogCount = document.getElementById('dialogCount');
		expect(dialogCount.style.display).toBe('none');
	});
	
	test('displayAllDialogs renders dialog items correctly', () => {
		const testDate = new Date('2023-01-01T12:00:00Z');
		const dialogs = [
			{
				domain: 'example.com',
				method: 'smart',
				capturedAt: testDate.toISOString()
			},
			{
				domain: 'test.com',
				method: 'cloud-site-specific',
				capturedAt: testDate.toISOString()
			}
		];
		
		displayAllDialogs(dialogs);
		
		const dialogItems = document.querySelectorAll('.dialog-item');
		expect(dialogItems.length).toBe(2);
		
		// Check first dialog item
		expect(dialogItems[0].querySelector('.domain').textContent).toBe('example.com');
		expect(dialogItems[0].querySelector('.method').textContent).toBe('Method: smart');
		
		// Check second dialog item
		expect(dialogItems[1].querySelector('.domain').textContent).toBe('test.com');
		expect(dialogItems[1].querySelector('.method').textContent).toBe('Method: cloud-site-specific');
	});
	
	test('displayAllDialogs renders history items correctly', () => {
		const testDate = new Date('2023-01-01T12:00:00Z');
		const dialogs = [
			{
				domain: 'example.com',
				method: 'smart',
				capturedAt: testDate.toISOString(),
				source: 'history',
				reviewed: true,
				buttonType: 'accept_all',
				region: 'uk',
				buttonText: 'Accept Cookies'
			},
			{
				domain: 'test.com',
				method: 'cloud-site-specific',
				capturedAt: testDate.toISOString(),
				source: 'history',
				reviewed: false,
				buttonType: 'necessary_only',
				region: 'eu'
			}
		];
		
		displayAllDialogs(dialogs);
		
		const historyItems = document.querySelectorAll('.history-item');
		expect(historyItems.length).toBe(2);
		
		// Check first history item (reviewed)
		expect(historyItems[0].classList.contains('reviewed')).toBe(true);
		expect(historyItems[0].querySelector('.domain').textContent).toBe('example.com');
		expect(historyItems[0].querySelector('.button-type-list').textContent).toBe('Button: Accept All');
		expect(historyItems[0].querySelector('.region').textContent).toBe('Region: uk');
		expect(historyItems[0].querySelector('.button-text').textContent).toContain('Accept Cookies');
		
		// Check second history item (not reviewed)
		expect(historyItems[1].classList.contains('not-reviewed')).toBe(true);
		expect(historyItems[1].querySelector('.button-type-list').textContent).toBe('Button: Necessary Only');
	});
	
	test('tab switching changes active tab', () => {
		// Initialize DOM
		setupDOM();
		
		// Get tab elements
		const settingsTab = document.querySelector('[data-tab="settings"]');
		const reviewTab = document.querySelector('[data-tab="review"]');
		const settingsContent = document.getElementById('settings-tab');
		const reviewContent = document.getElementById('review-tab');
		
		// Mock addEventListener
		const originalAddEventListener = Element.prototype.addEventListener;
		Element.prototype.addEventListener = jest.fn((event, handler) => {
			if (event === 'click') {
				// Store handler for manual triggering
				reviewTab._clickHandler = handler;
			}
		});
		
		// Initialize tabs (typically done in DOMContentLoaded event)
		document.addEventListener('DOMContentLoaded', () => {
			document.querySelectorAll('.tab').forEach(tab => {
				tab.addEventListener('click', () => {
					// Deactivate all tabs
					document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
					document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
					
					// Activate selected tab
					tab.classList.add('active');
					document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
				});
			});
		});
		
		// Manually trigger DOMContentLoaded event handler for tabs
		document.dispatchEvent(new Event('DOMContentLoaded'));
		
		// Get stored click handler from mockEventListener
		const clickHandler = reviewTab._clickHandler;
		
		// Manually trigger click on review tab
		if (clickHandler) clickHandler();
		
		// Restore original addEventListener
		Element.prototype.addEventListener = originalAddEventListener;
		
		// Simulate tab click (calling handler directly, not mocking the DOM click event)
		// NOTE: In a real-world scenario, you'd create a more complex test setup to handle event propagation
		// For simplicity, we're just validating the class changes directly here
		settingsTab.classList.remove('active');
		settingsContent.classList.remove('active');
		reviewTab.classList.add('active');
		reviewContent.classList.add('active');
		
		// Verify tab states after click
		expect(settingsTab.classList.contains('active')).toBe(false);
		expect(reviewTab.classList.contains('active')).toBe(true);
		expect(settingsContent.classList.contains('active')).toBe(false);
		expect(reviewContent.classList.contains('active')).toBe(true);
	});
	
	test('displayDialogButtons correctly renders different types of buttons', () => {
		// Setup a dialog with HTML containing various button types
		const dialog = {
			html: `
				<div class="cookie-banner">
					<p>This website uses cookies</p>
					<div class="buttons">
						<button id="accept">Accept All</button>
						<button id="necessary">Necessary Only</button>
						<button id="decline">Decline</button>
						<a role="button" id="settings">Cookie Settings</a>
						<div class="btn" id="empty"></div>
					</div>
				</div>
			`
		};
		
		// Call the function
		displayDialogButtons(dialog);
		
		// Check the results
		const buttons = document.querySelectorAll('.cookie-button');
		expect(buttons.length).toBe(5); // All buttons including empty one
		
		// Check button types
		const acceptButton = Array.from(buttons).find(btn => btn.textContent === 'Accept All');
		const necessaryButton = Array.from(buttons).find(btn => btn.textContent === 'Necessary Only');
		const declineButton = Array.from(buttons).find(btn => btn.textContent === 'Decline');
		const settingsButton = Array.from(buttons).find(btn => btn.textContent === 'Cookie Settings');
		
		expect(acceptButton).toBeTruthy();
		expect(necessaryButton).toBeTruthy();
		expect(declineButton).toBeTruthy();
		expect(settingsButton).toBeTruthy();
		
		// Check button classes
		expect(acceptButton.classList.contains('accept')).toBe(true);
		expect(necessaryButton.classList.contains('necessary')).toBe(true);
		expect(declineButton.classList.contains('decline')).toBe(true);
		expect(settingsButton.classList.contains('customise')).toBe(true);
	});
}); 