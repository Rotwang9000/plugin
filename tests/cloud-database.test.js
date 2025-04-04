/**
 * @jest-environment jsdom
 */

// Define the cloud database structure (copied from content.js)
const cloudDatabase = {
	// Common selectors that work across many sites
	common: [
		// General cookie consent patterns
		{ 
			selector: '.cookie-accept-all', 
			type: 'button', 
			patternId: 'cookie-accept', 
			rating: 4.9,
			signature: {
				classPatterns: ['cookie-', 'accept'],
				structure: 'div > .cookie-accept-all'
			}
		},
		{ 
			selector: '.cookie-accept-necessary', 
			type: 'button', 
			patternId: 'cookie-necessary', 
			rating: 4.7,
			necessary: true // Marks this as a "necessary cookies only" option
		},
		{ 
			selector: '.fc-cta-consent', 
			type: 'button', 
			patternId: 'consent', 
			rating: 4.9,
			signature: {
				classPatterns: ['fc-', 'consent'],
				structure: 'div > div > button.fc-cta-consent'
			}
		},
		// Other common cookie consent selectors
		{ selector: '#onetrust-accept-btn-handler', type: 'button', rating: 4.7 },
		{ selector: '.cc-accept-all', type: 'button', rating: 4.5 },
		{ selector: '.js-accept-cookies', type: 'button', rating: 4.3 },
		{ selector: '#accept-cookies', type: 'button', rating: 4.6 },
		{ selector: '.consent-banner__button--primary', type: 'button', rating: 4.4 },
		{ selector: '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', type: 'button', rating: 4.8 },
		// Common necessary-only options
		{ selector: '#onetrust-reject-all-handler', type: 'button', rating: 4.6, necessary: true },
		{ selector: '.cc-accept-necessary', type: 'button', rating: 4.4, necessary: true },
		{ selector: '.js-accept-essential', type: 'button', rating: 4.2, necessary: true },
		{ selector: '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll', type: 'button', rating: 4.7, necessary: true }
	]
};

describe('Cloud Database Structure', () => {
	test('cloud database does not contain site-specific selectors property', () => {
		// The database should not have a 'sites' property at all
		expect(cloudDatabase).not.toHaveProperty('sites');
	});
	
	test('common selectors do not contain site-specific fields', () => {
		// None of the common selectors should have domain, site, or website fields
		const hasSpecificSiteFields = cloudDatabase.common.some(selector => 
			selector.domain || selector.site || selector.website
		);
		
		expect(hasSpecificSiteFields).toBe(false);
	});
	
	test('common selectors have appropriate types', () => {
		// All selectors should have a type field
		const allHaveType = cloudDatabase.common.every(selector => selector.type);
		expect(allHaveType).toBe(true);
		
		// Button types should predominate
		const buttonTypeCount = cloudDatabase.common.filter(selector => selector.type === 'button').length;
		expect(buttonTypeCount).toBe(cloudDatabase.common.length);
	});
	
	test('necessary cookies options are properly marked', () => {
		// Check that necessary options are marked with the necessary field
		const necessarySelectors = cloudDatabase.common.filter(selector => selector.necessary === true);
		expect(necessarySelectors.length).toBeGreaterThan(0);
		
		// Check that all necessary selectors have appropriate names
		const allHaveAppropriateNames = necessarySelectors.every(selector => {
			const name = selector.selector.toLowerCase();
			return name.includes('necessary') || 
				name.includes('essential') || 
				name.includes('reject') || 
				name.includes('decline');
		});
		
		expect(allHaveAppropriateNames).toBe(true);
	});
	
	test('selectors have appropriate fields and ratings', () => {
		// All selectors should have a rating field
		const allHaveRating = cloudDatabase.common.every(selector => 
			typeof selector.rating === 'number' && selector.rating > 0
		);
		expect(allHaveRating).toBe(true);
		
		// Ratings should be between 0 and 5
		const validRatingRange = cloudDatabase.common.every(selector => 
			selector.rating >= 0 && selector.rating <= 5
		);
		expect(validRatingRange).toBe(true);
		
		// All selectors should be properly formatted (either as CSS selectors or pattern IDs)
		const allHaveProperSelectors = cloudDatabase.common.every(selector => 
			selector.selector.startsWith('.') || 
			selector.selector.startsWith('#') ||
			selector.selector.includes('[')
		);
		expect(allHaveProperSelectors).toBe(true);
	});
	
	test('pattern signatures are properly structured', () => {
		// Only some selectors will have signatures
		const selectorsWithSignatures = cloudDatabase.common.filter(selector => selector.signature);
		expect(selectorsWithSignatures.length).toBeGreaterThan(0);
		
		// All signatures should have classPatterns array
		const allHaveClassPatterns = selectorsWithSignatures.every(selector => 
			Array.isArray(selector.signature.classPatterns) && 
			selector.signature.classPatterns.length > 0
		);
		expect(allHaveClassPatterns).toBe(true);
		
		// Check if any classPatterns include site-specific names
		const siteSpecificPatterns = selectorsWithSignatures.some(selector => 
			selector.signature.classPatterns.some(pattern => 
				pattern.includes('bbc') || 
				pattern.includes('amazon') || 
				pattern.includes('-site-') ||
				pattern.includes('domain-')
			)
		);
		expect(siteSpecificPatterns).toBe(false);
	});
	
	test('cloud database is comprehensive enough', () => {
		// The database should have a decent number of selectors
		expect(cloudDatabase.common.length).toBeGreaterThanOrEqual(10);
		
		// There should be a mix of ID and class selectors
		const idSelectors = cloudDatabase.common.filter(selector => 
			selector.selector.startsWith('#')
		);
		const classSelectors = cloudDatabase.common.filter(selector => 
			selector.selector.startsWith('.')
		);
		
		expect(idSelectors.length).toBeGreaterThan(0);
		expect(classSelectors.length).toBeGreaterThan(0);
	});
}); 