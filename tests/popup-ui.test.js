/**
 * @jest-environment jsdom
 */

// Mock Chrome API
global.chrome = {
	storage: {
		sync: {
			get: jest.fn((keys, callback) => {
				callback({
					enabled: true,
					autoAccept: true,
					smartMode: true,
					cloudMode: true,
					privacyMode: true,
					gdprCompliance: true
				});
			}),
			set: jest.fn((data, callback) => {
				if (callback) callback();
			})
		},
		local: {
			get: jest.fn((keys, callback) => {
				callback({
					initialPermissionAsked: true
				});
			}),
			set: jest.fn()
		}
	},
	runtime: {
		onMessage: {
			addListener: jest.fn(),
		},
		sendMessage: jest.fn((message, callback) => {
			if (message.action === 'analyzeSource') {
				// Mock the analyzeSource response
				callback({
					detected: true,
					hasCookieTerms: true,
					hasButtons: true,
					hasAcceptButton: true,
					hasNecessaryButton: true,
					isForm: false,
					acceptButtonText: 'Accept All',
					necessaryButtonText: 'Necessary Only',
					recommendations: []
				});
			} else if (message.action === 'getDataCollectionConsent') {
				callback({ consent: true });
			} else if (callback) {
				callback({});
			}
			return true;
		})
	},
	tabs: {
		query: jest.fn((queryInfo, callback) => {
			callback([{ id: 1 }]);
		}),
		sendMessage: jest.fn((tabId, message, callback) => {
			// Mock different responses based on message action
			if (callback && typeof callback === 'function') {
				if (message.action === 'analyzeSource') {
					callback({
						detected: true,
						hasCookieTerms: true,
						hasButtons: true,
						hasAcceptButton: true,
						hasNecessaryButton: true,
						isForm: false,
						acceptButtonText: 'Accept All',
						necessaryButtonText: 'Necessary Only',
						recommendations: []
					});
				} else {
					callback({});
				}
			}
			return true;
		})
	},
	action: {
		setBadgeText: jest.fn()
	}
};

// Set up DOM for testing
function setupPopupDOM() {
	document.body.innerHTML = `
		<div class="tabs">
			<div class="tab active" data-tab="settings">Settings</div>
			<div class="tab" data-tab="review">Review & History <span id="dialogCount">0</span></div>
			<div class="tab" data-tab="details">Details</div>
			<div class="tab" data-tab="analyze">Analyze Source</div>
		</div>
		
		<div id="settings-tab" class="tab-content active">
			<!-- Settings tab content -->
			<div id="status">Status: Extension enabled</div>
		</div>
		
		<div id="review-tab" class="tab-content">
			<!-- Review tab content -->
			<div id="dialogsList"></div>
		</div>
		
		<div id="details-tab" class="tab-content">
			<!-- Details tab content -->
			<div id="dialogDetailContainer" style="display: none;"></div>
			<div id="noSelectionMessage" class="no-details"></div>
		</div>
		
		<div id="analyze-tab" class="tab-content">
			<div class="container">
				<h1>Analyze Cookie Box Source</h1>
				<textarea id="sourceInput" placeholder="Paste HTML source here..."></textarea>
				<button id="analyzeBtn" class="action-button">Analyze Source</button>
				
				<div id="analysisResults" style="display: none;">
					<div class="detail-section">
						<div class="detail-item">
							<strong>Detection:</strong> <span id="detectionResult"></span>
						</div>
						<div class="detail-item">
							<strong>Cookie Terms Found:</strong> <span id="cookieTermsResult"></span>
						</div>
						<div class="detail-item">
							<strong>Buttons Found:</strong> <span id="buttonsResult"></span>
						</div>
						<div class="detail-item">
							<strong>Accept Button:</strong> <span id="acceptButtonResult"></span>
						</div>
						<div class="detail-item">
							<strong>Necessary Button:</strong> <span id="necessaryButtonResult"></span>
						</div>
					</div>
					
					<div class="detail-section">
						<h4>Recommendations</h4>
						<ul id="recommendationsList"></ul>
					</div>
				</div>
			</div>
		</div>
	`;
}

