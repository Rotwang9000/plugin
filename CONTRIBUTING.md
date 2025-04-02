# Contributing to Cookie Consent Manager

Thank you for considering contributing to the Cookie Consent Manager extension! Here's how you can help improve this project.

## Adding Selectors to the Cloud Database

The cloud database contains CSS selectors for known cookie consent banners. To add a new selector:

1. Open the `content.js` file
2. Locate the `cloudDatabase` object, which contains both site-specific and common selectors
3. Add a new selector following the appropriate format:

For site-specific selectors:
```javascript
'example.com': [
  { selector: '#your-selector', type: 'button', rating: 4.5 }
]
```

For common selectors:
```javascript
{ 
  selector: '.common-selector', 
  type: 'button', 
  rating: 4.2
}
```

For pattern-based selectors:
```javascript
{ 
  selector: '.pattern-selector', 
  type: 'button', 
  patternId: 'unique-pattern-id', 
  rating: 4.8,
  signature: {
    classPatterns: ['pattern-', 'consent'],
    structure: 'div > div > button.pattern-selector'
  }
}
```

**Tips for creating effective selectors:**

- Use browser developer tools to identify the most specific selector for the accept button
- Try to use IDs (#element-id) when available as they're more stable
- For class-based selectors, use the most specific class that uniquely identifies the element
- Test your selector on multiple pages of the same site to ensure consistency
- For pattern-based detection, identify common class naming patterns or structures

## Using the Dialog Capture System

The dialog capture system allows users to contribute to the cloud database without editing code:

1. Enable the extension while browsing
2. When cookie dialogs are detected and handled, they are stored for review
3. Click the extension icon and go to the "Captured Dialogs" tab
4. Review and rate the captured dialogs:
   - Click "Good Match" if the dialog was correctly identified
   - Click "Bad Match" if the dialog was incorrectly identified
5. Your ratings help improve the detection algorithms for all users

## Reporting Issues

When reporting issues, please include:

1. The website URL where the issue occurred
2. A description of what happened vs what was expected
3. Screenshots if applicable
4. Browser version and operating system
5. For cookie detection problems, include the HTML structure of the dialog if possible

## Code Contributions

For larger code contributions:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request with a clear description of the changes

## Testing

Before submitting, test your changes on a variety of websites to ensure they work correctly and don't interfere with normal browsing. In particular, test:

- Popular websites with common cookie dialogs
- Regional websites that might use different languages
- Sites with custom cookie implementations

### Automated Testing

The project includes a comprehensive test suite using Jest. Run all tests with:

```
npm test
```

When adding new features or fixing bugs:

1. Add or update tests that cover your changes
2. Ensure all existing tests continue to pass
3. Write tests for edge cases and potential failure modes

The test suite includes:

- **Unit tests** for individual functions and components
- **Integration tests** for communication between different parts of the extension
- **Edge case tests** for unusual cookie banner scenarios
- **Configuration tests** for validating the extension setup

Tests are organized in the `tests/` directory by component.

Follow these testing best practices:
- Mock Chrome APIs and DOM interactions
- Use descriptive test names that explain what's being tested
- Keep tests focused on testing a single behavior
- Use setup and teardown functions to maintain test isolation

## Code Style

- Use tabs for indentation
- Follow existing code patterns
- Keep functions small and focused on a single task
- Add comments for complex logic

Thank you for helping improve the Cookie Consent Manager! 