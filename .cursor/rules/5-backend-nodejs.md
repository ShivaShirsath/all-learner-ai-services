# Node.js Backend Rules

## TypeScript Best Practices
- Use strict TypeScript configuration
- Define proper interfaces and types
- Avoid using `any` type - use proper typing
- Use enums for constants
- Implement proper error types
- Use utility types like Partial, Pick, Omit

## Async/Await Patterns
- Always use async/await instead of callbacks
- Handle promise rejections properly
- Use Promise.all for parallel operations
- Implement proper error boundaries
- Use try-catch blocks for async operations

## Module Organization
- Use ES6 modules (import/export)
- Organize code into logical modules
- Use barrel exports for clean imports
- Implement proper dependency injection
- Separate concerns into different modules

## Performance Optimization
- Use streams for large data processing
- Implement proper memory management
- Use clustering for CPU-intensive tasks
- Optimize event loop usage
- Use appropriate data structures

## Package Management
- Keep dependencies up to date
- Use exact versions for critical packages
- Audit dependencies regularly
- Use package-lock.json for reproducible builds
- Minimize bundle size

## Environment and Configuration
- Use dotenv for environment variables
- Validate environment configuration
- Use different configs for different environments
- Implement proper secrets management
- Use configuration validation libraries 