# NestJS Framework Rules

## Architecture Patterns
- Follow NestJS module structure
- Use dependency injection properly
- Implement proper separation of concerns
- Use decorators appropriately
- Follow NestJS naming conventions

## Controller Best Practices
- Keep controllers thin - delegate business logic to services
- Use proper HTTP decorators (@Get, @Post, etc.)
- Implement proper request/response DTOs
- Use validation pipes for input validation
- Handle errors with proper exception filters

## Service Layer
- Implement business logic in services
- Use dependency injection for service dependencies
- Make services testable and mockable
- Use proper error handling in services
- Implement proper logging in services

## Database Integration
- Use TypeORM or Mongoose properly
- Implement proper repository patterns
- Use transactions for multi-step operations
- Handle database migrations properly
- Implement proper data validation

## Middleware and Guards
- Use guards for authentication/authorization
- Implement proper interceptors for logging
- Use pipes for data transformation
- Implement proper exception filters
- Use middleware for cross-cutting concerns

## Configuration and Environment
- Use ConfigModule for configuration management
- Implement proper environment validation
- Use feature modules for organization
- Implement proper logging configuration
- Use proper database configuration

## Testing
- Write unit tests for services
- Write integration tests for controllers
- Use proper mocking strategies
- Test both success and error scenarios
- Maintain high test coverage

## Performance
- Use proper caching strategies
- Implement proper database query optimization
- Use compression middleware
- Implement proper rate limiting
- Monitor application performance 