/**
 * Simple test suite for the Cookie Consent Manager server
 * 
 * To run: node tests.js
 */

const assert = require('assert');
const database = require('./database');
const utils = require('./utils');

// Test database functions
function testDatabase() {
	console.log('Testing database module...');
	
	// Test adding a review
	const testReview = {
		url: 'https://example.com',
		domain: 'example.com',
		selector: '.cookie-accept-all',
		html: '<div class="cookie-dialog">Test content</div>',
		buttonType: 'accept',
		buttonText: 'Accept All'
	};
	
	const addedReview = database.addReview(testReview);
	assert(addedReview.id, 'Review should have an ID');
	assert(addedReview.status === 'pending', 'Review status should be pending');
	
	// Test getting reviews
	const reviews = database.getReviews();
	assert(reviews.length > 0, 'Should retrieve reviews');
	
	// Test updating a review
	const updatedReview = database.updateReview(addedReview.id, { status: 'approved', approved: true });
	assert(updatedReview.status === 'approved', 'Review status should be updated');
	assert(updatedReview.approved === true, 'Review approved should be updated');
	
	// Test filtering reviews
	const approvedReviews = database.getReviews({ status: 'approved' });
	assert(approvedReviews.length > 0, 'Should retrieve approved reviews');
	assert(approvedReviews[0].approved === true, 'Approved reviews should have approved=true');
	
	// Test adding a pattern
	const testPattern = {
		selector: '.test-selector',
		domain: 'example.com',
		buttonType: 'accept',
		rating: 4.5,
		necessary: false,
		signature: {
			classPatterns: ['test', 'selector'],
			structure: 'div > .test-selector'
		}
	};
	
	const addedPattern = database.addPattern(testPattern);
	assert(addedPattern.id, 'Pattern should have an ID');
	
	// Test getting patterns
	const patterns = database.getPatterns();
	assert(patterns.length > 0, 'Should retrieve patterns');
	
	// Test incrementing pattern use
	const uses = database.incrementPatternUse(addedPattern.id);
	assert(uses === 1, 'Pattern uses should be incremented');
	
	console.log('Database tests passed!');
}

// Test utility functions
function testUtils() {
	console.log('Testing utility module...');
	
	// Test HTML sanitization
	const testHtml = `
		<div id="cookie-banner" data-user-id="12345" aria-label="Cookie Notice">
			<script>alert("test");</script>
			<p>We use cookies! Contact us at test@example.com or call +1-234-567-8900</p>
			<a href="https://example.com?user=123&token=abc">Privacy Policy</a>
			<button value="accept" data-tracking="click-accept">Accept All</button>
		</div>
	`;
	
	const sanitized = utils.sanitizeHtml(testHtml);
	
	// Scripts should be removed
	assert(!sanitized.includes('<script>'), 'Scripts should be removed');
	
	// Sensitive attributes should be removed
	assert(!sanitized.includes('id="cookie-banner"'), 'ID attribute should be removed');
	assert(!sanitized.includes('data-user-id'), 'Data attributes should be removed');
	
	// Email and phone should be redacted
	assert(!sanitized.includes('test@example.com'), 'Email should be redacted');
	assert(sanitized.includes('[EMAIL]'), 'Email should be replaced with [EMAIL]');
	assert(!sanitized.includes('+1-234-567-8900'), 'Phone should be redacted');
	
	// URL query parameters should be removed
	assert(!sanitized.includes('?user=123'), 'URL query parameters should be removed');
	
	// Test URL sanitization
	const testUrl = 'https://example.com/page?user=123&token=abc#section';
	const sanitizedUrl = utils.sanitizeUrl(testUrl);
	assert(sanitizedUrl === 'https://example.com/page', 'URL should be sanitized');
	
	// Test domain extraction
	const domain = utils.extractDomain(testUrl);
	assert(domain === 'example.com', 'Domain should be extracted correctly');
	
	// Test review data validation
	const validReview = {
		url: 'https://example.com',
		domain: 'example.com',
		selector: '.cookie-accept-all',
		html: '<div>Test</div>',
		buttonType: 'accept'
	};
	
	const validationResult = utils.validateReviewData(validReview);
	assert(validationResult.valid === true, 'Valid review should pass validation');
	
	// Test invalid review
	const invalidReview = {
		url: 'https://example.com'
		// Missing required fields
	};
	
	const invalidValidationResult = utils.validateReviewData(invalidReview);
	assert(invalidValidationResult.valid === false, 'Invalid review should fail validation');
	assert(invalidValidationResult.errors.length > 0, 'Validation should return errors');
	
	console.log('Utility tests passed!');
}

// Run tests
function runTests() {
	try {
		testDatabase();
		testUtils();
		console.log('\nAll tests passed successfully!');
	} catch (error) {
		console.error('\nTest failed:', error);
		process.exit(1);
	}
}

runTests(); 