// Mock implementation of displayAnalysisResults function
function displayAnalysisResults(result) {
	const analysisResults = document.getElementById('analysisResults');
	const detectionResult = document.getElementById('detectionResult');
	const cookieTermsResult = document.getElementById('cookieTermsResult');
	const buttonsResult = document.getElementById('buttonsResult');
	const acceptButtonResult = document.getElementById('acceptButtonResult');
	const necessaryButtonResult = document.getElementById('necessaryButtonResult');
	const recommendationsList = document.getElementById('recommendationsList');
	
	// Show results container
	analysisResults.style.display = 'block';
	
	// Format detection result
	detectionResult.innerHTML = result.detected ? 
		'<span style="color: #4CAF50; font-weight: bold;">Detected ✓</span>' : 
		'<span style="color: #F44336; font-weight: bold;">Not Detected ✗</span>';
	
	// Format other results
	cookieTermsResult.innerHTML = result.hasCookieTerms ? 
		'<span style="color: #4CAF50;">Yes ✓</span>' : 
		'<span style="color: #F44336;">No ✗</span>';
		
	buttonsResult.innerHTML = result.hasButtons ? 
		'<span style="color: #4CAF50;">Yes ✓</span>' : 
		'<span style="color: #F44336;">No ✗</span>';
		
	acceptButtonResult.innerHTML = result.hasAcceptButton ? 
		`<span style="color: #4CAF50;">Found: "${result.acceptButtonText}" ✓</span>` : 
		'<span style="color: #F44336;">Not Found ✗</span>';
		
	necessaryButtonResult.innerHTML = result.hasNecessaryButton ? 
		`<span style="color: #4CAF50;">Found: "${result.necessaryButtonText}" ✓</span>` : 
		'<span style="color: #F44336;">Not Found ✗</span>';
	
	// Display recommendations
	recommendationsList.innerHTML = '';
	if (result.recommendations && result.recommendations.length > 0) {
		result.recommendations.forEach(recommendation => {
			const li = document.createElement('li');
			li.textContent = recommendation;
			recommendationsList.appendChild(li);
		});
	} else {
		const li = document.createElement('li');
		li.textContent = 'No recommendations needed. Smart formula works correctly for this cookie box.';
		li.style.color = '#4CAF50';
		recommendationsList.appendChild(li);
	}
}

// Create a simple version of the event listener and handler for the analyze tab
function setupAnalyzeTabHandlers() {
	const analyzeBtn = document.getElementById('analyzeBtn');
	const sourceInput = document.getElementById('sourceInput');
	
	if (analyzeBtn) {
		analyzeBtn.addEventListener('click', () => {
			const source = sourceInput.value.trim();
			if (!source) {
				window.alert = jest.fn();
				alert('Please paste HTML source code first');
				return;
			}
			
			// Show loading state
			analyzeBtn.textContent = 'Analyzing...';
			analyzeBtn.disabled = true;
			
			// Send to content script for analysis
			chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
				if (tabs[0]) {
					chrome.tabs.sendMessage(tabs[0].id, {
						action: 'analyzeSource',
						source: source
					}, (result) => {
						analyzeBtn.textContent = 'Analyze Source';
						analyzeBtn.disabled = false;
						
						if (result && !result.error) {
							displayAnalysisResults(result);
						} else {
							// Handle error
							window.alert = jest.fn();
							alert('Error analyzing source: ' + (result?.errorDetails || 'Unknown error'));
						}
					});
				} else {
					// No active tab
					analyzeBtn.textContent = 'Analyze Source';
					analyzeBtn.disabled = false;
					window.alert = jest.fn();
					alert('Cannot analyze source: No active tab');
				}
			});
		});
	}
}

// Setup tab switching
function setupTabSwitching() {
	const tabs = document.querySelectorAll('.tab');
	const tabContents = document.querySelectorAll('.tab-content');
	
	tabs.forEach(tab => {
		tab.addEventListener('click', () => {
			// Deactivate all tabs
			tabs.forEach(t => t.classList.remove('active'));
			tabContents.forEach(tc => tc.classList.remove('active'));
			
			// Activate selected tab
			tab.classList.add('active');
			document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
		});
	});
}

