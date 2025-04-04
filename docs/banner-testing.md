# Cookie Banner Testing Tool

This tool allows systematic testing of our cookie consent button detection logic against a variety of banner examples to ensure robust performance across different sites and implementations.

## Overview

The banner testing tool:
1. Processes HTML examples of cookie consent dialogs
2. Runs our detection algorithms against each example
3. Reports which buttons were identified and any potential issues
4. Validates that informational links aren't misidentified as buttons

## Using the Tool

### Running the Test Suite

Run all tests against the example directory:

```
npx jest tests/banner-tester.test.js --verbose
```

This will:
- Process all HTML files in `tests/banner-examples/`
- Generate a report at `tests/banner-analysis-report.md`
- Output results to the console
- Make assertions to verify correct button detection

### Adding New Examples

You can easily add new examples to test problematic cases:

1. **Save directly from command line:**
   
   ```
   npx jest tests/banner-tester.test.js --html="<your HTML here>" --name="example-name.html"
   ```

2. **Manually add:**
   
   Create a new .html file in `tests/banner-examples/` with the HTML content of the cookie banner.

## Interpreting Results

For each banner, the report shows:

- **Element Counts:** Number of buttons, anchors, etc.
- **Accept Button:** Details about the detected accept button
- **Necessary/Reject Button:** Details about the detected reject/necessary button
- **Issues:** Any warnings or errors in detection

## Latest Test Results

Below is the latest analysis report:

```markdown
# Cookie Banner Analysis Report

## bbc.html

### Element Counts
- Buttons: 1
- Anchors: 2
- Input Buttons: 0
- Custom Role Buttons: 0

### Accept Button
- Tag: BUTTON
- ID: bbccookies-continue
- Class: cookie-banner__button
- Text: "Yes, I agree"
- Is Link: false

### Necessary/Reject Button
- Not found

### Issues
- None detected

---

## complex-settings.html

### Element Counts
- Buttons: 3
- Anchors: 1
- Input Buttons: 0
- Custom Role Buttons: 0

### Accept Button
- Tag: BUTTON
- ID: none
- Class: cookie-accept-all
- Text: "Accept All"
- Is Link: false

### Necessary/Reject Button
- Tag: BUTTON
- ID: none
- Class: cookie-reject-all
- Text: "Reject All"
- Is Link: false

### Issues
- None detected

---

## ethz.html

### Element Counts
- Buttons: 3
- Anchors: 1
- Input Buttons: 0
- Custom Role Buttons: 0

### Accept Button
- Tag: BUTTON
- ID: onetrust-accept-btn-handler
- Class: none
- Text: "Accept all Cookies"
- Is Link: false

### Necessary/Reject Button
- Tag: BUTTON
- ID: onetrust-reject-all-handler
- Class: none
- Text: "Reject all Cookies"
- Is Link: false

### Issues
- None detected

---

## gdpr-simple.html

### Element Counts
- Buttons: 2
- Anchors: 1
- Input Buttons: 0
- Custom Role Buttons: 0

### Accept Button
- Tag: BUTTON
- ID: none
- Class: gdpr-accept
- Text: "Accept"
- Is Link: false

### Necessary/Reject Button
- Tag: BUTTON
- ID: none
- Class: gdpr-reject
- Text: "Reject"
- Is Link: false

### Issues
- None detected

---

## problematic-links.html

### Element Counts
- Buttons: 0
- Anchors: 7
- Input Buttons: 0
- Custom Role Buttons: 3

### Accept Button
- Tag: A
- ID: accept-cookies
- Class: styled-link accept-link
- Text: "Accept all cookies"
- Is Link: true

### Necessary/Reject Button
- Tag: A
- ID: reject-all
- Class: minimal-link reject-link
- Text: "Use necessary cookies only"
- Is Link: true

### Issues
- None detected
```

## Recommendations for Improving Detection

Based on test results, these strategies improve button detection:

1. **Prioritize direct button IDs first** - Many implementations use clear IDs like `accept-cookies`
2. **Exclude informational links** - Check href attributes and text content
3. **Prioritize buttons with explicit text** - "Accept All Cookies" is unambiguous
4. **Handle links with button roles correctly** - Some sites use styled anchors as buttons
5. **Be cautious with generic buttons** - Check content and context before selection

## How to Add Your Own Problematic Examples

If you encounter a cookie banner that isn't correctly detected:

1. Right-click on the banner and select "Inspect Element"
2. Find the container element for the entire banner
3. Right-click on that element and select "Copy" → "Copy outerHTML"
4. Save this HTML to a new file in the examples directory
5. Run the test to see if our algorithm correctly identifies the buttons

This helps us continuously improve detection across a wide range of implementations. 