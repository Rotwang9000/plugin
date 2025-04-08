/**
 * Utility script to combine multiple selector files into a unified selectors.json
 * 
 * This script is used during development to combine separate selector definition files
 * into the final selectors.json file that is used by the extension.
 * 
 * Usage:
 *   node src/utils/finders/combine-selectors.js
 * 
 * The script reads from:
 *   - improved-selectors.json
 *   - improved-selectors-part2.json
 *   - improved-selectors-part3.json
 * 
 * And combines them into a single selectors.json file in the project root.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

// Helper function to read JSON files
function readJson(filePath) {
	try {
		console.log(`Reading file: ${filePath}`);
		const data = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		console.error(`Error reading file ${filePath}:`, error.message);
		process.exit(1);
	}
}

// Read all selector parts
console.log('Reading selector files...');
const part1 = readJson(path.join(projectRoot, 'improved-selectors.json'));
const part2 = readJson(path.join(projectRoot, 'improved-selectors-part2.json'));
const part3 = readJson(path.join(projectRoot, 'improved-selectors-part3.json'));

// Combine the selectors
console.log('Combining selectors...');
const combinedSelectors = {
	version: '2.0.0',
	dialogSelectors: part1.dialogSelectors,
	dialogPatterns: part1.dialogPatterns,
	buttonTypes: {
		...part1.buttonTypes,
		...part2.buttonTypes
	},
	checkboxTypes: part3.checkboxTypes,
	regionDetection: part3.regionDetection
};

// Output file path
const outputPath = path.join(projectRoot, 'selectors.json');

// Write the combined JSON to the output file
console.log(`Writing combined selectors to: ${outputPath}`);
fs.writeFileSync(outputPath, JSON.stringify(combinedSelectors, null, 2), 'utf8');

// Count categories and items for summary
const countItems = (obj) => {
	if (!obj) return 0;
	if (Array.isArray(obj)) return obj.length;
	return Object.keys(obj).length;
};

// Create summary output
console.log('\nSelectors Summary:');
console.log(`- Version: ${combinedSelectors.version}`);
console.log(`- Dialog Selectors: ${countItems(combinedSelectors.dialogSelectors)}`);
console.log(`- Dialog Patterns: ${countItems(combinedSelectors.dialogPatterns)}`);
console.log(`- Button Types: ${countItems(combinedSelectors.buttonTypes)}`);
console.log(`- Checkbox Types: ${countItems(combinedSelectors.checkboxTypes)}`);
console.log(`- Region Detection Data: ${combinedSelectors.regionDetection ? 'Present' : 'Missing'}`);
console.log(`\nTotal JSON size: ${Math.round(JSON.stringify(combinedSelectors).length / 1024)} KB`);

console.log('\nSelectors.json created successfully!');
console.log('You can now run unit tests to verify everything works:');
console.log('node tests/unit/run-finders.js'); 