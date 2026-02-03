// Global variables
let timeline = null;
let items = new vis.DataSet();
let currentUser = { name: '', birthdate: '' };
let allEvents = [];
let categories = [];
let visibleCategories = new Set();
let isVerticalView = false;

// Constants for localStorage
const STORAGE_KEY_ORIENTATION = 'timeline-orientation';

// API Base URL
const API_BASE = '/api';

// Detect if device is mobile
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Get default orientation based on device
function getDefaultOrientation() {
    return isMobileDevice() ? 'vertical' : 'horizontal';
}

// Load saved orientation or use default
function loadOrientationPreference() {
    const saved = localStorage.getItem(STORAGE_KEY_ORIENTATION);
    if (saved === 'vertical' || saved === 'horizontal') {
        return saved;
    }
    return getDefaultOrientation();
}

// Save orientation preference
function saveOrientationPreference(orientation) {
    localStorage.setItem(STORAGE_KEY_ORIENTATION, orientation);
}

// Initialize the application
async function init() {
    await loadUser();
    await loadCategories();
    await loadEvents();
    initTimeline();
    setupEventListeners();
    updateCategoryFilters();
    
    // Initialize orientation based on saved preference or device default
    const savedOrientation = loadOrientationPreference();
    isVerticalView = savedOrientation === 'vertical';
    applyOrientation();
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
        if (isVerticalView) {
            renderVerticalTimeline();
        }
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
    if (isVerticalView) {
        renderVerticalTimeline();
    }
}

// Toggle between horizontal and vertical view
function toggleOrientation() {
    isVerticalView = !isVerticalView;
    saveOrientationPreference(isVerticalView ? 'vertical' : 'horizontal');
    applyOrientation();
}

// Apply the current orientation
function applyOrientation() {
    const horizontalTimeline = document.getElementById('timeline');
    const verticalTimeline = document.getElementById('vertical-timeline');
    const toggleBtn = document.getElementById('toggle-orientation');
    const orientationIcon = document.getElementById('orientation-icon');
    const orientationLabel = document.getElementById('orientation-label');
    const timelineSection = document.getElementById('timeline-section');
    
    if (isVerticalView) {
        horizontalTimeline.style.display = 'none';
        verticalTimeline.style.display = 'block';
        toggleBtn.classList.add('vertical-active');
        orientationIcon.textContent = '↕';
        orientationLabel.textContent = 'Vertical';
        timelineSection.classList.add('vertical-mode');
        renderVerticalTimeline();
    } else {
        horizontalTimeline.style.display = 'block';
        verticalTimeline.style.display = 'none';
        toggleBtn.classList.remove('vertical-active');
        orientationIcon.textContent = '↔';
        orientationLabel.textContent = 'Horizontal';
        timelineSection.classList.remove('vertical-mode');
        if (timeline) {
            timeline.redraw();
        }
    }
}

// Render vertical timeline
function renderVerticalTimeline() {
    const container = document.getElementById('vertical-timeline');
    
    // Filter events based on visible categories
    const filteredEvents = allEvents.filter(event => 
        visibleCategories.has(event.category)
    );
    
    // Sort events by start date (newest first)
    const sortedEvents = [...filteredEvents].sort((a, b) => 
        new Date(b.start) - new Date(a.start)
    );
    
    if (sortedEvents.length === 0) {
        container.innerHTML = '<div class="vertical-timeline-empty">No events to display. Add some events or adjust your category filters.</div>';
        return;
    }
    
    container.innerHTML = sortedEvents.map(event => {
        const startDate = new Date(event.start);
        const categoryClass = `category-${event.category.replace(/\s+/g, '-')}`;
        
        let dateStr = startDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        if (event.type === 'range' && event.end) {
            const endDate = new Date(event.end);
            dateStr += ' - ' + endDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
        
        return `
            <div class="vertical-timeline-item" data-event-id="${event.id}">
                <div class="vertical-timeline-content ${categoryClass}">
                    <div class="vertical-timeline-date">${dateStr}</div>
                    <div class="vertical-timeline-title">${escapeHtml(event.title)}</div>
                    <span class="vertical-timeline-category">${escapeHtml(event.category)}</span>
                    ${event.description ? `<div class="vertical-timeline-description">${escapeHtml(event.description)}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers for selecting events
    container.querySelectorAll('.vertical-timeline-item').forEach(item => {
        item.addEventListener('click', () => {
            const eventId = item.getAttribute('data-event-id');
            const event = allEvents.find(e => e.id === eventId);
            if (event) {
                // Remove selection from all items
                container.querySelectorAll('.vertical-timeline-content').forEach(content => {
                    content.classList.remove('selected');
                });
                // Add selection to clicked item
                item.querySelector('.vertical-timeline-content').classList.add('selected');
                loadEventToForm(event);
            }
        });
    });
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    // Clear selection in vertical timeline
    document.querySelectorAll('.vertical-timeline-content.selected').forEach(content => {
        content.classList.remove('selected');
    });
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
    document.getElementById('toggle-orientation').addEventListener('click', () => {
        toggleOrientation();
    });
    
    document.getElementById('zoom-in').addEventListener('click', () => {
        timeline.zoomIn(0.5);
    });
    
    document.getElementById('zoom-out').addEventListener('click', () => {
        timeline.zoomOut(0.5);
    });
    
    document.getElementById('fit-timeline').addEventListener('click', () => {
        timeline.fit();
    });
    
    // Handle window resize to potentially update orientation on device change
    window.addEventListener('resize', () => {
        if (isVerticalView) {
            renderVerticalTimeline();
        }
    });
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
