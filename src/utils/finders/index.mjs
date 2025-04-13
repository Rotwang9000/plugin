/**
 * Entry point for finder classes with ES module format
 * This file re-exports the finder classes in a format that can be imported by both ESM and CommonJS modules
 */

import { ElementFinder } from './elementFinder.js';
import { ButtonFinder } from './buttonFinder.js';
import { CheckboxFinder } from './checkboxFinder.js';
import { DialogFinder } from './dialogFinder.js';
import { RegionDetector } from './regionDetector.js';
import { isCookieConsentDialog } from './shared/cookieDialogBridge.js';
import { analyzeDialogSource } from './shared/cookieDialogDetector.js';

// Export all components
export {
	ElementFinder,
	ButtonFinder,
	CheckboxFinder,
	DialogFinder,
	RegionDetector,
	isCookieConsentDialog,
	analyzeDialogSource
};

// For CommonJS interoperability
export default {
	ElementFinder,
	ButtonFinder,
	CheckboxFinder,
	DialogFinder,
	RegionDetector,
	isCookieConsentDialog,
	analyzeDialogSource
}; 