/**
 * @jest-environment node
 */

// Import Jest globals
import { jest, describe, beforeEach, test, expect } from '@jest/globals';

// Import the functions from the database module
import { 
	saveWebsiteData, 
	getWebsiteData, 
	isKnownWebsite,
	updateStatistics,
	getStatistics
} from '../src/modules/database.js';

// Mock dependencies
jest.mock('../src/modules/utils.js', () => ({
	log: jest.fn(),
	objectToJson: jest.fn(obj => JSON.stringify(obj)),
	jsonToObject: jest.fn(json => JSON.parse(json))
}));

// Mock Chrome API
global.chrome = {
	storage: {
		local: {
			get: jest.fn(),
			set: jest.fn()
		}
	}
};

describe('Database Module', () => {
	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();
		
		// Default mock implementation for chrome.storage.local.get
		chrome.storage.local.get.mockImplementation((keys, callback) => {
			if (keys === 'websiteData') {
				callback({
					websiteData: {
						'example.com': {
							cookieType: 'gdpr',
							acceptSelector: '#accept',
							rejectSelector: '#reject',
							lastUpdated: Date.now()
						},
						'test.com': {
							cookieType: 'generic',
							acceptSelector: '.accept-btn',
							lastUpdated: Date.now() - 86400000 // 1 day ago
						}
					}
				});
			} else if (keys === 'statistics') {
				callback({
					statistics: {
						totalHandled: 100,
						acceptedCount: 80,
						rejectedCount: 20,
						sitesVisited: ['example.com', 'test.com']
					}
				});
			} else {
				callback({});
			}
		});
		
		// Default mock implementation for chrome.storage.local.set
		chrome.storage.local.set.mockImplementation((data, callback) => {
			if (callback) callback();
		});
	});
	
	describe('getWebsiteData', () => {
		test('retrieves website data for a specific domain', (done) => {
			getWebsiteData('example.com', (data) => {
				expect(chrome.storage.local.get).toHaveBeenCalledWith('websiteData', expect.any(Function));
				expect(data).toHaveProperty('cookieType', 'gdpr');
				expect(data).toHaveProperty('acceptSelector', '#accept');
				expect(data).toHaveProperty('rejectSelector', '#reject');
				done();
			});
		});
		
		test('returns null for unknown websites', (done) => {
			getWebsiteData('unknown.com', (data) => {
				expect(chrome.storage.local.get).toHaveBeenCalledWith('websiteData', expect.any(Function));
				expect(data).toBeNull();
				done();
			});
		});
		
		test('handles empty database gracefully', (done) => {
			// Mock empty database
			chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
				callback({});
			});
			
			getWebsiteData('example.com', (data) => {
				expect(chrome.storage.local.get).toHaveBeenCalledWith('websiteData', expect.any(Function));
				expect(data).toBeNull();
				done();
			});
		});
	});
	
	describe('saveWebsiteData', () => {
		test('saves new website data to the database', (done) => {
			const newData = {
				cookieType: 'ccpa',
				acceptSelector: '#acceptCookies',
				rejectSelector: '#rejectCookies'
			};
			
			saveWebsiteData('newsite.com', newData, () => {
				expect(chrome.storage.local.get).toHaveBeenCalledWith('websiteData', expect.any(Function));
				expect(chrome.storage.local.set).toHaveBeenCalled();
				
				// Check that the data was combined correctly
				const setCall = chrome.storage.local.set.mock.calls[0][0];
				expect(setCall.websiteData['newsite.com']).toMatchObject(newData);
				expect(setCall.websiteData['example.com']).toBeDefined();
				expect(setCall.websiteData['test.com']).toBeDefined();
				
				done();
			});
		});
		
		test('updates existing website data', (done) => {
			const updatedData = {
				cookieType: 'gdpr',
				acceptSelector: '#newAccept',
				rejectSelector: '#newReject'
			};
			
			saveWebsiteData('example.com', updatedData, () => {
				expect(chrome.storage.local.get).toHaveBeenCalledWith('websiteData', expect.any(Function));
				expect(chrome.storage.local.set).toHaveBeenCalled();
				
				// Check that the data was updated correctly
				const setCall = chrome.storage.local.set.mock.calls[0][0];
				expect(setCall.websiteData['example.com']).toMatchObject(updatedData);
				
				done();
			});
		});
		
		test('includes timestamp in saved data', (done) => {
			const newData = {
				cookieType: 'generic',
				acceptSelector: '.accept-button'
			};
			
			saveWebsiteData('newsite.com', newData, () => {
				const setCall = chrome.storage.local.set.mock.calls[0][0];
				expect(setCall.websiteData['newsite.com']).toHaveProperty('lastUpdated');
				expect(typeof setCall.websiteData['newsite.com'].lastUpdated).toBe('number');
				
				done();
			});
		});
		
		test('handles empty database when saving new data', (done) => {
			// Mock empty database
			chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
				callback({});
			});
			
			const newData = {
				cookieType: 'generic',
				acceptSelector: '.accept-button'
			};
			
			saveWebsiteData('newsite.com', newData, () => {
				expect(chrome.storage.local.set).toHaveBeenCalled();
				
				// Check that a new database was created with the data
				const setCall = chrome.storage.local.set.mock.calls[0][0];
				expect(setCall.websiteData).toEqual({
					'newsite.com': expect.objectContaining(newData)
				});
				
				done();
			});
		});
	});
	
	describe('isKnownWebsite', () => {
		test('returns true for known websites', (done) => {
			isKnownWebsite('example.com', (result) => {
				expect(result).toBe(true);
				done();
			});
		});
		
		test('returns false for unknown websites', (done) => {
			isKnownWebsite('unknown.com', (result) => {
				expect(result).toBe(false);
				done();
			});
		});
		
		test('handles empty database gracefully', (done) => {
			// Mock empty database
			chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
				callback({});
			});
			
			isKnownWebsite('example.com', (result) => {
				expect(result).toBe(false);
				done();
			});
		});
	});
	
	describe('getStatistics', () => {
		test('retrieves statistics data', (done) => {
			getStatistics((stats) => {
				expect(chrome.storage.local.get).toHaveBeenCalledWith('statistics', expect.any(Function));
				expect(stats).toHaveProperty('totalHandled', 100);
				expect(stats).toHaveProperty('acceptedCount', 80);
				expect(stats).toHaveProperty('rejectedCount', 20);
				expect(stats).toHaveProperty('sitesVisited');
				expect(stats.sitesVisited).toContain('example.com');
				done();
			});
		});
		
		test('returns default statistics when none exist', (done) => {
			// Mock empty statistics
			chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
				callback({});
			});
			
			getStatistics((stats) => {
				expect(stats).toHaveProperty('totalHandled', 0);
				expect(stats).toHaveProperty('acceptedCount', 0);
				expect(stats).toHaveProperty('rejectedCount', 0);
				expect(stats).toHaveProperty('sitesVisited');
				expect(stats.sitesVisited).toEqual([]);
				done();
			});
		});
	});
	
	describe('updateStatistics', () => {
		test('increments accepted count and adds site to visited', (done) => {
			updateStatistics('newsite.com', true, () => {
				expect(chrome.storage.local.get).toHaveBeenCalledWith('statistics', expect.any(Function));
				expect(chrome.storage.local.set).toHaveBeenCalled();
				
				const setCall = chrome.storage.local.set.mock.calls[0][0];
				expect(setCall.statistics).toHaveProperty('totalHandled', 101);
				expect(setCall.statistics).toHaveProperty('acceptedCount', 81);
				expect(setCall.statistics).toHaveProperty('rejectedCount', 20);
				expect(setCall.statistics.sitesVisited).toContain('newsite.com');
				
				done();
			});
		});
		
		test('increments rejected count and adds site to visited', (done) => {
			updateStatistics('newsite.com', false, () => {
				expect(chrome.storage.local.get).toHaveBeenCalledWith('statistics', expect.any(Function));
				expect(chrome.storage.local.set).toHaveBeenCalled();
				
				const setCall = chrome.storage.local.set.mock.calls[0][0];
				expect(setCall.statistics).toHaveProperty('totalHandled', 101);
				expect(setCall.statistics).toHaveProperty('acceptedCount', 80);
				expect(setCall.statistics).toHaveProperty('rejectedCount', 21);
				expect(setCall.statistics.sitesVisited).toContain('newsite.com');
				
				done();
			});
		});
		
		test('does not add duplicate site to visited list', (done) => {
			updateStatistics('example.com', true, () => {
				const setCall = chrome.storage.local.set.mock.calls[0][0];
				expect(setCall.statistics.sitesVisited).toEqual(['example.com', 'test.com']);
				expect(setCall.statistics.sitesVisited.length).toBe(2);
				
				done();
			});
		});
		
		test('creates new statistics when none exist', (done) => {
			// Mock empty statistics
			chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
				callback({});
			});
			
			updateStatistics('newsite.com', true, () => {
				const setCall = chrome.storage.local.set.mock.calls[0][0];
				expect(setCall.statistics).toHaveProperty('totalHandled', 1);
				expect(setCall.statistics).toHaveProperty('acceptedCount', 1);
				expect(setCall.statistics).toHaveProperty('rejectedCount', 0);
				expect(setCall.statistics.sitesVisited).toEqual(['newsite.com']);
				
				done();
			});
		});
	});
}); 