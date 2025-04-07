/**
 * Tooltip UI Module - Handles modal tooltips functionality
 */

/**
 * Initialize the tooltip system
 * Replaces hover tooltips with click-to-show modal tooltips
 */
function initTooltips() {
	const tooltipIcons = document.querySelectorAll('.tooltip-icon');
	const tooltipModalOverlay = document.getElementById('tooltipModalOverlay');
	const tooltipModalTitle = document.getElementById('tooltipModalTitle');
	const tooltipModalContent = document.getElementById('tooltipModalContent');
	const tooltipModalCloseBtn = document.getElementById('tooltipModalCloseBtn');
	
	// Set up click event for all tooltip icons
	tooltipIcons.forEach(icon => {
		const container = icon.closest('.tooltip-container');
		const tooltipText = container.querySelector('.tooltip-text');
		
		// Remove the hover functionality
		container.classList.add('modal-tooltip');
		
		// Add click event to show modal
		icon.addEventListener('click', event => {
			event.stopPropagation(); // Prevent event bubbling
			
			// Get tooltip content
			const title = container.querySelector('.toggle-label').textContent.trim().split('?')[0].trim();
			const content = tooltipText.textContent.trim();
			
			// Set modal content
			tooltipModalTitle.textContent = title;
			tooltipModalContent.textContent = content;
			
			// Show modal
			tooltipModalOverlay.style.display = 'flex';
		});
	});
	
	// Close modal when clicking close button
	tooltipModalCloseBtn.addEventListener('click', () => {
		tooltipModalOverlay.style.display = 'none';
	});
	
	// Close modal when clicking outside of it
	tooltipModalOverlay.addEventListener('click', event => {
		if (event.target === tooltipModalOverlay) {
			tooltipModalOverlay.style.display = 'none';
		}
	});
	
	// Close modal on escape key
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && tooltipModalOverlay.style.display === 'flex') {
			tooltipModalOverlay.style.display = 'none';
		}
	});
}

// Export as ES modules
export {
	initTooltips
}; 