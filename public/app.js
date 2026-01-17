// Global variables
let timeline = null;
let items = new vis.DataSet();
let currentUser = { name: '', birthdate: '' };
let allEvents = [];
let categories = [];
let visibleCategories = new Set();

// API Base URL
const API_BASE = '/api';

// Initialize the application
async function init() {
    await loadUser();
    await loadCategories();
    await loadEvents();
    initTimeline();
    setupEventListeners();
    updateCategoryFilters();
}

// Load user profile
async function loadUser() {
    try {
        const response = await fetch(`${API_BASE}/user`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        currentUser = await response.json();
        if (currentUser.name) {
            document.getElementById('user-name').value = currentUser.name;
        }
        if (currentUser.birthdate) {
            document.getElementById('birthdate').value = currentUser.birthdate;
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Save user profile
async function saveUser(userData) {
    try {
        const response = await fetch(`${API_BASE}/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
            currentUser = result.user;
            updateTimelineRange();
            alert('Profile saved successfully!');
        } else {
            alert(result.error || 'Error saving profile');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Error saving profile');
    }
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        categories = await response.json();
        updateCategorySelect();
        categories.forEach(cat => visibleCategories.add(cat));
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load events
async function loadEvents() {
    try {
        const response = await fetch(`${API_BASE}/events`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allEvents = await response.json();
        updateTimelineItems();
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Save event
async function saveEvent(eventData) {
    try {
        const method = eventData.id ? 'PUT' : 'POST';
        const url = eventData.id ? `${API_BASE}/events/${eventData.id}` : `${API_BASE}/events`;
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
            await loadEvents();
            clearEventForm();
            alert('Event saved successfully!');
        } else {
            alert(result.error || 'Error saving event');
        }
    } catch (error) {
        console.error('Error saving event:', error);
        alert('Error saving event');
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
            await loadEvents();
            clearEventForm();
            alert('Event deleted successfully!');
        } else {
            alert(result.error || 'Error deleting event');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event');
    }
}

// Initialize timeline
function initTimeline() {
    const container = document.getElementById('timeline');
    
    // Set timeline range
    const start = currentUser.birthdate ? new Date(currentUser.birthdate) : new Date(new Date().getFullYear() - 30, 0, 1);
    const end = new Date();
    
    const options = {
        start: start,
        end: end,
        min: start,
        max: new Date(),
        zoomMin: 1000 * 60 * 60 * 24 * 30, // 1 month
        zoomMax: 1000 * 60 * 60 * 24 * 365 * 100, // 100 years
        editable: false,
        selectable: true,
        stack: true,
        showCurrentTime: true,
        margin: {
            item: 10,
            axis: 5
        },
        orientation: 'top'
    };
    
    timeline = new vis.Timeline(container, items, options);
    
    // Handle item selection
    timeline.on('select', function(properties) {
        if (properties.items.length > 0) {
            const eventId = properties.items[0];
            const event = allEvents.find(e => e.id === eventId);
            if (event) {
                loadEventToForm(event);
            }
        }
    });
}

// Update timeline items based on visible categories
function updateTimelineItems() {
    items.clear();
    
    const filteredEvents = allEvents.filter(event => 
        visibleCategories.has(event.category)
    );
    
    const timelineItems = filteredEvents.map(event => {
        const item = {
            id: event.id,
            content: event.title,
            start: new Date(event.start),
            className: `category-${event.category.replace(/\s+/g, '-')}`,
            title: event.description || ''
        };
        
        if (event.type === 'range' && event.end) {
            item.end = new Date(event.end);
            item.type = 'range';
        } else {
            item.type = 'point';
        }
        
        return item;
    });
    
    items.add(timelineItems);
}

// Update timeline range based on user birthdate
function updateTimelineRange() {
    if (timeline && currentUser.birthdate) {
        const start = new Date(currentUser.birthdate);
        const end = new Date();
        timeline.setWindow(start, end);
        timeline.setOptions({
            min: start,
            max: end
        });
    }
}

// Update category select dropdown
function updateCategorySelect() {
    const select = document.getElementById('event-category');
    select.innerHTML = '<option value="">Select category</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

// Update category filters
function updateCategoryFilters() {
    const container = document.getElementById('category-filters');
    container.innerHTML = '';
    
    categories.forEach(cat => {
        const filter = document.createElement('label');
        filter.className = 'category-filter' + (visibleCategories.has(cat) ? ' active' : '');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = visibleCategories.has(cat);
        checkbox.addEventListener('change', () => toggleCategory(cat));
        
        const span = document.createElement('span');
        span.textContent = cat;
        
        filter.appendChild(checkbox);
        filter.appendChild(span);
        container.appendChild(filter);
    });
}

// Toggle category visibility
function toggleCategory(category) {
    if (visibleCategories.has(category)) {
        visibleCategories.delete(category);
    } else {
        visibleCategories.add(category);
    }
    updateCategoryFilters();
    updateTimelineItems();
}

// Load event data to form
function loadEventToForm(event) {
    document.getElementById('event-id').value = event.id;
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-description').value = event.description || '';
    document.getElementById('event-category').value = event.category;
    document.getElementById('event-type').value = event.type;
    document.getElementById('event-start').value = event.start;
    
    if (event.type === 'range') {
        document.getElementById('end-date-group').style.display = 'block';
        document.getElementById('event-end').value = event.end || '';
    } else {
        document.getElementById('end-date-group').style.display = 'none';
    }
    
    document.getElementById('delete-event').style.display = 'inline-block';
    
    // Scroll to form
    document.getElementById('event-section').scrollIntoView({ behavior: 'smooth' });
}

// Clear event form
function clearEventForm() {
    document.getElementById('event-form').reset();
    document.getElementById('event-id').value = '';
    document.getElementById('end-date-group').style.display = 'none';
    document.getElementById('delete-event').style.display = 'none';
    if (timeline) {
        timeline.setSelection([]);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Profile form
    document.getElementById('profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const userData = {
            name: document.getElementById('user-name').value,
            birthdate: document.getElementById('birthdate').value
        };
        saveUser(userData);
    });
    
    // Event form
    document.getElementById('event-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const eventData = {
            title: document.getElementById('event-title').value,
            description: document.getElementById('event-description').value,
            category: document.getElementById('event-category').value,
            type: document.getElementById('event-type').value,
            start: document.getElementById('event-start').value
        };
        
        const eventId = document.getElementById('event-id').value;
        if (eventId) {
            eventData.id = eventId;
        }
        
        if (eventData.type === 'range') {
            eventData.end = document.getElementById('event-end').value;
        }
        
        saveEvent(eventData);
    });
    
    // Event type change
    document.getElementById('event-type').addEventListener('change', (e) => {
        const endDateGroup = document.getElementById('end-date-group');
        if (e.target.value === 'range') {
            endDateGroup.style.display = 'block';
        } else {
            endDateGroup.style.display = 'none';
        }
    });
    
    // Delete event button
    document.getElementById('delete-event').addEventListener('click', () => {
        const eventId = document.getElementById('event-id').value;
        if (eventId) {
            deleteEvent(eventId);
        }
    });
    
    // Cancel event button
    document.getElementById('cancel-event').addEventListener('click', () => {
        clearEventForm();
    });
    
    // Timeline controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        timeline.zoomIn(0.5);
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
        timeline.zoomOut(0.5);
    });
    
    document.getElementById('fit-timeline').addEventListener('click', () => {
        timeline.fit();
    });
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
