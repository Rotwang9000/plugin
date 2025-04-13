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
	
	// Make sure modal overlay has the highest z-index
	if (tooltipModalOverlay) {
		tooltipModalOverlay.style.zIndex = '9999';
	}
	
	// Set up click event for all tooltip icons
	tooltipIcons.forEach(icon => {
		const container = icon.closest('.tooltip-container');
		const tooltipText = container.querySelector('.tooltip-text');
		
		// Remove the hover functionality by adding the modal-tooltip class
		container.classList.add('modal-tooltip');
		
		// Add click event to show modal
		icon.addEventListener('click', event => {
			event.stopPropagation(); // Prevent event bubbling
			
			// Get tooltip content
			const label = container.querySelector('.toggle-label');
			const title = label ? label.textContent.trim().split('?')[0].trim() : 'Information';
			const content = tooltipText ? tooltipText.textContent.trim() : '';
			
			// Set modal content
			tooltipModalTitle.textContent = title;
			tooltipModalContent.textContent = content;
			
			// Show modal with flex display
			tooltipModalOverlay.style.display = 'flex';
		});
	});
	
	// Close modal when clicking close button
	if (tooltipModalCloseBtn) {
		tooltipModalCloseBtn.addEventListener('click', () => {
			tooltipModalOverlay.style.display = 'none';
		});
	}
	
	// Close modal when clicking outside of it
	if (tooltipModalOverlay) {
		tooltipModalOverlay.addEventListener('click', event => {
			if (event.target === tooltipModalOverlay) {
				tooltipModalOverlay.style.display = 'none';
			}
		});
	}
	
	// Close modal on escape key
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && tooltipModalOverlay && tooltipModalOverlay.style.display === 'flex') {
			tooltipModalOverlay.style.display = 'none';
		}
	});
}

// Export as ES modules
export {
	initTooltips
}; 