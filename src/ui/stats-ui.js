/**
 * UI utilities for statistics display
 */

import { createElement, clearElement } from '../modules/dom-utils.js';
import { fetchCloudStatistics } from '../api/cloud-api.js';

/**
 * Update dialog count in badge and UI
 */
export function updateDialogCount() {
	chrome.runtime.sendMessage({ action: 'getCapturedDialogCount' }, (response) => {
		// Update the UI if we have an element
		const countElement = document.getElementById('capturedCount');
		if (countElement) {
			countElement.textContent = response.count;
		}
	});
}

/**
 * Clear badge count by sending message to background script
 */
export function clearBadgeCount() {
	chrome.runtime.sendMessage({ action: 'clearCapturedDialogs' }, (response) => {
		if (response && response.success) {
			updateDialogCount();
		}
	});
}

/**
 * Display statistics in the UI
 * @param {Object} stats - Statistics object
 * @param {Element} container - Container element
 */
export function displayStatistics(stats, container) {
	if (!container) return;
	
	// Clear container
	clearElement(container);
	
	// Create stats container
	const statsContainer = createElement('div', { className: 'stats-container' }, null, container);
	
	// Create stats cards
	createStatCard('Dialogs Captured', stats.capturedDialogs || 0, statsContainer);
	createStatCard('Dialogs Auto-Handled', stats.handledDialogs || 0, statsContainer);
	createStatCard('Websites Visited', stats.uniqueDomains || 0, statsContainer);
	createStatCard('Cookies Saved', calculateCookiesSaved(stats.handledDialogs || 0), statsContainer);
	
	// Create footer with note
	createElement('div', { className: 'stats-footer' }, 
		'* Cookie savings estimated based on average cookies per site.', container);
}

/**
 * Create a statistics card
 * @param {string} title - Card title
 * @param {number|string} value - Card value
 * @param {Element} container - Container element
 */
function createStatCard(title, value, container) {
	const card = createElement('div', { className: 'stat-card' }, null, container);
	createElement('div', { className: 'stat-value' }, value.toString(), card);
	createElement('div', { className: 'stat-title' }, title, card);
}

/**
 * Calculate approximate cookies saved
 * @param {number} handledDialogs - Number of handled dialogs
 * @returns {string} Formatted number of cookies saved
 */
function calculateCookiesSaved(handledDialogs) {
	// Average 30 cookies per site
	const avgCookiesPerSite = 30;
	const cookiesSaved = handledDialogs * avgCookiesPerSite;
	
	// Format with commas
	return cookiesSaved.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Display statistics chart
 * @param {Object} stats - Statistics data
 * @param {Element} container - Chart container
 */
export function displayChart(stats, container) {
	if (!container) return;
	
	// Clear container
	clearElement(container);
	
	// Check if we should fetch cloud stats
	const localStats = {
		capturedDialogs: stats.capturedDialogs || 0,
		handledDialogs: stats.handledDialogs || 0,
		uniqueDomains: stats.uniqueDomains || 0
	};
	
	// Create chart title
	createElement('h3', null, 'Your Statistics', container);
	
	// Create simple chart representation
	const chartContainer = createElement('div', { className: 'chart-container' }, null, container);
	
	// Create bars for each stat
	createChartBar('Captured', localStats.capturedDialogs, 100, chartContainer);
	createChartBar('Handled', localStats.handledDialogs, 100, chartContainer);
	createChartBar('Websites', localStats.uniqueDomains, 100, chartContainer);
	
	// Check if we should fetch global stats too
	if (stats.cloudEnabled) {
		// Create loading indicator
		const loadingElement = createElement('div', { className: 'loading-indicator' }, 
			'Loading global statistics...', container);
		
		// Fetch global stats
		fetchCloudStatistics()
			.then(cloudStats => {
				// Remove loading indicator
				clearElement(loadingElement);
				
				// Create global stats section
				createElement('h3', null, 'Global Statistics', container);
				
				const globalContainer = createElement('div', { className: 'global-stats' }, null, container);
				
				createStatCard('Total Dialogs Captured', 
					formatLargeNumber(cloudStats.totalDialogs || 0), globalContainer);
				createStatCard('Total Cookies Blocked', 
					formatLargeNumber(cloudStats.totalCookiesBlocked || 0), globalContainer);
				createStatCard('Websites Protected', 
					formatLargeNumber(cloudStats.totalWebsites || 0), globalContainer);
				createStatCard('Active Users', 
					formatLargeNumber(cloudStats.activeUsers || 0), globalContainer);
			})
			.catch(error => {
				// Remove loading indicator
				clearElement(loadingElement);
				
				// Show error
				createElement('div', { className: 'error-message' }, 
					'Failed to load global statistics.', container);
			});
	}
}

/**
 * Create a bar for chart
 * @param {string} label - Bar label
 * @param {number} value - Bar value
 * @param {number} max - Maximum value for scaling
 * @param {Element} container - Container element
 */
function createChartBar(label, value, max, container) {
	const barContainer = createElement('div', { className: 'chart-bar-container' }, null, container);
	
	// Add label
	createElement('div', { className: 'chart-bar-label' }, label, barContainer);
	
	// Add bar wrapper
	const barWrapper = createElement('div', { className: 'chart-bar-wrapper' }, null, barContainer);
	
	// Calculate percentage (min 2% for visibility)
	const percentage = Math.max(2, (value / max) * 100);
	
	// Add bar
	const bar = createElement('div', { 
		className: 'chart-bar',
		style: `width: ${percentage}%;`
	}, null, barWrapper);
	
	// Add value label
	createElement('div', { className: 'chart-bar-value' }, value.toString(), bar);
}

/**
 * Format large numbers with K, M, etc.
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatLargeNumber(num) {
	if (num >= 1000000) {
		return (num / 1000000).toFixed(1) + 'M';
	} else if (num >= 1000) {
		return (num / 1000).toFixed(1) + 'K';
	} else {
		return num.toString();
	}
}