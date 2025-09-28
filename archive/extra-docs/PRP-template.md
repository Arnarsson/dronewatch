# Product Requirements Prompt (PRP) Template for DroneWatch

## EXECUTIVE SUMMARY
<!-- One paragraph overview of what needs to be built and why -->


## FEATURE SPECIFICATION

### User Story
As a [user type], I want to [action/feature] so that [benefit/outcome].

### Acceptance Criteria
- [ ] Criterion 1 with specific measurable outcome
- [ ] Criterion 2 with specific measurable outcome
- [ ] Criterion 3 with specific measurable outcome

### Success Metrics
- Metric 1: [Specific measurement and target]
- Metric 2: [Specific measurement and target]
- Performance: [Page load time, response time targets]

## TECHNICAL REQUIREMENTS

### Implementation Approach
<!-- Choose one: -->
- [ ] Extend existing functionality in `index.html`
- [ ] Add new automation service in `automation/`
- [ ] Create new data source scraper
- [ ] Modify infrastructure data pipeline

### Code Architecture

#### Files to Modify
```
index.html - Lines XXX-XXX (component/function)
automation/service.js - New service file
tools/script.py - Data processing updates
```

#### Data Flow Changes
```
Current: Source → Parser → Generator → JSON → UI
New:     Source → Parser → ENHANCEMENT → Generator → JSON → UI
```

### Dependencies & Constraints
- Must maintain single-file architecture for UI
- Respect 30-second rate limiting between API calls
- Ensure mobile performance (< 3 sec load time)
- Preserve glassmorphism design aesthetic
- Maintain incident schema compatibility

## IMPLEMENTATION GUIDE

### Phase 1: Setup & Validation
```javascript
// 1. Verify existing functionality
console.log('Current state:', state);

// 2. Check dependencies
if (!window.L) throw new Error('Leaflet not loaded');

// 3. Validate data structures
validateIncidentSchema(testIncident);
```

### Phase 2: Core Implementation
```javascript
// EXAMPLE: Adding new feature to index.html

// Step 1: Add to state management
const state = {
  // existing...
  newFeature: {
    enabled: false,
    data: [],
    config: {}
  }
};

// Step 2: Create UI component (use examples/ui-component.html patterns)
function renderNewFeature() {
  const container = document.getElementById('new-feature-container');
  container.innerHTML = `
    <div class="glass-panel">
      <!-- Component HTML -->
    </div>
  `;
}

// Step 3: Implement business logic
function processNewFeature(incidents) {
  // Use patterns from examples/filter-pattern.js
  return incidents.filter(/* logic */);
}

// Step 4: Wire up event handlers
document.addEventListener('DOMContentLoaded', () => {
  initializeNewFeature();
});
```

### Phase 3: Integration
```javascript
// Connect to existing systems
integrateWithFilters();
integrateWithWebSocket();
integrateWithMap();
```

### Phase 4: Testing & Validation
```bash
# Run test suites
npm test

# Manual testing checklist
- [ ] Feature works on desktop (1920x1080)
- [ ] Feature works on mobile (375x667)
- [ ] No console errors
- [ ] Performance acceptable (< 100ms response)
- [ ] Filters still functional
- [ ] Map displays correctly
- [ ] WebSocket maintains connection
```

## VALIDATION GATES

### Pre-Implementation Checklist
- [ ] Read CLAUDE.md completely
- [ ] Review examples/ folder patterns
- [ ] Understand current data flow
- [ ] Verify development environment setup
- [ ] Check existing similar functionality

### Quality Assurance Gates

#### Gate 1: Code Quality
- [ ] Follows existing patterns
- [ ] Uses consistent naming conventions
- [ ] Properly debounced where needed
- [ ] Error handling implemented

#### Gate 2: Performance
- [ ] Mobile load time < 3 seconds
- [ ] Marker clustering works at 100+ incidents
- [ ] Smooth scrolling and interactions
- [ ] Memory usage acceptable

#### Gate 3: Functionality
- [ ] All acceptance criteria met
- [ ] Edge cases handled
- [ ] Backwards compatibility maintained
- [ ] Data integrity preserved

#### Gate 4: User Experience
- [ ] Glassmorphism aesthetic maintained
- [ ] Mobile responsive
- [ ] Accessibility standards met
- [ ] Loading states implemented

## ERROR HANDLING & RECOVERY

### Expected Errors
```javascript
// Network failures
try {
  const response = await fetch(url);
} catch (error) {
  console.error('[Feature] Network error:', error);
  showUserMessage('Unable to load data. Retrying...');
  scheduleRetry();
}

// Data validation failures
if (!validateIncident(incident)) {
  console.warn('[Feature] Invalid incident:', incident);
  continue;  // Skip invalid data
}

// Rate limiting
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After') || 30;
  await sleep(retryAfter * 1000);
}
```

### Recovery Strategies
1. **Graceful degradation**: Feature disabled but app continues
2. **Automatic retry**: With exponential backoff
3. **User notification**: Clear error messages
4. **Fallback data**: Use cached or default values

## DEPLOYMENT CONSIDERATIONS

### Environment Variables
```javascript
const config = {
  API_KEY: process.env.DRONEWATCH_API_KEY || '',
  UPDATE_INTERVAL: process.env.NODE_ENV === 'production' ? 1800000 : 300000,
  RATE_LIMIT: 30000
};
```

### Build & Deploy Steps
```bash
# Development
npm run dev

# Production build
npm run build

# Deploy
npm run vercel-build
vercel --prod
```

### Rollback Plan
1. Keep previous version tagged in git
2. Test in staging environment first
3. Monitor error rates post-deployment
4. Rollback command: `git revert HEAD && npm run deploy`

## DOCUMENTATION UPDATES

### Files to Update
- `CLAUDE.md` - Add new feature documentation
- `README.md` - Update feature list
- `INITIAL.md` - Add as example pattern
- `examples/` - Add new pattern if applicable

### Code Comments
```javascript
/**
 * Feature: [Name]
 * Purpose: [What it does]
 * Added: [Date]
 * Dependencies: [What it requires]
 *
 * Usage:
 * const result = processFeature(data);
 *
 * Notes:
 * - Respects rate limiting
 * - Mobile optimized
 * - Integrates with WebSocket for real-time updates
 */
```

## MONITORING & ANALYTICS

### Key Metrics to Track
- Feature usage rate
- Error rate
- Performance impact
- User engagement

### Logging Implementation
```javascript
// Feature-specific logging
console.log(`[FeatureName] Action:`, {
  timestamp: new Date().toISOString(),
  action: 'user_interaction',
  details: relevantData
});

// Performance monitoring
const startTime = performance.now();
// ... feature code ...
const duration = performance.now() - startTime;
if (duration > 100) {
  console.warn(`[FeatureName] Slow operation: ${duration}ms`);
}
```

## FUTURE CONSIDERATIONS

### Scalability
- How will this feature perform with 10x data?
- Can it be progressively enhanced?
- Is the implementation future-proof?

### Maintenance
- How easy is it to modify?
- Are there clear extension points?
- Is the code self-documenting?

### Integration
- Can other features build on this?
- Does it follow established patterns?
- Is it loosely coupled?

---

## PRP CHECKLIST

Before submitting to AI:
- [ ] All sections completed
- [ ] Code examples provided
- [ ] Validation gates defined
- [ ] Error handling specified
- [ ] Testing criteria clear
- [ ] Documentation requirements listed
- [ ] Rollback plan included

After AI implementation:
- [ ] All validation gates passed
- [ ] Tests executed successfully
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Deployed successfully