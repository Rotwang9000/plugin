/**
 * Finds the "necessary cookies only" button in a container
 * @param {Element} container - The container to search in
 * @returns {Element|null} The button element or null if not found
 */
function findNecessaryCookiesButton(container) {
	// Terms that indicate necessary/essential cookies only options
	const necessaryTerms = [
		'necessary', 'essential', 'required', 'basic', 
		'functional', 'reject all', 'reject', 'decline', 'refuse',
		'only necessary', 'only essential'
	];
	
	// First check for OneTrust specific patterns (very common)
	// This ensures the ETH Zurich pattern and similar ones are correctly detected
	const onetrustRejectBtn = container.querySelector('#onetrust-reject-all-handler');
	if (onetrustRejectBtn) {
		return onetrustRejectBtn;
	}
	
	// Improved ID-based detection with priority order - look for reject/essential patterns in IDs
	const idSpecificElements = container.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
	for (const element of idSpecificElements) {
		const id = element.id?.toLowerCase() || '';
		
		// First check for most explicit reject/essential ID patterns - highest priority
		if (id.includes('reject-all') || id.includes('reject-cookie') || 
		    id.includes('decline-all') || id.includes('refuse-all') ||
		    id.includes('essential-only') || id.includes('necessary-only') ||
		    id.includes('onetrust-reject') || id.includes('reject-cookies')) {
			return element;
		}
	}
	
	// First try buttons with explicit "reject cookies" text
	const buttons = container.querySelectorAll('button');
	for (const button of buttons) {
		const text = button.textContent?.toLowerCase().trim() || '';
		
		// Direct match for reject cookies patterns
		if (text.includes('reject all cookie') || 
		    text.includes('reject cookie') || 
		    text.includes('decline cookie') || 
		    text.includes('refuse cookie')) {
			return button;
		}
		
		// Check for button text that contains both a reject term and "cookie"
		if (text.includes('cookie') && 
		   (text.includes('reject') || text.includes('decline') || text.includes('refuse'))) {
			return button;
		}
	}
	
	// Then try buttons with explicit necessary-related text
	const clickables = container.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
	
	// First prioritize "reject all" or "decline all" buttons which are clearest
	for (const element of clickables) {
		const text = element.textContent?.toLowerCase().trim() || '';
		
		// More comprehensive text matching for "Reject all Cookies"
		if (text.includes('reject') || text.includes('decline') || text.includes('refuse')) {
			// Prioritize those with "all" or "cookie" in text
			if (text.includes('all') || text.includes('cookie')) {
				return element;
			}
		}
		
		// Explicitly check for common patterns
		if (text.includes('reject all') || text.includes('decline all') || text.includes('refuse all') ||
		    text.includes('reject cookie') || text.includes('decline cookie') || text.includes('refuse cookie')) {
			return element;
		}
		
		// Check ID for reject-related terms - with high priority
		const id = element.id?.toLowerCase() || '';
		if (id.includes('reject') || id.includes('refuse') || id.includes('decline')) {
			return element;
		}
	}
	
	// Then check for other necessary/reject buttons
	for (const element of clickables) {
		const text = element.textContent?.toLowerCase().trim() || '';
		
		// Skip if the link is informational
		if (element.tagName === 'A') {
			const href = element.getAttribute('href') || '';
			if (href && href !== '#' && !href.startsWith('javascript:') && 
				(text.includes('learn more') || text.includes('more about') || 
				text.includes('privacy policy') || text.includes('cookie policy'))) {
				continue;
			}
		}
		
		// Check if the text contains any necessary terms
		if (necessaryTerms.some(term => text.includes(term))) {
			// Make sure it's not a settings button
			if (text.includes('settings') || text.includes('preferences') || 
				text.includes('customize') || text.includes('customise') || 
				text.includes('manage')) {
				continue;
			}
			return element;
		}
		
		// Check the element class and ID
		const className = element.className?.toLowerCase() || '';
		const id = element.id?.toLowerCase() || '';
		
		if (className.includes('reject') || className.includes('decline') || 
			className.includes('refuse') || className.includes('necessary') || 
			className.includes('essential') || className.includes('secondary') ||
			id.includes('necessary') || id.includes('essential')) {
			
			return element;
		}
	}
	
	// Look for checkboxes that might control non-essential cookies and ensure they're unchecked
	const checkboxes = container.querySelectorAll('input[type="checkbox"]');
	let checkedNonEssential = false;
	
	for (const checkbox of checkboxes) {
		const label = findLabelForInput(checkbox);
		if (label) {
			const labelText = label.textContent.toLowerCase();
			// If it's not a necessary/essential checkbox and it's checked, uncheck it
			if (!necessaryTerms.some(term => labelText.includes(term)) && 
				(labelText.includes('analytics') || 
				 labelText.includes('marketing') || 
				 labelText.includes('advertising') || 
				 labelText.includes('social') || 
				 labelText.includes('tracking'))) {
				
				if (checkbox.checked) {
					checkbox.checked = false;
					checkedNonEssential = true;
				}
			}
		}
	}
	
	// If we've modified checkboxes, look for a save/apply button
	if (checkedNonEssential) {
		const saveButtons = Array.from(clickables).filter(el => {
			const text = el.textContent.toLowerCase().trim();
			return text.includes('save') || text.includes('apply') || text.includes('confirm');
		});
		
		if (saveButtons.length > 0) {
			return saveButtons[0];
		}
	}
	
	return null;
}

