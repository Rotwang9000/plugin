/**
 * @jest-environment jsdom
 * 
 * Banner Detection Test Utility
 * 
 * This utility tests our button detection logic against a directory
 * of banner HTML examples to verify correct identification of
 * accept and reject buttons while avoiding false positives with links.
 */

const fs = require('fs');
const path = require('path');
const process = require('process');

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

/**
 * Simplified version of isElementVisible for testing
 */
function isElementVisible(element) {
	if (!element) return false;
	
	// For testing purposes, all elements are considered visible
	// In a real environment, this would check CSS properties and dimensions
	return true;
}

/**
 * Find accept buttons in a container element
 */
function findAcceptButton(container) {
	// Common button texts for accepting cookies
	const acceptTexts = ['accept', 'agree', 'ok', 'yes', 'got it', 'allow', 'understand', 'consent'];
	
	// First try the simplest and most reliable approach - direct button ID matching
	// Many implementations use clear IDs for their buttons
	const directIdMatches = container.querySelectorAll('button[id*="accept"], button[id*="agree"], button[id*="allow"]');
	for (const button of directIdMatches) {
		// Skip if it's a settings, preferences or "more info" button
		const buttonText = button.textContent.toLowerCase().trim();
		if (buttonText.includes('settings') || buttonText.includes('preferences') || 
			buttonText.includes('customize') || buttonText.includes('customise') || 
			buttonText.includes('manage') || buttonText.includes('more about')) {
			continue;
		}
		return button;
	}
	
	// For forms, try to find submit inputs first
	if (container.tagName === 'FORM') {
		// Look for submit inputs with accept-related values
		const submitInputs = container.querySelectorAll('input[type="submit"]');
		for (const input of submitInputs) {
			const value = input.value?.toLowerCase() || '';
			const id = input.id?.toLowerCase() || '';
			const name = input.name?.toLowerCase() || '';
			
			if (value.includes('accept') || value.includes('agree') || 
				id.includes('accept') || id.includes('agree') ||
				name.includes('accept') || name.includes('agree')) {
				return input;
			}
		}
		
		// Look for buttons that are often nested in spans
		const buttonInputs = container.querySelectorAll('.a-button-input, [type="button"]');
		for (const button of buttonInputs) {
			const parentText = button.parentElement?.textContent?.toLowerCase() || '';
			if (acceptTexts.some(text => parentText.includes(text))) {
				return button;
			}
		}
	}
	
	// Now try explicit buttons with clear accept text
	const buttons = container.querySelectorAll('button');
	for (const button of buttons) {
		const text = button.textContent.toLowerCase().trim();
		if (text.includes('accept all') || text.includes('accept cookies')) {
			return button;
		}
	}
	
	// Then try all clickable elements with explicit accept-related text
	const clickables = container.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
	for (const element of clickables) {
		const text = element.textContent.toLowerCase().trim();
		
		// Check if the button text includes one of the accept texts
		if (acceptTexts.some(acceptText => text.includes(acceptText))) {
			// Skip if it contains "settings", "preferences", "customize" or "more about"
			if (text.includes('settings') || text.includes('preferences') || 
				text.includes('customize') || text.includes('customise') || 
				text.includes('manage') || text.includes('more about')) {
				continue;
			}
			return element;
		}
	}
	
	// Look for anchors with role="button" and appropriate text (but not informational links)
	const buttonAnchors = container.querySelectorAll('a[role="button"]');
	for (const anchor of buttonAnchors) {
		const text = anchor.textContent.toLowerCase().trim();
		const href = anchor.getAttribute('href') || '';
		
		// Skip information links with real paths
		if (href && href !== '#' && !href.startsWith('javascript:') && 
			(text.includes('learn more') || text.includes('more about') || 
			text.includes('privacy policy') || text.includes('cookie policy'))) {
			continue;
		}
		
		// Check if it has accept-related text
		if (acceptTexts.some(acceptText => text.includes(acceptText))) {
			// Skip if it contains "settings", etc.
			if (text.includes('settings') || text.includes('preferences') || 
				text.includes('customize') || text.includes('customise') || 
				text.includes('manage')) {
				continue;
			}
			return anchor;
		}
	}
	
	// If no explicit accept button found, look for primary buttons (usually styled as blue/green)
	for (const element of clickables) {
		const classes = element.className.toLowerCase();
		if (classes.includes('accept') || 
			classes.includes('agree') || 
			classes.includes('allow') || 
			classes.includes('consent') ||
			classes.includes('primary') || 
			classes.includes('main') || 
			classes.includes('btn-primary') ||
			classes.includes('continue-button')) {
			return element;
		}
	}
	
	// Last resort - look for the first button if the container clearly has cookie attributes
	if (container.getAttribute('data-testid')?.includes('cookie') || 
		container.getAttribute('aria-label')?.includes('cookie') ||
		container.id?.toLowerCase().includes('cookie') ||
		container.className?.toLowerCase().includes('cookie')) {
		const buttons = container.querySelectorAll('button');
		if (buttons.length > 0) {
			// Often the first button is accept
			return buttons[0];
		}
	}
	
	return null;
}