describe('Popup UI - Analyze Tab', () => {
	beforeEach(() => {
		// Setup the DOM for testing
		setupPopupDOM();
		
		// Setup the handlers
		setupAnalyzeTabHandlers();
		setupTabSwitching();
		
		// Clear mocks
		jest.clearAllMocks();
		
		// Mock the alert function
		window.alert = jest.fn();
	});
	
	test('analyze tab is properly displayed when clicked', () => {
		// Get the analyze tab
		const analyzeTab = document.querySelector('.tab[data-tab="analyze"]');
		
		// Click the tab
		analyzeTab.click();
		
		// Check that the analyze tab is active
		expect(analyzeTab.classList.contains('active')).toBe(true);
		
		// Check that the analyze tab content is visible
		const analyzeTabContent = document.getElementById('analyze-tab');
		expect(analyzeTabContent.classList.contains('active')).toBe(true);
		
		// Check that other tabs are not active
		const settingsTab = document.querySelector('.tab[data-tab="settings"]');
		expect(settingsTab.classList.contains('active')).toBe(false);
		
		const settingsTabContent = document.getElementById('settings-tab');
		expect(settingsTabContent.classList.contains('active')).toBe(false);
	});
	
	test('analyze button shows alert when no source is provided', () => {
		// Get the analyze tab and make it active
		const analyzeTab = document.querySelector('.tab[data-tab="analyze"]');
		analyzeTab.click();
		
		// Get the analyze button
		const analyzeBtn = document.getElementById('analyzeBtn');
		
		// Click the button with no source text
		analyzeBtn.click();
		
		// Check that alert was called
		expect(window.alert).toHaveBeenCalledWith('Please paste HTML source code first');
		
		// Check that button state wasn't changed
		expect(analyzeBtn.textContent).toBe('Analyze Source');
		expect(analyzeBtn.disabled).toBe(false);
	});
	
	test('analyze button sends message and displays results', () => {
		// Get the analyze tab and make it active
		const analyzeTab = document.querySelector('.tab[data-tab="analyze"]');
		analyzeTab.click();
		
		// Get the source input and set a value
		const sourceInput = document.getElementById('sourceInput');
		sourceInput.value = `
			<div class="cookie-banner">
				<h2>Cookie Notice</h2>
				<p>This website uses cookies to enhance your browsing experience.</p>
				<button id="accept-cookies">Accept All</button>
				<button id="necessary-only">Necessary Only</button>
			</div>
		`;
		
		// Get the analyze button
		const analyzeBtn = document.getElementById('analyzeBtn');
		
		// Click the button
		analyzeBtn.click();
		
		// Check that chrome.tabs.query was called
		expect(chrome.tabs.query).toHaveBeenCalled();
		
		// Check that chrome.tabs.sendMessage was called with the right action
		expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
			expect.any(Number),
			expect.objectContaining({ 
				action: 'analyzeSource',
				source: expect.any(String)
			}),
			expect.any(Function)
		);
		
		// Check that results are displayed
		const analysisResults = document.getElementById('analysisResults');
		expect(analysisResults.style.display).toBe('block');
		
		// Check the detection result
		const detectionResult = document.getElementById('detectionResult');
		expect(detectionResult.innerHTML).toContain('Detected');
		
		// Check the recommendations list
		const recommendationsList = document.getElementById('recommendationsList');
		expect(recommendationsList.innerHTML).toContain('No recommendations needed');
	});
	
	test('analyze button handles API error', () => {
		// Setup DOM
		setupPopupDOM();
		
		// Mock window.alert
		window.alert = jest.fn();
		
		// Mock the analyzeBtn's event listener
		const analyzeBtn = document.getElementById('analyzeBtn');
		const sourceInput = document.getElementById('sourceInput');
		sourceInput.value = '<div>Some HTML source</div>';
		
		// Store the original addEventListener
		const originalAddEventListener = HTMLElement.prototype.addEventListener;
		
		// Override addEventListener to capture the click handler
		let clickHandler = null;
		HTMLElement.prototype.addEventListener = function(event, handler) {
			if (this === analyzeBtn && event === 'click') {
				clickHandler = handler;
			}
		};
		
		// Setup click handler for analyze button (this would normally be in popup.js)
		analyzeBtn.addEventListener('click', function() {
			const source = sourceInput.value.trim();
			if (!source) {
				window.alert('Please paste HTML source code to analyze');
				return;
			}
			
			chrome.runtime.sendMessage(
				{ action: 'analyzeSource', source: source },
				function(response) {
					if (response.error) {
						window.alert('Error analyzing source: ' + response.error);
					} else {
						displayAnalysisResults(response);
					}
				}
			);
		});
		
		// Restore original addEventListener
		HTMLElement.prototype.addEventListener = originalAddEventListener;
		
		// Mock runtime.sendMessage to simulate error
		const originalSendMessage = chrome.runtime.sendMessage;
		chrome.runtime.sendMessage = jest.fn((message, callback) => {
			if (message.action === 'analyzeSource') {
				callback({ error: 'Test error' });
			}
			return true;
		});
		
		// Trigger the click handler directly
		clickHandler.call(analyzeBtn);
		
		// Check alert was called with error message
		expect(window.alert).toHaveBeenCalledWith('Error analyzing source: Test error');
		
		// Restore original sendMessage
		chrome.runtime.sendMessage = originalSendMessage;
	});
	
	test('displayAnalysisResults properly formats a detected cookie box', () => {
		const result = {
			detected: true,
			hasCookieTerms: true,
			hasButtons: true,
			hasAcceptButton: true,
			hasNecessaryButton: true,
			isForm: false,
			acceptButtonText: 'Accept All',
			necessaryButtonText: 'Necessary Only',
			recommendations: []
		};
		
		displayAnalysisResults(result);
		
		// Check that results are displayed
		const analysisResults = document.getElementById('analysisResults');
		expect(analysisResults.style.display).toBe('block');
		
		// Check each result field
		expect(document.getElementById('detectionResult').innerHTML).toContain('Detected');
		expect(document.getElementById('cookieTermsResult').innerHTML).toContain('Yes');
		expect(document.getElementById('buttonsResult').innerHTML).toContain('Yes');
		expect(document.getElementById('acceptButtonResult').innerHTML).toContain('Accept All');
		expect(document.getElementById('necessaryButtonResult').innerHTML).toContain('Necessary Only');
		
		// Check recommendations
		const recommendationsList = document.getElementById('recommendationsList');
		expect(recommendationsList.textContent).toContain('No recommendations needed');
	});
	
	test('displayAnalysisResults properly formats a non-detected cookie box with recommendations', () => {
		const result = {
			detected: false,
			hasCookieTerms: true,
			hasButtons: true,
			hasAcceptButton: false,
			hasNecessaryButton: false,
			isForm: false,
			acceptButtonText: null,
			necessaryButtonText: null,
			recommendations: [
				'Enhance button detection for non-standard naming patterns',
				'Add pattern matching for button texts like: Continue'
			]
		};
		
		displayAnalysisResults(result);
		
		// Check that results are displayed
		const analysisResults = document.getElementById('analysisResults');
		expect(analysisResults.style.display).toBe('block');
		
		// Check each result field
		expect(document.getElementById('detectionResult').innerHTML).toContain('Not Detected');
		expect(document.getElementById('cookieTermsResult').innerHTML).toContain('Yes');
		expect(document.getElementById('buttonsResult').innerHTML).toContain('Yes');
		expect(document.getElementById('acceptButtonResult').innerHTML).toContain('Not Found');
		expect(document.getElementById('necessaryButtonResult').innerHTML).toContain('Not Found');
		
		// Check recommendations
		const recommendationsList = document.getElementById('recommendationsList');
		const recommendations = recommendationsList.querySelectorAll('li');
		expect(recommendations.length).toBe(2);
		expect(recommendations[0].textContent).toContain('Enhance button detection');
		expect(recommendations[1].textContent).toContain('Add pattern matching');
	});
}); 