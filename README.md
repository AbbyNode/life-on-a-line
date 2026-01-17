# life-on-a-line

A web application for visualizing your personal life timeline with events at specific points in time.

## Features

- **Timeline Visualization**: Interactive timeline powered by vis-timeline library
- **Zooming & Scrolling**: Zoom in/out to see more or less detail, scroll along your timeline
- **User Profile**: Set your name and birth date to establish your timeline
- **Point & Span Events**: Create events that are single points in time or that span multiple years
- **Categories**: Organize events into categories (Work, Education, Personal, Travel, Health, Relationships)
- **Category Filtering**: Toggle visibility of events by category
- **Server-side Storage**: All data is saved persistently on the server

## Installation

1. Clone the repository:
```bash
git clone https://github.com/AbbyNode/life-on-a-line.git
cd life-on-a-line
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. **Set Up Your Profile**: Enter your name and birth date to establish your timeline
2. **Add Events**: Fill in the event form with:
   - Event title
   - Description (optional)
   - Category
   - Event type (Point in time or Time span)
   - Start date (and end date for spans)
3. **View Timeline**: Your events will appear on the interactive timeline
4. **Filter Events**: Toggle categories on/off to focus on specific types of events
5. **Zoom & Navigate**: Use the zoom controls to adjust your view
6. **Edit Events**: Click on any event to edit or delete it

## Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: HTML, CSS, JavaScript
- **Visualization**: vis-timeline library
- **Storage**: JSON file-based storage

## API Endpoints

- `GET /api/user` - Get user profile
- `POST /api/user` - Update user profile
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/categories` - Get all categories

## License

ISC