/**
 * Find necessary cookies/reject buttons in a container element
 */
function findNecessaryCookiesButton(container) {
	// Terms that indicate necessary/essential cookies only options
	const necessaryTerms = [
		'necessary', 'essential', 'required', 'basic', 
		'functional', 'reject all', 'reject', 'decline', 'refuse',
		'only necessary', 'only essential'
	];
	
	// First try buttons with explicit necessary-related text
	const clickables = container.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
	
	// First prioritize "reject all" or "decline all" buttons which are clearest
	for (const element of clickables) {
		const text = element.textContent.toLowerCase().trim();
		
		// Prioritize "reject all" type buttons first
		if (text.includes('reject all') || text.includes('decline all') || text.includes('refuse all')) {
			return element;
		}
		
		// Check ID for reject-related terms - with high priority
		const id = element.id?.toLowerCase() || '';
		if (id.includes('reject-all') || id.includes('refuse-all') || id.includes('decline-all')) {
			return element;
		}
	}
	
	// Then check for other necessary/reject buttons
	for (const element of clickables) {
		const text = element.textContent.toLowerCase().trim();
		
		// Check for necessary/essential cookies terms
		if (necessaryTerms.some(term => text.includes(term))) {
			// Skip if it contains terms that suggest it might not be what we want
			if (text.includes('preferences') || text.includes('customize') || 
				text.includes('settings') || text.includes('more about')) {
				continue;
			}
			return element;
		}
		
		// Check ID for reject-related terms
		const id = element.id?.toLowerCase() || '';
		if (id.includes('reject') || id.includes('refuse') || id.includes('decline') || 
			id.includes('necessary-only') || id.includes('essential-only')) {
			return element;
		}
	}
	
	return null;
}

/**
 * Check if an element is likely to be a link that's not a button
 * (This helps identify false positives)
 */
function isLikelyInformationalLink(element) {
	if (element.tagName !== 'A') return false;
	
	const text = element.textContent.toLowerCase().trim();
	const href = element.getAttribute('href') || '';
	const role = element.getAttribute('role') || '';
	
	// If it has role="button", it's intended to be a button
	if (role === 'button') return false;
	
	// If it has a specific path and contains informational terms, it's likely just a link
	if (href && href !== '#' && !href.startsWith('javascript:')) {
		if (text.includes('learn more') || 
			text.includes('more about') || 
			text.includes('privacy policy') || 
			text.includes('cookie policy') || 
			text.includes('information')) {
			return true;
		}
	}
	
	return false;
}

/**
 * Analyze a banner element to identify buttons and potential issues
 */
