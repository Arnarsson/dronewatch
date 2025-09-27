/**
 * Filter Pattern Example for DroneWatch
 * This pattern shows how to add new filters to the application
 */

// 1. DEFINE FILTER STATE
// Add your filter to the global state object
const state = {
  filters: {
    // Existing filters
    dateRange: 7,
    status: ["active", "resolved"],
    evidence: [0, 1, 2, 3],

    // NEW FILTER EXAMPLE
    severityThreshold: 5,  // Only show incidents with severity >= 5
    categoryFilter: ["sighting", "closure"],  // Filter by incident category
  }
};

// 2. CREATE UI CONTROL
// Add HTML for the filter control (goes in index.html)
const filterControlHTML = `
  <div class="filter-control">
    <label for="severity-filter" class="filter-label">
      Minimum Severity
      <span class="filter-value">5</span>
    </label>
    <input
      type="range"
      id="severity-filter"
      min="1"
      max="10"
      value="5"
      class="filter-slider"
    />
  </div>

  <div class="filter-control">
    <label class="filter-label">Categories</label>
    <div class="checkbox-group">
      <label class="checkbox-label">
        <input type="checkbox" value="sighting" checked />
        <span>Sightings</span>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" value="closure" checked />
        <span>Closures</span>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" value="breach" />
        <span>Breaches</span>
      </label>
    </div>
  </div>
`;

// 3. IMPLEMENT FILTER LOGIC
function applyFilters() {
  let filtered = state.incidents;

  // Existing filters (date, status, etc.)
  // ...

  // NEW FILTER: Severity threshold
  if (state.filters.severityThreshold) {
    filtered = filtered.filter(incident => {
      return incident.scores.severity >= state.filters.severityThreshold;
    });
  }

  // NEW FILTER: Category filter
  if (state.filters.categoryFilter && state.filters.categoryFilter.length > 0) {
    filtered = filtered.filter(incident => {
      return state.filters.categoryFilter.includes(incident.incident.category);
    });
  }

  // Log for debugging
  console.log(`Filtered ${state.incidents.length} to ${filtered.length} incidents`);

  return filtered;
}

// 4. ADD EVENT LISTENERS
function initializeFilterListeners() {
  // Severity slider
  document.getElementById('severity-filter').addEventListener('input', (e) => {
    state.filters.severityThreshold = parseInt(e.target.value);

    // Update display value
    e.target.parentElement.querySelector('.filter-value').textContent = e.target.value;

    // Debounced filter application
    handleFilterChange();
  });

  // Category checkboxes
  document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      // Collect all checked categories
      const checked = Array.from(
        document.querySelectorAll('.checkbox-group input:checked')
      ).map(cb => cb.value);

      state.filters.categoryFilter = checked;
      handleFilterChange();
    });
  });
}

// 5. DEBOUNCE PATTERN (prevents excessive re-rendering)
let filterTimeout;
function handleFilterChange() {
  clearTimeout(filterTimeout);

  // Show loading indicator
  document.getElementById('filter-status').textContent = 'Applying filters...';

  filterTimeout = setTimeout(() => {
    const filtered = applyFilters();
    renderIncidents(filtered);

    // Update status
    document.getElementById('filter-status').textContent =
      `Showing ${filtered.length} of ${state.incidents.length} incidents`;
  }, 1000);  // 1 second delay
}

// 6. FILTER PERSISTENCE (optional - saves to localStorage)
function saveFilterState() {
  localStorage.setItem('dronewatch-filters', JSON.stringify(state.filters));
}

function loadFilterState() {
  const saved = localStorage.getItem('dronewatch-filters');
  if (saved) {
    try {
      state.filters = { ...state.filters, ...JSON.parse(saved) };
      // Update UI to match loaded state
      updateFilterUI();
    } catch (e) {
      console.error('Failed to load filter state:', e);
    }
  }
}

// 7. MOBILE OPTIMIZATION
function optimizeFiltersForMobile() {
  if (window.innerWidth < 768) {
    // Collapse filter panel by default on mobile
    document.getElementById('filter-panel').classList.add('collapsed');

    // Reduce debounce delay for better mobile responsiveness
    DEBOUNCE_DELAY = 500;  // Instead of 1000ms
  }
}

// USAGE NOTES:
// - Always debounce filter changes to prevent performance issues
// - Test with large datasets (1000+ incidents)
// - Ensure mobile performance with touch events
// - Consider filter combination edge cases
// - Add loading indicators for better UX
// - Preserve filter state across sessions when appropriate