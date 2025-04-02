# Privacy Categories Specification

## Overview

This document outlines the standardised privacy permission categories for the Cookie Consent Manager system. These categories provide a consistent way to classify and handle different types of cookies and data collection practices across websites.

## Standard Permission Categories

### 1. Essential/Technical

**Definition**: Cookies and data processing that are strictly necessary for the basic operation of a website or service.

**Examples**:
- Session cookies for maintaining login state
- Shopping cart cookies on e-commerce sites
- Security cookies for fraud prevention
- Load balancing cookies

**Properties**:
- Always required for site functionality
- Cannot be declined by users
- Limited data retention period
- No sharing with third parties
- No use for tracking or profiling

### 2. Functional

**Definition**: Cookies that enhance website usability but are not strictly necessary for core functionality.

**Examples**:
- Language preference storage
- UI customisation settings
- Recently viewed items
- Form auto-fill helpers

**Properties**:
- Optional for site functionality
- Can be declined by users
- May have longer retention periods
- Limited sharing with service providers
- Limited tracking of site-specific preferences

### 3. Analytics/Statistics

**Definition**: Cookies used to collect anonymous information about how visitors use a website.

**Examples**:
- Page view counts
- Navigation patterns
- Time spent on pages
- Exit rates
- Device/browser information

**Properties**:
- Optional for site functionality
- Can be declined by users
- Typically anonymised or pseudonymised
- May involve third-party tools (e.g., Google Analytics)
- Used for site improvement rather than targeting

### 4. Marketing/Advertising

**Definition**: Cookies used to display targeted advertisements or track user behaviour for marketing purposes.

**Examples**:
- Ad network cookies
- Retargeting pixels
- Campaign effectiveness measurement
- Interest-based advertising profiles

**Properties**:
- Optional for site functionality
- Should be disabled by default (opt-in)
- Often involves third-party sharing
- Used for personalisation and targeting
- Often has long retention periods

### 5. Third-Party Sharing

**Definition**: Cookies set by third parties for purposes beyond essential site functionality.

**Examples**:
- Social media sharing buttons
- Embedded content from external sites
- Third-party widgets and plugins
- Cross-site tracking tools

**Properties**:
- Optional for site functionality
- Should be disabled by default (opt-in)
- Data shared with external companies
- May involve tracking across multiple websites
- Often used for profiling

### 6. Social Media Integration

**Definition**: Cookies specifically related to social media platforms and functionality.

**Examples**:
- Social login cookies
- Share button functionality
- Embedded social feeds
- Comment systems powered by social platforms

**Properties**:
- Optional for site functionality
- Should be disabled by default (opt-in)
- Data shared with social platforms
- May enable tracking by social networks
- Often implements cross-site tracking

## Standardised Format for Developers

### HTML Meta Tag Format

Websites can implement our standardised format using meta tags:

```html
<meta name="privacy-consent" content="json:{ 
  'categories': {
    'essential': {
      'required': true,
      'description': 'Required for basic site functionality',
      'cookies': [
        { 'name': 'session_id', 'purpose': 'User session management', 'duration': '1 day' },
        { 'name': 'csrf_token', 'purpose': 'Security protection', 'duration': '1 hour' }
      ]
    },
    'functional': {
      'required': false,
      'description': 'Enhances site usability',
      'cookies': [
        { 'name': 'ui_theme', 'purpose': 'Remembers your preferred display settings', 'duration': '1 year' },
        { 'name': 'recent_views', 'purpose': 'Tracks recently viewed items', 'duration': '30 days' }
      ]
    },
    'analytics': {
      'required': false,
      'description': 'Helps us improve our website',
      'cookies': [
        { 'name': '_ga', 'purpose': 'Google Analytics tracking', 'duration': '2 years' },
        { 'name': '_gid', 'purpose': 'Google Analytics session tracking', 'duration': '1 day' }
      ]
    },
    'marketing': {
      'required': false,
      'description': 'Personalised advertising',
      'cookies': [
        { 'name': 'ad_id', 'purpose': 'Ad targeting', 'duration': '90 days' },
        { 'name': 'campaign_ref', 'purpose': 'Tracks marketing campaign effectiveness', 'duration': '30 days' }
      ]
    }
  },
  'message': 'We use cookies to improve your experience and show you relevant content.',
  'privacyPolicyLink': '/privacy.html',
  'cookiePolicyLink': '/cookies.html'
}">
```

### JavaScript Implementation

For more dynamic implementations, developers can use our JavaScript library:

