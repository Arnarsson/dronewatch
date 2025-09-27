# INITIAL.md - DroneWatch Feature Request Template

## FEATURE
<!-- Describe the feature to implement in clear, specific terms -->


## EXAMPLES
<!-- Reference code patterns from examples/ folder and explain their relevance -->

### Pattern References
- `examples/filter-pattern.js` - Shows how to add new filters
- `examples/scraper-pattern.js` - Template for new data sources
- `examples/ui-component.html` - Glassmorphism component patterns
- `examples/websocket-handler.js` - Real-time update patterns

### Implementation Notes
<!-- Explain how these examples should be adapted for this feature -->


## DOCUMENTATION

### External References
- Leaflet.js Docs: https://leafletjs.com/reference.html
- OpenRouter API: https://openrouter.ai/docs
- GeoJSON Specification: https://geojson.org/

### Internal References
- Incident Schema: See CLAUDE.md section "Critical Data Structures"
- Filter Pipeline: `index.html` lines 2800-3200
- WebSocket Handler: `automation/websocket-service.js`
- Scraper Network: `automation/scrapers/`

## OTHER CONSIDERATIONS

### Performance Impact
<!-- How will this feature affect performance? -->
- Mobile performance considerations
- Marker clustering thresholds
- API rate limiting concerns

### Data Flow Changes
<!-- Will this modify the data pipeline? -->
- Changes to incident schema
- New data sources required
- Filter modifications needed

### UI/UX Consistency
<!-- How to maintain the operations center aesthetic -->
- Glassmorphism design patterns
- Mobile-first responsive approach
- Color scheme and typography

### Testing Requirements
<!-- What tests need to be added/modified -->
- Unit tests needed
- Manual testing scenarios
- Mobile device testing

### Deployment Notes
<!-- Special deployment considerations -->
- Environment variables required
- API keys needed
- CORS configuration

---

## VALIDATION CHECKLIST
Before implementation:
- [ ] Feature doesn't break existing functionality
- [ ] Mobile performance considered
- [ ] Rate limiting respected
- [ ] Incident schema compatibility verified
- [ ] Examples folder patterns reviewed

After implementation:
- [ ] All tests pass
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Filters still work
- [ ] Map displays correctly
- [ ] WebSocket maintains connection