export default {
	testEnvironment: "jsdom",
	transform: {}, // Empty to disable Babel for ESM
	moduleFileExtensions: ["js"],
	testMatch: ["**/*.test.js"],
	transformIgnorePatterns: [
		"/node_modules/(?!(\\.pnpm|some-es-module-you-need-transformed))",
	],
	setupFilesAfterEnv: ["./jest.setup.js"],
}; 