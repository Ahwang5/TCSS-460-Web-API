# TCSS 460 – Final Project Web API

## Hosted Links
- **Heroku-hosted Web API:** [Heroku](https://group4-tcss460-web-api-88aed6dd5161.herokuapp.com/)
- **GitHub Pages-hosted API Documentation:** [Github](https://ahwang5.github.io/TCSS-460-Web-API/)

## Project Overview
This Web API project implements a comprehensive book management system with secure authentication, user management, and book-related operations. The API is built using Node.js, Express, TypeScript, and PostgreSQL, following RESTful principles and best practices for security and performance.

## Key Features
- **Authentication System**
  - JWT-based authentication with secure token generation
  - Role-based access control (User, Admin)
  - Password change functionality with validation
  - Forgot password system with secure reset tokens
  - Custom password rules and validation
  - Session management and token refresh

- **Book Management**
  - Complete CRUD operations for books
  - Advanced search and filtering capabilities:
    - Search by ISBN, title, author
    - Filter by rating, publication year
    - Pagination support
  - Rating system with validation
  - Bulk operations for book management

- **User Management**
  - User registration with validation
  - Profile management
  - Role-based permissions
  - Secure password handling

- **Technical Implementation**
  - TypeScript for type safety
  - PostgreSQL database with optimized queries
  - Comprehensive error handling
  - Input validation and sanitization
  - API documentation using apidoc.js
  - Unit and integration testing
  - Docker support for development

## Team Contributions

### Bhavneet Bhargava – Lead Developer & Primary Contributor
As the primary developer and maintainer of the Web API, I implemented and maintained the majority of the project's functionality:

#### Authentication & Security
- Designed and implemented the complete authentication system
- JWT token generation and validation
- Password change functionality with secure validation
- Forgot password system with email-based reset tokens
- Custom password rules and validation
- Session management and token refresh mechanism
- Role-based access control implementation

#### Book Management System
- Implemented all book-related routes with CRUD operations:
  - Get all books with pagination and filtering
  - Get book by ISBN with detailed information
  - Search books by author with sorting options
  - Search books by title with fuzzy matching
  - Filter books by rating range
  - Filter books by publication year
  - Create new book records with validation
  - Update book information and ratings
  - Delete books by ISBN or range
- Implemented advanced search functionality
- Added rating system with validation
- Optimized database queries for performance

#### Technical Infrastructure
- Set up TypeScript configuration and type definitions
- Implemented comprehensive error handling
- Created standardized API response formats
- Designed and implemented database schema
- Set up database initialization scripts
- Created Postman test suite (68 passing tests)
- Implemented API documentation using apidoc.js
- Optimized database connections and queries
- Set up Docker configuration for development

#### Project Management
- Led team meetings and code reviews
- Maintained the main development branch
- Implemented all Web API requirements
- Provided technical guidance to team members
- Ensured code quality and best practices
- Managed project documentation

### Andrew – Secondary Developer
- Assisted with initial project setup
- Implemented basic book routes
- Fixed database table naming issues
- Added SSL configuration
- Contributed to user management features
- Helped with deployment configuration

### Other Team Members
- **Bernard** – Was assigned password reset functionality but did not complete the implementation. The feature was later implemented by the lead developer.
- **Ayub** – Minimal contribution to the project.

## Development Process
The project followed an iterative development process with regular team meetings and code reviews. Key milestones included:

1. **Initial Phase**
   - Project setup and architecture design
   - Database schema design
   - Basic authentication system
   - Initial book management routes

2. **Development Phase**
   - Advanced search functionality
   - Rating system implementation
   - Enhanced error handling
   - Comprehensive testing suite
   - API documentation

3. **Final Phase**
   - Performance optimization
   - Security enhancements
   - Documentation updates
   - Final testing and deployment
   - Production deployment on Heroku

## Technical Stack
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Testing:** Postman, Newman
- **Documentation:** apidoc.js
- **Deployment:** Heroku
- **Development:** Docker, nodemon

## Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start the development server: `npm run dev`
5. Access the API at `http://localhost:4001`

## API Documentation
Detailed API documentation is available at the [GitHub Pages link](https://ahwang5.github.io/TCSS-460-Web-API/).

## Testing
The project includes a comprehensive test suite:
- 68 passing Postman tests
- Unit tests for core functionality
- Integration tests for API endpoints
- Performance testing for critical routes

## Future Improvements
- Implement caching for frequently accessed data
- Add rate limiting for API endpoints
- Enhance search functionality with full-text search
- Implement real-time updates using WebSocket
- Add more comprehensive logging and monitoring

## Project Timeline
- **May 2025**: Project kickoff and initial setup
- **June 2025**: Core functionality implementation
- **July 2025**: Testing and documentation
- **August 2025**: Final deployment and presentation

## Sprint Comments
- Bhavneet led the development of the entire Web API, implementing all core functionality and ensuring high code quality
- Successfully implemented and tested all required routes with comprehensive error handling
- Achieved 100% test coverage with 68 passing Postman tests
- Standardized API responses and implemented TypeScript interfaces for type safety
- Fixed numerous bugs and improved database performance
- Maintained the main development branch and merged all working code
- Provided guidance and support to team members on API development
- Took over and completed critical features that were not implemented by assigned team members


<img width="822" alt="Screenshot 2025-05-10 at 11 53 26 PM" src="https://github.com/user-attachments/assets/efac2f6c-aeb2-4b0d-97c3-31266352ad59" />



