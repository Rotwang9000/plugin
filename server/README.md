# Cookie Consent Manager Server

This is the server component for the Cookie Consent Manager browser extension. It handles the submission, review, and approval of cookie consent dialogs.

## Features

- **Review Submission API**: Accepts cookie dialog submissions from the extension
- **Admin Panel**: Web interface for reviewing and approving submissions
- **Pattern Management**: Stores approved patterns for future detection
- **Data Sanitization**: Removes sensitive information from submissions

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the server directory
   ```
   cd server
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the server
   ```
   npm start
   ```

The server will run on port 3000 by default. You can change this by setting the `PORT` environment variable.

## API Documentation

### Submit a Review

```
POST /api/reviews
```

**Request Body:**
```json
{
  "url": "https://example.com",
  "domain": "example.com",
  "selector": ".cookie-accept-all",
  "html": "<div class=\"cookie-dialog\">...</div>",
  "buttonType": "accept",
  "buttonText": "Accept All",
  "rating": 4.5,
  "isGoodMatch": true,
  "region": "uk"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "review": {
    "id": "1234567890abcde",
    "url": "https://example.com",
    "domain": "example.com",
    "selector": ".cookie-accept-all",
    "html": "<div class=\"cookie-dialog\">...</div>",
    "buttonType": "accept",
    "buttonText": "Accept All",
    "rating": 4.5,
    "isGoodMatch": true,
    "region": "uk",
    "status": "pending",
    "submittedAt": "2023-05-15T12:30:45.000Z",
    "reviewedAt": null,
    "approved": false
  }
}
```

### Get Reviews

```
GET /api/reviews
```

**Query Parameters:**
- `status` - Filter by status (pending, approved, rejected)
- `domain` - Filter by domain
- `approved` - Filter by approval status (true/false)

**Response:**
```json
{
  "success": true,
  "count": 1,
  "reviews": [
    {
      "id": "1234567890abcde",
      "url": "https://example.com",
      "domain": "example.com",
      "selector": ".cookie-accept-all",
      "buttonType": "accept",
      "status": "pending",
      "submittedAt": "2023-05-15T12:30:45.000Z",
      "reviewedAt": null,
      "approved": false
    }
  ]
}
```

### Update a Review

```
PATCH /api/reviews/:id
```

**Request Body:**
```json
{
  "status": "approved",
  "approved": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "review": {
    "id": "1234567890abcde",
    "url": "https://example.com",
    "domain": "example.com",
    "selector": ".cookie-accept-all",
    "buttonType": "accept",
    "status": "approved",
    "submittedAt": "2023-05-15T12:30:45.000Z",
    "reviewedAt": "2023-05-16T10:15:30.000Z",
    "approved": true
  }
}
```

### Get Patterns

```
GET /api/patterns
```

**Query Parameters:**
- `selector` - Filter by selector
- `domain` - Filter by domain

**Response:**
```json
{
  "success": true,
  "count": 1,
  "patterns": [
    {
      "id": "0987654321zyxwv",
      "selector": ".cookie-accept-all",
      "domain": "example.com",
      "buttonType": "accept",
      "rating": 4.5,
      "necessary": false,
      "signature": {
        "classPatterns": ["cookie", "accept", "all"],
        "structure": "div > .cookie-accept-all"
      },
      "createdAt": "2023-05-16T10:15:30.000Z",
      "updatedAt": "2023-05-16T10:15:30.000Z",
      "uses": 3
    }
  ]
}
```

### Update Pattern Usage

```
POST /api/patterns/:id/use
```

**Response:**
```json
{
  "success": true,
  "uses": 4
}
```

## Admin Panel

The admin panel is available at `/admin` and provides a user interface to:

1. View pending review submissions
2. Approve or reject reviews
3. View approved reviews
4. View and monitor pattern usage

## Data Storage

This implementation uses in-memory storage which is not persistent. In a production environment, you would replace this with a proper database solution such as:

- MongoDB
- PostgreSQL
- MySQL

The database module (`database.js`) is designed with an interface that can be easily adapted to use a real database.

## Security Considerations

For production use, you should implement:

1. **Authentication**: Secure the admin panel and API endpoints
2. **HTTPS**: Use TLS for all communications
3. **Rate Limiting**: Prevent abuse of the API
4. **Input Validation**: Additional validation of submitted data
5. **Persistent Storage**: Use a proper database

## Future Enhancements

- User authentication for the admin panel
- Dashboard with analytics
- Enhanced pattern matching techniques
- Export/import functionality for patterns
- Email notifications for new submissions

## License

This project is licensed under the MIT License. 