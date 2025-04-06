/**
 * Server for Cookie Consent Manager browser extension
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const database = require('./database');
const utils = require('./utils');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(morgan('dev')); // HTTP request logger
app.use(bodyParser.json({ limit: '2mb' })); // Parse JSON request bodies with size limit

// Error handling middleware
app.use((err, req, res, next) => {
	console.error('Server error:', err.stack);
	res.status(500).json({
		success: false,
		error: 'Internal server error',
		message: process.env.NODE_ENV === 'development' ? err.message : undefined
	});
});

// Health check endpoint
app.get('/api/health', (req, res) => {
	res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// Serve the admin HTML page
app.get('/admin', (req, res) => {
	res.sendFile(path.join(__dirname, 'admin.html'));
});

/**
 * Reviews API endpoints
 */

// Submit a new review
app.post('/api/reviews', (req, res) => {
	try {
		const reviewData = req.body;
		
		// Validate review data
		const validation = utils.validateReviewData(reviewData);
		if (!validation.valid) {
			return res.status(400).json({ 
				success: false, 
				errors: validation.errors 
			});
		}
		
		// Sanitize the data
		const sanitizedData = {
			...reviewData,
			url: utils.sanitizeUrl(reviewData.url),
			html: utils.sanitizeHtml(reviewData.html)
		};
		
		// Extract domain if not provided
		if (!sanitizedData.domain) {
			sanitizedData.domain = utils.extractDomain(sanitizedData.url);
		}
		
		// Add review to database
		const review = database.addReview(sanitizedData);
		
		// Return success with the created review
		res.status(201).json({ 
			success: true, 
			message: 'Review submitted successfully',
			review 
		});
		
		console.log(`New review submitted for ${review.domain}`);
	} catch (error) {
		console.error('Error submitting review:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Internal server error' 
		});
	}
});

// Get reviews with optional filtering
app.get('/api/reviews', (req, res) => {
	try {
		// Extract filter parameters from query string
		const filters = {
			status: req.query.status,
			domain: req.query.domain,
			approved: req.query.approved === 'true' ? true : 
				(req.query.approved === 'false' ? false : undefined)
		};
		
		// Get filtered reviews
		const reviews = database.getReviews(filters);
		
		res.status(200).json({ 
			success: true, 
			count: reviews.length,
			reviews 
		});
	} catch (error) {
		console.error('Error getting reviews:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Internal server error' 
		});
	}
});

// Update a review's status
app.patch('/api/reviews/:id', (req, res) => {
	try {
		const { id } = req.params;
		const updates = req.body;
		
		// Update the review
		const updatedReview = database.updateReview(id, updates);
		
		if (!updatedReview) {
			return res.status(404).json({ 
				success: false, 
				error: 'Review not found' 
			});
		}
		
		// If the review was approved, add it to patterns
		if (updates.approved === true) {
			const pattern = {
				selector: updatedReview.selector,
				domain: updatedReview.domain,
				buttonType: updatedReview.buttonType,
				rating: updatedReview.rating || 4.0,
				necessary: updatedReview.buttonType === 'necessary',
				signature: {
					classPatterns: updatedReview.selector.replace(/^\./, '').split('-'),
					structure: `div > ${updatedReview.selector}`
				}
			};
			
			database.addPattern(pattern);
			console.log(`New pattern added for ${pattern.domain}: ${pattern.selector}`);
		}
		
		res.status(200).json({ 
			success: true, 
			message: 'Review updated successfully',
			review: updatedReview
		});
	} catch (error) {
		console.error('Error updating review:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Internal server error' 
		});
	}
});

/**
 * Patterns API endpoints
 */

// Get patterns with optional filtering
app.get('/api/patterns', (req, res) => {
	try {
		// Extract filter parameters from query string
		const filters = {
			selector: req.query.selector,
			domain: req.query.domain
		};
		
		// Get filtered patterns
		const patterns = database.getPatterns(filters);
		
		res.status(200).json({ 
			success: true, 
			count: patterns.length,
			patterns 
		});
	} catch (error) {
		console.error('Error getting patterns:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Internal server error' 
		});
	}
});

// Update pattern usage count
app.post('/api/patterns/:id/use', (req, res) => {
	try {
		const { id } = req.params;
		
		// Increment usage count
		const uses = database.incrementPatternUse(id);
		
		if (uses === null) {
			return res.status(404).json({ 
				success: false, 
				error: 'Pattern not found' 
			});
		}
		
		res.status(200).json({ 
			success: true, 
			uses 
		});
	} catch (error) {
		console.error('Error updating pattern use:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Internal server error' 
		});
	}
});

// Start the server
app.listen(PORT, () => {
	console.log(`Cookie Consent Manager server running on port ${PORT}`);
	console.log(`Admin panel available at http://localhost:${PORT}/admin`);
}); 