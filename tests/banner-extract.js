/**
 * Banner Element Extractor
 * 
 * This utility analyzes complex cookie banners and extracts the key interactive
 * elements that might be cookie accept/reject buttons. It helps with debugging
 * detection algorithms on large, complex banner structures.
 * 
 * Usage: node banner-extract.js <banner-file> [--output <output-file>]
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

/**
 * Extract key interactive elements from a banner
 */
function extractKeyElements(bannerHtml) {
	const dom = new JSDOM(bannerHtml);
	const { document } = dom.window;
	
	// Find all interactive elements
	const buttons = document.querySelectorAll('button');
	const anchors = document.querySelectorAll('a');
	const inputButtons = document.querySelectorAll('input[type="button"], input[type="submit"]');
	const customRoleButtons = document.querySelectorAll('[role="button"]');
	
	// Extract interesting buttons based on text content
	const keyTerms = ['accept', 'agree', 'consent', 'got it', 'ok', 'yes', 'allow',
					'reject', 'decline', 'refuse', 'necessary', 'essential', 'manage'];
	
	const potentialButtons = [];
	
	// Function to evaluate an element's relevance for cookie consent
	function evaluateElement(element, type) {
		const text = element.textContent.toLowerCase().trim();
		const id = element.id?.toLowerCase() || '';
		const classes = element.className?.toLowerCase() || '';
		
		// Skip elements with very long text (likely not buttons)
		if (text.length > 100) return false;
		
		// Skip elements without text
		if (text.length === 0) return false;
		
		// Skip elements that are clearly informational links
		if (type === 'anchor' && 
			(text.includes('learn more') || 
			 text.includes('privacy policy') || 
			 text.includes('cookie policy'))) {
			return false;
		}
		
		// Evaluate relevance score
		let score = 0;
		
		// Check text for key terms
		for (const term of keyTerms) {
			if (text.includes(term)) {
				score += 10;
				break;
			}
		}
		
		// Check ID for key terms
		for (const term of keyTerms) {
			if (id.includes(term)) {
				score += 8;
				break;
			}
		}
		
		// Check class for key terms
		for (const term of keyTerms) {
			if (classes.includes(term)) {
				score += 5;
				break;
			}
		}
		
		// Bonus for elements that contain "cookie"
		if (text.includes('cookie') || id.includes('cookie') || classes.includes('cookie')) {
			score += 3;
		}
		
		// Buttons get a slight priority bonus
		if (type === 'button') {
			score += 2;
		}
		
		// Only include elements with a minimum relevance
		return score >= 5;
	}
	
	// Process buttons
	buttons.forEach(button => {
		if (evaluateElement(button, 'button')) {
			potentialButtons.push({
				type: 'button',
				tag: button.tagName,
				id: button.id || 'none',
				className: button.className || 'none',
				text: button.textContent.trim()
			});
		}
	});
	
	// Process anchors
	anchors.forEach(anchor => {
		if (evaluateElement(anchor, 'anchor')) {
			potentialButtons.push({
				type: 'anchor',
				tag: anchor.tagName,
				id: anchor.id || 'none',
				className: anchor.className || 'none',
				text: anchor.textContent.trim(),
				href: anchor.getAttribute('href') || 'none'
			});
		}
	});
	
	// Process input buttons
	inputButtons.forEach(input => {
		if (evaluateElement(input, 'input')) {
			potentialButtons.push({
				type: 'input',
				tag: input.tagName,
				id: input.id || 'none',
				className: input.className || 'none',
				value: input.value || 'none'
			});
		}
	});
	
	// Process custom role buttons
	customRoleButtons.forEach(customButton => {
		if (evaluateElement(customButton, 'role-button')) {
			potentialButtons.push({
				type: 'role-button',
				tag: customButton.tagName,
				id: customButton.id || 'none',
				className: customButton.className || 'none',
				text: customButton.textContent.trim()
			});
		}
	});
	
	// Sort by potential relevance
	potentialButtons.sort((a, b) => {
		// First prioritize buttons with "accept all" or "reject all" in text
		const aText = a.text?.toLowerCase() || '';
		const bText = b.text?.toLowerCase() || '';
		
		if (aText.includes('accept all') && !bText.includes('accept all')) return -1;
		if (!aText.includes('accept all') && bText.includes('accept all')) return 1;
		
		if (aText.includes('reject all') && !bText.includes('reject all')) return -1;
		if (!aText.includes('reject all') && bText.includes('reject all')) return 1;
		
		// Then prioritize by element type
		const typeOrder = { 'button': 0, 'role-button': 1, 'input': 2, 'anchor': 3 };
		return typeOrder[a.type] - typeOrder[b.type];
	});
	
	// Create summary of banner structure
	const summary = {
		counts: {
			buttons: buttons.length,
			anchors: anchors.length,
			inputButtons: inputButtons.length,
			customRoleButtons: customRoleButtons.length
		},
		potentialButtons
	};
	
	return summary;
}

/**
 * Format the extracted elements as Markdown report
 */
function formatReport(summary, bannerName) {
	let report = `# Banner Element Analysis: ${bannerName}\n\n`;
	
	// Add element counts
	report += '## Element Counts\n';
	report += `- Buttons: ${summary.counts.buttons}\n`;
	report += `- Anchors: ${summary.counts.anchors}\n`;
	report += `- Input Buttons: ${summary.counts.inputButtons}\n`;
	report += `- Custom Role Buttons: ${summary.counts.customRoleButtons}\n\n`;
	
	// Add potential buttons
	report += '## Potential Cookie Related Elements\n\n';
	
	if (summary.potentialButtons.length === 0) {
		report += '*No potential buttons found*\n\n';
	} else {
		summary.potentialButtons.forEach((button, index) => {
			report += `### Element ${index + 1}\n`;
			report += `- Type: ${button.type}\n`;
			report += `- Tag: ${button.tag}\n`;
			report += `- ID: ${button.id}\n`;
			report += `- Class: ${button.className}\n`;
			
			if (button.type === 'input') {
				report += `- Value: ${button.value}\n`;
			} else {
				report += `- Text: "${button.text}"\n`;
			}
			
			if (button.type === 'anchor' && button.href) {
				report += `- Href: ${button.href}\n`;
			}
			
			report += '\n';
		});
	}
	
	return report;
}

/**
 * Main function
 */
function main() {
	const args = process.argv.slice(2);
	
	if (args.length === 0) {
		console.error('Usage: node banner-extract.js <banner-file> [--output <output-file>]');
		process.exit(1);
	}
	
	const bannerFile = args[0];
	const outputIndex = args.indexOf('--output');
	const outputFile = outputIndex !== -1 && args.length > outputIndex + 1 
		? args[outputIndex + 1] 
		: null;
	
	try {
		// Default path is in the banner-examples directory
		let filePath = bannerFile;
		if (!fs.existsSync(filePath)) {
			filePath = path.join(__dirname, 'banner-examples', bannerFile);
		}
		
		if (!fs.existsSync(filePath)) {
			console.error(`Banner file not found: ${filePath}`);
			process.exit(1);
		}
		
		// Read and analyze banner
		const bannerHtml = fs.readFileSync(filePath, 'utf8');
		const summary = extractKeyElements(bannerHtml);
		const report = formatReport(summary, path.basename(filePath));
		
		// Output report
		if (outputFile) {
			fs.writeFileSync(outputFile, report);
			console.log(`Report saved to: ${outputFile}`);
		} else {
			console.log(report);
		}
	} catch (error) {
		console.error('Error processing banner:', error);
		process.exit(1);
	}
}

// Run the script
main(); 