function analyzeBanner(bannerHtml, bannerName) {
	const container = document.createElement('div');
	container.innerHTML = bannerHtml;
	
	// Get document element
	const docElement = container.firstChild;
	
	// Find all interactive elements for analysis
	const buttons = docElement.querySelectorAll('button');
	const anchors = docElement.querySelectorAll('a');
	const inputButtons = docElement.querySelectorAll('input[type="button"], input[type="submit"]');
	const customRoleButtons = docElement.querySelectorAll('[role="button"]');
	
	// Find the accept and necessary buttons using our algorithms
	const acceptButton = findAcceptButton(docElement);
	const necessaryButton = findNecessaryCookiesButton(docElement);
	
	// Check for potential issues
	const issues = [];
	
	// Check if the accept button is actually an informational link
	if (acceptButton && isLikelyInformationalLink(acceptButton)) {
		issues.push(`WARNING: Accept button appears to be an informational link: "${acceptButton.textContent.trim()}"`);
	}
	
	// Check if the necessary button is actually an informational link
	if (necessaryButton && isLikelyInformationalLink(necessaryButton)) {
		issues.push(`WARNING: Necessary button appears to be an informational link: "${necessaryButton.textContent.trim()}"`);
	}
	
	// Check if any informational links could have been confused with buttons
	anchors.forEach(anchor => {
		const text = anchor.textContent.toLowerCase().trim();
		if (isLikelyInformationalLink(anchor) && 
			(text.includes('accept') || 
			text.includes('agree') || 
			text.includes('allow') ||
			text.includes('necessary') ||
			text.includes('essential') ||
			text.includes('reject'))) {
			
			// Check if this informational link was incorrectly identified as a button
			if (anchor === acceptButton) {
				issues.push(`ERROR: Informational link incorrectly identified as accept button: "${anchor.textContent.trim()}"`);
			} else if (anchor === necessaryButton) {
				issues.push(`ERROR: Informational link incorrectly identified as necessary button: "${anchor.textContent.trim()}"`);
			}
		}
	});
	
	return {
		bannerName,
		acceptButton: acceptButton ? {
			tag: acceptButton.tagName,
			id: acceptButton.id || 'none',
			className: acceptButton.className || 'none',
			text: acceptButton.textContent.trim(),
			isLink: acceptButton.tagName === 'A'
		} : null,
		necessaryButton: necessaryButton ? {
			tag: necessaryButton.tagName,
			id: necessaryButton.id || 'none',
			className: necessaryButton.className || 'none',
			text: necessaryButton.textContent.trim(),
			isLink: necessaryButton.tagName === 'A'
		} : null,
		elementCounts: {
			buttons: buttons.length,
			anchors: anchors.length,
			inputButtons: inputButtons.length,
			customRoleButtons: customRoleButtons.length
		},
		issues
	};
}

/**
 * Process all banner examples in the specified directory
 */
function processBannerExamples(directoryPath) {
	const results = [];
	
	try {
		const files = fs.readdirSync(directoryPath);
		
		for (const file of files) {
			if (file.endsWith('.html')) {
				const filePath = path.join(directoryPath, file);
				const bannerHtml = fs.readFileSync(filePath, 'utf8');
				
				const result = analyzeBanner(bannerHtml, file);
				results.push(result);
			}
		}
	} catch (error) {
		console.error('Error processing banner examples:', error);
	}
	
	return results;
}

/**
 * Format results as a readable report
 */
