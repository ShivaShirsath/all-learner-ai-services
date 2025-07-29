# Backend Common Rules

## API Design
- Use RESTful conventions for API endpoints
- Implement proper HTTP status codes
- Use consistent response formats
- Version your APIs appropriately
- Document APIs with OpenAPI/Swagger

## Database Operations
- Use transactions for multi-step operations
- Implement proper indexing strategies
- Handle database connection pooling
- Use parameterized queries to prevent SQL injection
- Implement proper data validation at the database level

## Logging and Monitoring
- Implement structured logging
- Log important business events
- Monitor application performance
- Set up alerting for critical issues
- Use correlation IDs for request tracing

## Configuration Management
- Use environment-specific configuration files
- Never commit sensitive data to version control
- Use configuration validation
- Implement feature flags for gradual rollouts
- Use secrets management for sensitive data

## Caching Strategy
- Cache frequently accessed data
- Implement cache invalidation strategies
- Use appropriate cache TTL values
- Monitor cache hit rates
- Implement cache warming for critical data

## Rate Limiting and Security
- Implement rate limiting for API endpoints
- Use HTTPS for all communications
- Implement proper CORS policies
- Validate and sanitize all inputs
- Use secure session management 