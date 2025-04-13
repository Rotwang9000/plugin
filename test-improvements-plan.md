# Cookie Consent Manager Testing Plan

## Current Status

The refactoring of the Cookie Consent Manager from procedural code to an object-oriented approach has been largely implemented. Key components have been created:

1. Base `ElementFinder` class with comprehensive element finding strategies
2. Specialized finders like `ButtonFinder`, `CheckboxFinder`, and `DialogFinder`
3. A unified selector configuration in `selectors.json`
4. Unit tests for these components

We have successfully fixed the finder unit tests (in `tests/unit/finders/*`), but there are still many failing tests in the codebase. The main issues are:

1. **Jest Configuration Issues**: Most tests are failing with errors like `ReferenceError: jest is not defined` or `ReferenceError: require is not defined`. This indicates that the Jest configuration is not properly set up for ES modules.

2. **Import/Require Issues**: The project appears to mix CommonJS (`require`) and ES modules (`import/export`) syntax, causing compatibility problems.

3. **Missing Mock Dependencies**: Several tests fail with errors like `Cannot find module '../src/modules/utils.js' from 'jest.setup.js'`, indicating that mock dependencies are not properly configured.

4. **Functional Test Failures**: At least one test (`tests/modules.test.js`) is failing due to behavioral changes in the `isCookieConsentDialog` function.

## Plan of Action

### Phase 1: Fix Jest Configuration for ES Modules

1. **Update Jest Configuration:**
   - Update `jest.config.js` to properly support ES modules
   - Configure proper module transformation for modern JavaScript
   - Ensure proper test environment setup

2. **Fix Import/Require Issues:**
   - Convert CommonJS require statements to ES module imports
   - Standardize the import style across all test files
   - Add proper export statements where needed

3. **Fix Jest Setup:**
   - Update `jest.setup.js` to properly support ES modules
   - Ensure global mocks are properly defined and available

### Phase 2: Fix Broken Tests

1. **Fix Functional Issues in Modules Test:**
   - Update `isCookieConsentDialog` function to properly identify cookie banners
   - Ensure the function matches the expected behavior in tests

2. **Update Test Files to Use New Finder Classes:**
   - Identify tests still using old finder implementations
   - Update imports to use new finder classes
   - Adjust test expectations if needed

3. **Fix Mock Dependencies:**
   - Ensure all mocked modules are properly defined
   - Update file paths if modules have moved during refactoring
   - Create centralized mock configurations

### Phase 3: Expand Test Coverage

1. **Add Integration Tests for Finder Classes:**
   - Test interactions between different finder classes
   - Test with more complex DOM structures
   - Test with edge cases and problematic patterns

2. **Create Test Fixtures for Real-World Dialogs:**
   - Add representative cookie banner markup from popular websites
   - Test against well-known cookie consent solutions
   - Test with multi-language variants

3. **Add Performance Tests:**
   - Test finder performance with large DOM trees
   - Test caching effectiveness
   - Benchmark selector strategies

### Phase 4: Test Regression and Edge Cases

1. **Test with Known Problematic Sites:**
   - Create tests for sites that previously required special handling
   - Verify that all edge cases are handled correctly
   - Document any remaining issues

2. **Test with Multilingual Content:**
   - Create tests with non-English text
   - Verify that pattern matching works across languages
   - Test right-to-left text handling

3. **Test Accessibility Considerations:**
   - Test with screen readers
   - Test keyboard navigation
   - Verify ARIA attributes are properly recognized

## Implementation Priorities

### Immediate Priorities:

1. **Fix Jest Configuration Issues:**
   - Update `jest.config.js` to properly support ES modules
   - Fix `jest.setup.js` to import necessary modules
   - Add support for both CommonJS and ES modules during the transition

2. **Fix the Modules Test:**
   - Update `isCookieConsentDialog` function to match expected behavior
   - Ensure proper dialog detection for common banner types

3. **Update Import Statements:**
   - Convert require statements to ES module imports
   - Standardize module import style across test files

### Medium-Term Priorities:

1. **Create Better Test Fixtures:**
   - Develop common test fixtures for various dialog types
   - Create utility functions for test setup and teardown
   - Implement a consistent testing approach

2. **Improve Test Organization:**
   - Group tests by functionality
   - Create logical test suites
   - Ensure tests are independent and don't affect each other

3. **Enhance Error Reporting:**
   - Add more detailed error messages
   - Implement better debugging tools for tests
   - Document common test failures and solutions

### Long-Term Priorities:

1. **Implement Continuous Integration:**
   - Set up automated test runs
   - Configure test coverage reporting
   - Implement performance regression testing

2. **Create Visual Regression Tests:**
   - Test UI components visually
   - Ensure consistent appearance across browsers
   - Test with different screen sizes

3. **Improve Documentation:**
   - Document testing strategy
   - Create guides for adding tests
   - Document common test patterns

## Next Steps

1. Update the Jest configuration to properly support ES modules
2. Fix the import/require issues in test files
3. Fix the failing `isCookieConsentDialog` test in `tests/modules.test.js`
4. Update remaining tests to use the new finder classes 