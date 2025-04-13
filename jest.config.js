export default {
	testEnvironment: "jsdom",
	transform: {}, // Empty to disable Babel for ESM
	moduleFileExtensions: ["js", "mjs"],
	testMatch: ["**/*.test.js", "**/*.test.mjs"],
	transformIgnorePatterns: [
		"/node_modules/(?!(\\.pnpm|some-es-module-you-need-transformed))",
	],
	setupFilesAfterEnv: ["./jest.setup.js"],
	// For imports without extensions
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	}
}; 