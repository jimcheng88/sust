# Sustainability Consultancy Marketplace - System Architecture

## Overview

This document outlines the system architecture for a sustainability consultancy marketplace tailored for Small and Medium-sized Enterprises (SMEs). The platform connects SMEs with sustainability consultants across various domains and facilitates end-to-end engagement from needs assessment to project completion.

## System Requirements

- **Platform Type**: SaaS (Software as a Service)
- **Framework**: Next.js
- **Authentication**: Enterprise-level with multi-factor authentication
- **Payment Processing**: Stripe integration
- **Design**: Clean and uncluttered color scheme
- **Privacy Standards**: GDPR compliance
- **Matching Algorithm**: Advanced AI-based recommendations
- **Analytics**: Cross-platform dashboards for both SMEs and consultants

## Architecture Components

### 1. Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  user_type TEXT NOT NULL, -- 'sme' or 'consultant'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret TEXT,
  profile_complete BOOLEAN DEFAULT FALSE
);
```

#### SME Profiles Table
```sql
CREATE TABLE sme_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  company_size TEXT NOT NULL,
  location TEXT NOT NULL,
  sustainability_goals TEXT,
  budget_range TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Consultant Profiles Table
```sql
CREATE TABLE consultant_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  full_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  bio TEXT NOT NULL,
  expertise JSON NOT NULL, -- Array of expertise areas
  experience_years INTEGER NOT NULL,
  certifications JSON, -- Array of certifications
  hourly_rate DECIMAL(10,2),
  availability TEXT,
  location TEXT,
  languages JSON, -- Array of languages
  portfolio_links JSON, -- Array of portfolio links
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Projects Table
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  sme_id TEXT NOT NULL REFERENCES sme_profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  budget DECIMAL(10,2),
  deadline TIMESTAMP,
  status TEXT NOT NULL, -- 'open', 'in_progress', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Project-Consultant Matches Table
```sql
CREATE TABLE project_matches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  consultant_id TEXT NOT NULL REFERENCES consultant_profiles(id),
  match_score DECIMAL(5,2) NOT NULL, -- AI-generated match score
  status TEXT NOT NULL, -- 'pending', 'accepted', 'rejected', 'completed'
  proposal TEXT,
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Payments Table
```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  project_match_id TEXT NOT NULL REFERENCES project_matches(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  stripe_payment_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Reviews Table
```sql
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  project_match_id TEXT NOT NULL REFERENCES project_matches(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  reviewee_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Sustainability Toolkits Table
```sql
CREATE TABLE toolkits (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  creator_id TEXT NOT NULL REFERENCES consultant_profiles(id),
  file_url TEXT NOT NULL,
  preview_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Subscription Plans Table
```sql
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  billing_cycle TEXT NOT NULL, -- 'monthly', 'quarterly', 'annually'
  features JSON NOT NULL, -- Array of features
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### User Subscriptions Table
```sql
CREATE TABLE user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Messages Table
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id),
  receiver_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Audit Logs Table (GDPR Compliance)
```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSON,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/mfa/setup` - Setup MFA
- `POST /api/auth/mfa/verify` - Verify MFA code
- `POST /api/auth/password/reset` - Request password reset
- `POST /api/auth/password/update` - Update password

#### User Profiles
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `GET /api/users/:id` - Get user by ID (limited info)
- `DELETE /api/users/me` - Delete account (GDPR compliance)

#### SME Profiles
- `POST /api/sme/profile` - Create SME profile
- `GET /api/sme/profile` - Get SME profile
- `PUT /api/sme/profile` - Update SME profile
- `GET /api/sme/dashboard` - Get SME dashboard data

#### Consultant Profiles
- `POST /api/consultants/profile` - Create consultant profile
- `GET /api/consultants/profile` - Get consultant profile
- `PUT /api/consultants/profile` - Update consultant profile
- `GET /api/consultants/dashboard` - Get consultant dashboard data
- `GET /api/consultants` - List consultants (with filters)
- `GET /api/consultants/:id` - Get consultant by ID

#### Projects
- `POST /api/projects` - Create new project
- `GET /api/projects` - List projects (filtered by user)
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Matching
- `GET /api/projects/:id/matches` - Get matches for a project
- `POST /api/projects/:id/matches/:consultantId` - Create match manually
- `PUT /api/matches/:id/status` - Update match status
- `POST /api/matches/:id/proposal` - Submit proposal for match

#### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/webhook` - Stripe webhook endpoint
- `GET /api/payments/history` - Get payment history

#### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/user/:userId` - Get reviews for user
- `GET /api/reviews/project/:projectId` - Get reviews for project

#### Toolkits
- `POST /api/toolkits` - Create toolkit
- `GET /api/toolkits` - List toolkits (with filters)
- `GET /api/toolkits/:id` - Get toolkit by ID
- `PUT /api/toolkits/:id` - Update toolkit
- `DELETE /api/toolkits/:id` - Delete toolkit
- `POST /api/toolkits/:id/purchase` - Purchase toolkit

#### Subscriptions
- `GET /api/subscriptions/plans` - List subscription plans
- `POST /api/subscriptions/subscribe` - Subscribe to plan
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Cancel subscription

#### Messages
- `POST /api/messages` - Send message
- `GET /api/messages` - List messages (with filters)
- `PUT /api/messages/:id/read` - Mark message as read

#### Analytics
- `GET /api/analytics/sme` - Get SME analytics
- `GET /api/analytics/consultant` - Get consultant analytics

#### GDPR Compliance
- `GET /api/gdpr/data-export` - Export user data (GDPR compliance)
- `POST /api/gdpr/data-deletion` - Request data deletion

### 3. Authentication Flow

1. **Registration**:
   - User submits registration form with email, password, and user type
   - System validates input and creates user account
   - Email verification sent to user
   - User verifies email to activate account

2. **Login**:
   - User submits email and password
   - System validates credentials
   - If MFA is enabled, system prompts for MFA code
   - User submits MFA code
   - System validates MFA code and issues JWT token
   - User is redirected to appropriate dashboard

3. **MFA Setup**:
   - User initiates MFA setup from account settings
   - System generates QR code for authenticator app
   - User scans QR code and enters verification code
   - System validates code and enables MFA

4. **Password Reset**:
   - User requests password reset
   - System sends password reset link to user's email
   - User clicks link and enters new password
   - System updates password

### 4. Component Structure

#### Shared Components
- `AuthLayout` - Layout for authentication pages
- `DashboardLayout` - Layout for dashboard pages
- `Navbar` - Navigation bar
- `Footer` - Footer component
- `Button` - Reusable button component
- `Input` - Form input component
- `Select` - Dropdown select component
- `Modal` - Modal dialog component
- `Card` - Card component for displaying content
- `Table` - Table component for displaying data
- `Pagination` - Pagination component
- `Alert` - Alert component for notifications
- `Badge` - Badge component for status indicators
- `Avatar` - User avatar component
- `Rating` - Star rating component
- `Tabs` - Tabbed interface component
- `FileUpload` - File upload component
- `RichTextEditor` - Rich text editor component
- `DatePicker` - Date picker component
- `Chart` - Chart component for analytics

#### Page Components
- `HomePage` - Landing page
- `RegisterPage` - User registration
- `LoginPage` - User login
- `MfaSetupPage` - MFA setup
- `PasswordResetPage` - Password reset
- `SMEDashboardPage` - SME dashboard
- `ConsultantDashboardPage` - Consultant dashboard
- `ProfilePage` - User profile
- `ProjectListPage` - List of projects
- `ProjectDetailPage` - Project details
- `ConsultantListPage` - List of consultants
- `ConsultantDetailPage` - Consultant details
- `MatchesPage` - Project matches
- `ProposalPage` - Proposal submission
- `PaymentPage` - Payment processing
- `ToolkitListPage` - List of toolkits
- `ToolkitDetailPage` - Toolkit details
- `SubscriptionPage` - Subscription management
- `MessagesPage` - User messages
- `AnalyticsPage` - Analytics dashboard
- `SettingsPage` - User settings
- `GdprPage` - GDPR compliance

### 5. AI Recommendation System

The AI recommendation system will match SMEs with consultants based on:

1. **Data Collection**:
   - SME profile data (industry, company size, sustainability goals)
   - Project requirements (expertise needed, budget, timeline)
   - Consultant profile data (expertise, experience, certifications)
   - Historical performance data (ratings, reviews, project completion)

2. **Feature Engineering**:
   - Text embedding of project descriptions and consultant expertise
   - Categorical encoding of industries and expertise areas
   - Numerical scaling of experience years and ratings

3. **Matching Algorithm**:
   - Cosine similarity between project requirements and consultant expertise
   - Weighted scoring based on:
     - Expertise match (40%)
     - Industry experience (20%)
     - Availability (15%)
     - Rating and reviews (15%)
     - Budget alignment (10%)

4. **Ranking and Presentation**:
   - Rank consultants by match score
   - Present top matches to SME with match percentage
   - Allow filtering and sorting of matches

5. **Feedback Loop**:
   - Collect data on which matches result in successful projects
   - Use feedback to improve matching algorithm
   - Periodically retrain model with new data

### 6. Payment Processing

1. **Stripe Integration**:
   - Create Stripe customer for each user
   - Store Stripe customer ID in user profile
   - Use Stripe Elements for secure payment form
   - Implement Stripe webhook for payment events

2. **Payment Flows**:
   - Project payment (milestone-based or full payment)
   - Toolkit purchase (one-time payment)
   - Subscription payment (recurring)

3. **Escrow System**:
   - Hold payment in escrow until project milestone completion
   - Release payment to consultant upon SME approval
   - Handle disputes and refunds

### 7. GDPR Compliance

1. **Data Collection and Consent**:
   - Clear privacy policy
   - Explicit consent for data collection
   - Cookie consent banner

2. **Data Access and Portability**:
   - Allow users to download their data
   - Provide transparency on data usage

3. **Data Deletion**:
   - Allow users to request account deletion
   - Implement data anonymization for deleted accounts

4. **Data Security**:
   - Encrypt sensitive data
   - Implement access controls
   - Maintain audit logs

5. **Data Breach Notification**:
   - Implement data breach detection
   - Prepare notification templates

### 8. Mobile Responsiveness

The application will be designed with a mobile-first approach to ensure optimal user experience across devices:

1. **Responsive Design**:
   - Fluid layouts
   - Breakpoints for different screen sizes
   - Touch-friendly UI elements

2. **Progressive Web App (PWA)**:
   - Offline capabilities
   - Add to home screen
   - Push notifications

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API routes, Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Authentication**: NextAuth.js with MFA support
- **Payment Processing**: Stripe
- **AI/ML**: TensorFlow.js or similar for recommendation engine
- **Analytics**: Custom analytics dashboard with Recharts
- **Deployment**: Cloudflare Pages

## Security Considerations

1. **Authentication**:
   - JWT with short expiration
   - Refresh token rotation
   - MFA implementation
   - CSRF protection

2. **Data Protection**:
   - Data encryption at rest
   - TLS for data in transit
   - Input validation
   - Output encoding

3. **API Security**:
   - Rate limiting
   - Request validation
   - Proper error handling
   - API versioning

4. **Infrastructure Security**:
   - Regular security updates
   - Dependency scanning
   - Security headers
   - Content Security Policy

## Scalability Considerations

1. **Database Scaling**:
   - Efficient indexing
   - Query optimization
   - Connection pooling

2. **Application Scaling**:
   - Stateless design
   - Caching strategies
   - Efficient resource utilization

3. **Load Balancing**:
   - Distribute traffic across instances
   - Health checks
   - Failover mechanisms

## Monitoring and Analytics

1. **Performance Monitoring**:
   - Page load times
   - API response times
   - Error rates

2. **User Analytics**:
   - User engagement
   - Conversion rates
   
(Content truncated due to size limit. Use line ranges to read in chunks)