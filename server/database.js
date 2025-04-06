/**
 * Database module for Cookie Consent Manager server
 * In-memory database implementation - would be replaced with a real database in production
 */

// In-memory storage for reviews
let reviews = [];
let patterns = [];

/**
 * Adds a review to the database
 * @param {Object} review - The review data
 * @returns {Object} The stored review with ID
 */
function addReview(review) {
	const newReview = {
		id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
		...review,
		status: 'pending',
		submittedAt: new Date().toISOString(),
		reviewedAt: null,
		approved: false
	};
	
	reviews.push(newReview);
	return newReview;
}

/**
 * Gets all reviews with optional filtering
 * @param {Object} filters - Filter options (status, domain, etc.)
 * @returns {Array} Filtered reviews
 */
function getReviews(filters = {}) {
	let filtered = [...reviews];
	
	if (filters.status) {
		filtered = filtered.filter(r => r.status === filters.status);
	}
	
	if (filters.domain) {
		filtered = filtered.filter(r => r.domain === filters.domain);
	}
	
	if (filters.approved !== undefined) {
		filtered = filtered.filter(r => r.approved === filters.approved);
	}
	
	return filtered;
}

/**
 * Updates a review's status
 * @param {string} id - Review ID
 * @param {Object} updates - The fields to update
 * @returns {Object|null} Updated review or null if not found
 */
function updateReview(id, updates) {
	const index = reviews.findIndex(r => r.id === id);
	if (index === -1) return null;
	
	reviews[index] = {
		...reviews[index],
		...updates,
		reviewedAt: new Date().toISOString()
	};
	
	return reviews[index];
}

/**
 * Adds a pattern to the database
 * @param {Object} pattern - Pattern data
 * @returns {Object} The stored pattern with ID
 */
function addPattern(pattern) {
	const newPattern = {
		id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
		...pattern,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		uses: 0
	};
	
	patterns.push(newPattern);
	return newPattern;
}

/**
 * Gets all patterns with optional filtering
 * @param {Object} filters - Filter options
 * @returns {Array} Filtered patterns
 */
function getPatterns(filters = {}) {
	let filtered = [...patterns];
	
	if (filters.selector) {
		filtered = filtered.filter(p => p.selector === filters.selector);
	}
	
	if (filters.domain) {
		filtered = filtered.filter(p => p.domain === filters.domain);
	}
	
	return filtered;
}

/**
 * Updates a pattern
 * @param {string} id - Pattern ID
 * @param {Object} updates - The fields to update
 * @returns {Object|null} Updated pattern or null if not found
 */
function updatePattern(id, updates) {
	const index = patterns.findIndex(p => p.id === id);
	if (index === -1) return null;
	
	patterns[index] = {
		...patterns[index],
		...updates,
		updatedAt: new Date().toISOString()
	};
	
	return patterns[index];
}

/**
 * Increments the use count for a pattern
 * @param {string} id - Pattern ID
 * @returns {number} New use count
 */
function incrementPatternUse(id) {
	const index = patterns.findIndex(p => p.id === id);
	if (index === -1) return null;
	
	patterns[index].uses += 1;
	return patterns[index].uses;
}

module.exports = {
	addReview,
	getReviews,
	updateReview,
	addPattern,
	getPatterns,
	updatePattern,
	incrementPatternUse
}; 