function formatReport(results) {
	let report = '# Cookie Banner Analysis Report\n\n';
	
	results.forEach(result => {
		report += `## ${result.bannerName}\n\n`;
		
		report += `### Element Counts\n`;
		report += `- Buttons: ${result.elementCounts.buttons}\n`;
		report += `- Anchors: ${result.elementCounts.anchors}\n`;
		report += `- Input Buttons: ${result.elementCounts.inputButtons}\n`;
		report += `- Custom Role Buttons: ${result.elementCounts.customRoleButtons}\n\n`;
		
		report += `### Accept Button\n`;
		if (result.acceptButton) {
			report += `- Tag: ${result.acceptButton.tag}\n`;
			report += `- ID: ${result.acceptButton.id}\n`;
			report += `- Class: ${result.acceptButton.className}\n`;
			report += `- Text: "${result.acceptButton.text}"\n`;
			report += `- Is Link: ${result.acceptButton.isLink}\n\n`;
		} else {
			report += `- Not found\n\n`;
		}
		
		report += `### Necessary/Reject Button\n`;
		if (result.necessaryButton) {
			report += `- Tag: ${result.necessaryButton.tag}\n`;
			report += `- ID: ${result.necessaryButton.id}\n`;
			report += `- Class: ${result.necessaryButton.className}\n`;
			report += `- Text: "${result.necessaryButton.text}"\n`;
			report += `- Is Link: ${result.necessaryButton.isLink}\n\n`;
		} else {
			report += `- Not found\n\n`;
		}
		
		if (result.issues.length > 0) {
			report += `### Issues\n`;
			result.issues.forEach(issue => {
				report += `- ${issue}\n`;
			});
			report += '\n';
		} else {
			report += `### Issues\n- None detected\n\n`;
		}
		
		report += `---\n\n`;
	});
	
	return report;
}

/**
 * Process banner HTML provided via command line arguments (if any)
 * This allows quickly adding new examples from the command line
 */
function processCmdLineExample() {
	const args = process.argv.slice(2);
	const htmlIndex = args.findIndex(arg => arg.startsWith('--html='));
	const nameIndex = args.findIndex(arg => arg.startsWith('--name='));
	
	if (htmlIndex !== -1 && nameIndex !== -1) {
		try {
			// Extract HTML and name from command line
			const html = args[htmlIndex].substring('--html='.length);
			const name = args[nameIndex].substring('--name='.length) || `example-${Date.now()}.html`;
			
			// Make sure the name has .html extension
			const filename = name.endsWith('.html') ? name : `${name}.html`;
			
			// Create banner-examples directory if needed
			const examplesDir = path.join(__dirname, 'banner-examples');
			if (!fs.existsSync(examplesDir)) {
				fs.mkdirSync(examplesDir, { recursive: true });
			}
			
			// Save the example
			fs.writeFileSync(path.join(examplesDir, filename), html);
			console.log(`Saved new banner example as: ${filename}`);
			
			// Analyze the example
			const result = analyzeBanner(html, filename);
			console.log('\nQuick analysis:');
			console.log(`Accept button: ${result.acceptButton ? result.acceptButton.text : 'Not found'}`);
			console.log(`Necessary button: ${result.necessaryButton ? result.necessaryButton.text : 'Not found'}`);
			console.log(`Issues: ${result.issues.length > 0 ? result.issues.join(', ') : 'None'}`);
			
			// Exit early since we're just adding an example
			process.exit(0);
		} catch (error) {
			console.error('Error processing command line example:', error);
		}
	}
}

// Process command line example before running the test
processCmdLineExample();

/**
 * Main test function
 */
describe('Banner Button Detection Test', () => {
	it('should correctly identify buttons in all banner examples', () => {
		// Set up jsdom for testing
		document.body.innerHTML = '';
		
		// Path to banner examples
		const bannerExamplesDir = path.join(__dirname, 'banner-examples');
		
		// Process all banner examples
		const results = processBannerExamples(bannerExamplesDir);
		
		// Generate and save the report
		const report = formatReport(results);
		fs.writeFileSync(path.join(__dirname, 'banner-analysis-report.md'), report);
		
		// Output the report to console for immediate review
		console.log(report);
		
		// Assert that all banners were properly analyzed
		expect(results.length).toBeGreaterThan(0);
		
		// For each result, check if there are any critical errors
		results.forEach(result => {
			const criticalErrors = result.issues.filter(issue => issue.startsWith('ERROR:'));
			expect(criticalErrors).toHaveLength(0);
		});
	});
}); 