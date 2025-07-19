# B-Talk - Enhanced Secure Chat Application

A comprehensive real-time chat application with enhanced security, notification system, and modern UI.

## Features

### Security Enhancements
- **JWT Token Management**: Access tokens (1 hour) and refresh tokens (7 days)
- **Automatic Token Refresh**: Seamless token renewal without user interruption
- **Enhanced Error Handling**: Comprehensive exception handling and logging
- **Secure Authentication**: Proper token validation and user session management
- **UUID-based IDs**: All entities use UUID for better security and scalability
- **Email-based Authentication**: Modern email-based login instead of phone numbers

### Password Reset System
- **Forgot Password**: Email-based password reset request
- **Reset Token Security**: Secure token generation with 24-hour expiration
- **Password Validation**: Strong password requirements and validation
- **User-friendly Interface**: Intuitive password reset flow

### Notification System
- **Push Notifications**: Browser-based push notifications for messages and calls
- **Real-time Updates**: Instant notification delivery via WebSocket
- **Notification Management**: Mark as read, delete, and clear all notifications
- **Permission Handling**: Graceful permission request and management

### UI/UX Improvements
- **Icon System**: FontAwesome icons instead of emojis
- **Modern Design**: Clean, responsive design with Tailwind CSS
- **Notification Bell**: Real-time notification indicator with dropdown
- **Responsive Layout**: Mobile-friendly design

### Logging & Error Handling
- **Backend Logging**: Comprehensive logging throughout all services
- **Custom Exception Handler**: Proper HTTP status codes and error messages
- **Frontend Error Handling**: User-friendly error messages and automatic redirects

## Prerequisites

- Java 17 or higher
- Node.js 18 or higher
- MySQL 8.0 or higher
- Maven 3.6 or higher

## Installation

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Update application.properties**:
   - Configure your MySQL database connection
   - Update JWT secrets and expiration times
   - Set file upload directory

3. **Run database migration**:
   ```sql
   -- Execute the migration script in backend/src/main/resources/sql/migration-uuid-email.sql
   ```

4. **Install dependencies and run**:
   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

   The backend will start on `http://localhost:8080`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

   The frontend will start on `http://localhost:4200`

## Configuration

### Backend Configuration

Update `backend/src/main/resources/application.properties`:

```properties
# Database Configuration
spring.datasource.url=jdbc:mysql://your-database-host/btalk_db
spring.datasource.username=your-username
spring.datasource.password=your-password

# JWT Configuration
jwt.secret=your-secret-key
jwt.expiration=3600000
jwt.refresh-expiration=604800000

# File Storage
file.upload-dir=/path/to/upload/directory
```

### Frontend Configuration

Update `frontend/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api'
};
```

## Security Features

### JWT Token Management
- **Access Token**: 1 hour expiration
- **Refresh Token**: 7 days expiration
- **Automatic Refresh**: Handled by interceptor
- **Secure Storage**: Tokens stored in localStorage with proper validation

### UUID-based Security
- **All IDs**: UUID format for enhanced security
- **No Sequential IDs**: Prevents enumeration attacks
- **Scalable**: Better for distributed systems

### Password Reset Security
- **Secure Tokens**: UUID-based reset tokens
- **Time-limited**: 24-hour expiration
- **One-time Use**: Tokens invalidated after use
- **Email Validation**: Proper email format validation

### Error Handling
- **Comprehensive Logging**: All operations logged with appropriate levels
- **Exception Handling**: Custom exception handler with proper HTTP status codes
- **Validation**: Input validation with detailed error messages

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration with email
- `POST /api/auth/login` - User login with email
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread` - Get unread notifications
- `GET /api/notifications/count` - Get unread count
- `PUT /api/notifications/{id}/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/{id}` - Delete notification
- `DELETE /api/notifications` - Delete all notifications

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    user_id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    profile_photo_url VARCHAR(500),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'OFFLINE',
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(50),
    data TEXT,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

## Development

### Backend Development
- **Logging**: Comprehensive logging with different levels
- **Exception Handling**: Custom exception handler
- **Security**: JWT-based authentication with refresh tokens
- **Database**: JPA/Hibernate with MySQL and UUID support

### Frontend Development
- **Angular 19**: Latest Angular version
- **TypeScript**: Strongly typed development
- **Tailwind CSS**: Utility-first CSS framework
- **FontAwesome**: Icon library instead of emojis

## Password Reset Flow

1. **User requests password reset**:
   - Navigate to `/forgot-password`
   - Enter email address
   - System generates secure reset token

2. **Email delivery** (to be implemented):
   - System sends email with reset link
   - Link contains secure token
   - Token expires in 24 hours

3. **Password reset**:
   - User clicks email link
   - Navigate to `/reset-password?token=xxx`
   - Enter new password
   - System validates token and updates password

## Troubleshooting

### Common Issues

1. **JWT Token Expired**:
   - The system automatically refreshes tokens
   - If refresh fails, user is redirected to login

2. **Notification Permission Denied**:
   - Check browser settings
   - Click notification bell to request permission again

3. **Database Connection Issues**:
   - Verify MySQL is running
   - Check database credentials in application.properties
   - Ensure UUID support is enabled

4. **Password Reset Issues**:
   - Check email configuration
   - Verify reset token expiration
   - Ensure proper email format

### Logs
- **Backend Logs**: Located in `backend/logs/application.log`
- **Frontend Logs**: Check browser console for errors

## Security Considerations

1. **JWT Security**:
   - Tokens are validated on every request
   - Refresh tokens are rotated on each use
   - Expired tokens are automatically handled

2. **UUID Security**:
   - All IDs use UUID format
   - Prevents enumeration attacks
   - Better for distributed systems

3. **Password Reset Security**:
   - Secure token generation
   - Time-limited tokens
   - One-time use tokens

4. **Input Validation**:
   - All inputs are validated on both frontend and backend
   - SQL injection protection via JPA
   - XSS protection via Angular sanitization

5. **File Upload Security**:
   - File type validation
   - Size limits enforced
   - Secure file storage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 