/**
 * Helper function to find a label for an input element
 * @param {Element} input - The input element
 * @returns {Element|null} The associated label element or null
 */
function findLabelForInput(input) {
	// Check for explicit label
	if (input.id) {
		const label = document.querySelector(`label[for="${input.id}"]`);
		if (label) return label;
	}
	
	// Check for parent label
	const parent = input.parentElement;
	if (parent && parent.tagName === 'LABEL') {
		return parent;
	}
	
	// No label found
	return null;
}

/**
 * Finds the accept button in a container
 * @param {Element} container - The container element to search in
 * @returns {Element|null} The accept button element or null if not found
 */
function findAcceptButton(container) {
	// Common button texts for accepting cookies
	const acceptTexts = ['accept', 'agree', 'ok', 'yes', 'got it', 'allow', 'understand', 'consent'];
	
	// First check for OneTrust specific patterns (very common)
	// This ensures the ETH Zurich pattern and similar ones are correctly detected
	const onetrustAcceptBtn = container.querySelector('#onetrust-accept-btn-handler');
	if (onetrustAcceptBtn) {
		return onetrustAcceptBtn;
	}
	
	// Improved ID-based detection with clear priority - MAKE SURE we don't catch essential/necessary buttons
	const acceptIdElements = container.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
	for (const element of acceptIdElements) {
		const id = element.id?.toLowerCase() || '';
		const buttonText = element.textContent?.toLowerCase().trim() || '';
		
		// Skip if it's an essential/necessary/reject button - ensure correct detection order
		if (id.includes('essential') || id.includes('necessary') || 
		    id.includes('reject') || id.includes('decline') || id.includes('refuse')) {
			continue;
		}
		
		// Check for explicit accept/agree IDs - high priority pattern
		if (id.includes('accept-all') || id.includes('accept-cookie') || 
		    id.includes('allow-all') || id.includes('agree-all') ||
		    id.includes('onetrust-accept') || id.includes('accept-btn') ||
		    id.includes('agree-btn')) {
			// Skip if it's a settings, preferences or "more info" button
			if (buttonText.includes('settings') || buttonText.includes('preferences') || 
				buttonText.includes('customize') || buttonText.includes('customise') || 
				buttonText.includes('manage') || buttonText.includes('options') || buttonText.includes('more about')) {
				continue;
			}
			return element;
		}
	}
	
	// First try buttons with explicit text about accepting cookies
	const buttons = container.querySelectorAll('button');
	for (const button of buttons) {
		const text = button.textContent?.toLowerCase().trim() || '';
		
		// Direct match for the most common accept cookie patterns
		if (text.includes('accept all cookie') || 
		    text.includes('accept cookie') || 
		    text.includes('allow cookie') || 
		    text.includes('agree to cookie')) {
			return button;
		}
		
		// Check for button text that contains both an accept term and "cookie"
		if (text.includes('cookie') && acceptTexts.some(term => text.includes(term))) {
			// Skip if it's settings or preferences
			if (text.includes('settings') || text.includes('preferences') || 
				text.includes('customize') || text.includes('customise') || 
				text.includes('manage') || text.includes('options') || text.includes('more about')) {
				continue;
			}
			return button;
		}
	}
	
	// Then try the simplest and most reliable approach - direct button ID matching
	// Many implementations use clear IDs for their buttons
	const directIdMatches = container.querySelectorAll('button[id*="accept"], button[id*="agree"], button[id*="allow"]');
	for (const button of directIdMatches) {
		// Skip if it's a settings, preferences or "more info" button
		const buttonText = button.textContent?.toLowerCase().trim() || '';
		
		// Skip if it's actually a reject/necessary button - ensure correct detection order
		const buttonId = button.id?.toLowerCase() || '';
		if (buttonId.includes('essential') || buttonId.includes('necessary') || 
		    buttonId.includes('reject') || buttonId.includes('decline') || buttonId.includes('refuse')) {
			continue;
		}
		
		if (buttonText.includes('settings') || buttonText.includes('preferences') || 
			buttonText.includes('customize') || buttonText.includes('customise') || 
			buttonText.includes('manage') || buttonText.includes('options') || buttonText.includes('more about')) {
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
	
	// Now try other buttons with clear accept text
	for (const button of buttons) {
		const text = button.textContent?.toLowerCase().trim() || '';
		
		// More comprehensive text matching for variations like "Accept all" 
		if (acceptTexts.some(term => text.includes(term))) {
			// Skip if it's settings or preferences
			if (text.includes('settings') || text.includes('preferences') || 
				text.includes('customize') || text.includes('customise') || 
				text.includes('manage') || text.includes('options') || text.includes('more about')) {
				continue;
			}
			
			// Higher priority for buttons with "all" 
			if (text.includes('all')) {
				return button;
			}
		}
		
		// Also check for accept all patterns
		if (text.includes('accept all') || text.includes('allow all')) {
			return button;
		}
	}
	
	// Check other HTML elements with explicit accept IDs or attributes
	const genericElements = container.querySelectorAll('*');
	for (const element of genericElements) {
		// Check ID for accept-related terms (only for non-links or links with button role)
		const id = element.id?.toLowerCase() || '';
		if (id.includes('accept') || id.includes('agree') || id.includes('allow')) {
			// Verify it's not just in "more about" link by checking tag and content
			if (element.tagName !== 'A' || 
			   (element.getAttribute('role') === 'button' && 
				!element.textContent.toLowerCase().includes('more about'))) {
				return element;
			}
		}
		
		// Check aria-label for accept
		const ariaLabel = element.getAttribute('aria-label');
		if (ariaLabel && acceptTexts.some(text => ariaLabel.toLowerCase().includes(text))) {
			// Skip links with informational content
			if (element.tagName === 'A' && element.textContent.toLowerCase().includes('more about')) {
				continue;
			}
			return element;
		}
		
		// Check other attributes
		const dataAction = element.getAttribute('data-action');
		if (dataAction && acceptTexts.some(text => dataAction.toLowerCase().includes(text))) {
			return element;
		}
	}
	
	// Then try all clickable elements with explicit accept-related text
	const clickables = container.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]');
	
	for (const element of clickables) {
		const text = element.textContent?.toLowerCase().trim() || '';
		
		// Check if the button text includes one of the accept texts
		if (acceptTexts.some(acceptText => text.includes(acceptText))) {
			// Skip if it contains "settings", "preferences", "customize" or "more about"
			if (text.includes('settings') || text.includes('preferences') || 
				text.includes('customize') || text.includes('customise') || 
				text.includes('manage') || text.includes('options') || text.includes('more about')) {
				continue;
			}
			return element;
		}
	}
	
	// Look for anchors with role="button" and appropriate text (but not informational links)
	const buttonAnchors = container.querySelectorAll('a[role="button"]');
	for (const anchor of buttonAnchors) {
		const text = anchor.textContent?.toLowerCase().trim() || '';
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
				text.includes('manage') || text.includes('options')) {
				continue;
			}
			return anchor;
		}
	}
	
	// If no explicit accept button found, look for primary buttons (usually styled as blue/green)
	for (const element of clickables) {
		const classes = element.className?.toLowerCase() || '';
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
	
	// Check for Twitter-style React Native components with css- and r- classes
	const possibleTwitterButtons = container.querySelectorAll('[role="button"], button');
	for (const button of possibleTwitterButtons) {
		// Check if this is a Twitter-style component with css- and r- classes
		if (button.className && typeof button.className === 'string') {
			const classes = button.className.split(' ');
			const hasTwitterClasses = classes.some(cls => cls.startsWith('css-') || cls.startsWith('r-'));
			
			if (hasTwitterClasses) {
				// Look for dark-themed buttons (common for accept buttons) 
				// Twitter often uses rgba(0, 0, 0, 0.75) or similar for accept buttons
				const style = window.getComputedStyle(button);
				const backgroundColor = style.backgroundColor || '';
				const color = style.color || '';
				
				// Check for dark background (likely primary action)
				if (backgroundColor.includes('rgba(0, 0, 0') || 
					backgroundColor.includes('rgb(0, 0, 0') ||
					backgroundColor.includes('#000') ||
					color === 'white' || color === '#fff' || color === '#ffffff') {
					
					// If this is a dark-themed button, it's likely the accept button
					return button;
				}
				
				// Check for any button position at right/end of dialog (common for accept)
				const parentStyle = window.getComputedStyle(button.parentElement);
				if (parentStyle.display.includes('flex') && 
					(parentStyle.justifyContent.includes('end') || 
					 parentStyle.justifyContent.includes('right'))) {
					return button;
				}
			}
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

export { 
	findNecessaryCookiesButton, 
	findLabelForInput, 
	findAcceptButton 
}; 