/**
 * Utility functions for HTML manipulation and formatting
 */

/**
 * Format HTML with line numbers for display
 * @param {string} html - The HTML to format
 * @returns {string} - HTML table with line numbers
 */
export function formatHtmlWithLineNumbers(html) {
	const lines = html.split('\n');
	let table = '<table>';
	
	lines.forEach((line, index) => {
		table += `
			<tr class="code-line">
				<td class="line-numbers">${index + 1}</td>
				<td>${line}</td>
			</tr>
		`;
	});
	
	table += '</table>';
	return table;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} unsafe - The unsafe HTML string
 * @returns {string} - Escaped HTML string
 */
export function escapeHtml(unsafe) {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Safely get the HTML content of an element, handling null cases
 * @param {Element} element - The DOM element to get HTML from
 * @returns {string} - The HTML content, or empty string if element is null
 */
export function safeGetHtmlContent(element) {
	return (element && typeof element.innerHTML === 'string') ? element.innerHTML.toLowerCase() : '';
}

/**
 * Create a properly formatted HTML document for viewing
 * @param {string} html - The HTML content to display
 * @param {string} domain - The domain associated with the HTML
 * @returns {string} - Complete HTML document with styling
 */
export function createViewableHtmlDocument(html, domain) {
	return `
		<!DOCTYPE html>
		<html>
			<head>
				<title>Cookie Dialog Source</title>
				<meta charset="utf-8">
				<style>
					body { 
						font-family: monospace; 
						white-space: pre-wrap; 
						padding: 20px;
						line-height: 1.5;
						font-size: 14px;
					}
					.line-numbers {
						color: #888;
						text-align: right;
						padding-right: 10px;
						user-select: none;
					}
					table {
						border-collapse: collapse;
						width: 100%;
					}
					td {
						vertical-align: top;
					}
					.code-line:hover {
						background-color: #f0f0f0;
					}
				</style>
			</head>
			<body>
				<h2>Source Code for: ${domain}</h2>
				${formatHtmlWithLineNumbers(escapeHtml(html))}
			</body>
		</html>
	`;
} 