```javascript
// Include in website headers
<script src="https://cdn.cookie-consent-manager.com/integration.js"></script>

// Configure options
<script>
  window.CookieConsentManager = {
    categories: {
      essential: {
        required: true,
        description: 'Required for basic site functionality',
        cookies: [
          { name: 'session_id', purpose: 'User session management', duration: '1 day' },
          { name: 'csrf_token', purpose: 'Security protection', duration: '1 hour' }
        ]
      },
      functional: {
        required: false,
        description: 'Enhances site usability',
        cookies: [
          { name: 'ui_theme', purpose: 'Remembers your preferred display settings', duration: '1 year' },
          { name: 'recent_views', purpose: 'Tracks recently viewed items', duration: '30 days' }
        ]
      },
      analytics: {
        required: false,
        description: 'Helps us improve our website',
        cookies: [
          { name: '_ga', purpose: 'Google Analytics tracking', duration: '2 years' },
          { name: '_gid', purpose: 'Google Analytics session tracking', duration: '1 day' }
        ]
      },
      marketing: {
        required: false,
        description: 'Personalised advertising',
        cookies: [
          { name: 'ad_id', purpose: 'Ad targeting', duration: '90 days' },
          { name: 'campaign_ref', purpose: 'Tracks marketing campaign effectiveness', duration: '30 days' }
        ]
      }
    },
    message: 'We use cookies to improve your experience and show you relevant content.',
    privacyPolicyLink: '/privacy.html',
    cookiePolicyLink: '/cookies.html',
    position: 'bottom', // 'top' or 'bottom'
    theme: 'light',     // 'light' or 'dark'
    customStyle: {      // Optional custom styling
      barBackground: '#f8f9fa',
      textColor: '#212529',
      buttonColor: '#0d6efd',
      buttonTextColor: '#ffffff'
    }
  };
</script>
```

### JSON Schema

For validation purposes, here is the formal JSON schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["categories", "message"],
  "properties": {
    "categories": {
      "type": "object",
      "required": ["essential"],
      "properties": {
        "essential": {
          "$ref": "#/definitions/category"
        },
        "functional": {
          "$ref": "#/definitions/category"
        },
        "analytics": {
          "$ref": "#/definitions/category"
        },
        "marketing": {
          "$ref": "#/definitions/category"
        },
        "thirdParty": {
          "$ref": "#/definitions/category"
        },
        "socialMedia": {
          "$ref": "#/definitions/category"
        }
      }
    },
    "message": {
      "type": "string",
      "minLength": 10,
      "maxLength": 500
    },
    "privacyPolicyLink": {
      "type": "string",
      "format": "uri-reference"
    },
    "cookiePolicyLink": {
      "type": "string",
      "format": "uri-reference"
    },
    "position": {
      "type": "string",
      "enum": ["top", "bottom"]
    },
    "theme": {
      "type": "string",
      "enum": ["light", "dark"]
    },
    "customStyle": {
      "type": "object",
      "properties": {
        "barBackground": {
          "type": "string",
          "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
        },
        "textColor": {
          "type": "string",
          "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
        },
        "buttonColor": {
          "type": "string",
          "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
        },
        "buttonTextColor": {
          "type": "string",
          "pattern": "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
        }
      }
    }
  },
  "definitions": {
    "category": {
      "type": "object",
      "required": ["required", "description"],
      "properties": {
        "required": {
          "type": "boolean"
        },
        "description": {
          "type": "string",
          "minLength": 5,
          "maxLength": 200
        },
        "cookies": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "purpose"],
            "properties": {
              "name": {
                "type": "string"
              },
              "purpose": {
                "type": "string",
                "minLength": 5,
                "maxLength": 100
              },
              "duration": {
                "type": "string"
              }
            }
          }
        }
      }
    }
  }
}
```

## Implementation Benefits

### For Website Owners

- **Compliance Simplification**: Easier adherence to GDPR, CCPA, and other privacy regulations
- **Reduced Development**: No need to create custom cookie consent solutions
- **Consistent Experience**: Provides users with familiar controls across sites
- **Transparent Disclosure**: Clear categorisation of data practices builds trust
- **Automatic Updates**: Privacy regulations change; our system stays current

### For Users

- **Consistent Interface**: Familiar experience across different websites
- **Granular Control**: Fine-tuned permission settings beyond simple accept/reject
- **Time Saving**: Quick decisions through standardised categories
- **Better Information**: Clear explanations of cookie purposes and implications
- **Preference Memory**: Set preferences once for similar websites

## Implementation Guidelines

### Best Practices

1. **Be Transparent**: Provide accurate descriptions of each cookie's purpose
2. **Minimise Categories**: Don't unnecessarily split cookies across categories
3. **Default to Privacy**: Non-essential categories should default to off
4. **Clear Language**: Avoid technical jargon in descriptions
5. **Regular Audits**: Update your cookie declarations as your site changes

### Common Pitfalls

1. **Miscategorisation**: Placing marketing cookies in "essential" category
2. **Vague Descriptions**: Using unclear or misleading cookie purposes
3. **Hidden Cookies**: Failing to declare all cookies used by the site
4. **Ignoring Third Parties**: Not accounting for cookies set by embedded content
5. **Technical Focus**: Describing cookies by technology rather than purpose

## Conclusion

This specification provides a standardised approach to privacy permission categorisation that benefits both users and website owners. By implementing this system, websites can provide clear, consistent privacy controls while simplifying compliance with global privacy regulations. 