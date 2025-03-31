-- Initial database schema for Sustainability Consultancy Marketplace

-- Users Table
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

-- SME Profiles Table
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

-- Consultant Profiles Table
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

-- Projects Table
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

-- Project-Consultant Matches Table
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

-- Payments Table
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

-- Reviews Table
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  project_match_id TEXT NOT NULL REFERENCES project_matches(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  reviewee_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sustainability Toolkits Table
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

-- Subscription Plans Table
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

-- User Subscriptions Table
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

-- Messages Table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id),
  receiver_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table (GDPR Compliance)
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

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, description, price, billing_cycle, features)
VALUES 
('plan_basic', 'Basic', 'Essential sustainability consulting for small businesses', 99.99, 'monthly', '["Access to marketplace", "Basic matching algorithm", "1 project per month"]'),
('plan_pro', 'Professional', 'Advanced sustainability solutions for growing businesses', 199.99, 'monthly', '["Access to marketplace", "Advanced matching algorithm", "3 projects per month", "Access to toolkits", "Priority support"]'),
('plan_enterprise', 'Enterprise', 'Comprehensive sustainability management for established businesses', 499.99, 'monthly', '["Access to marketplace", "AI-powered matching", "Unlimited projects", "Full toolkit access", "Dedicated consultant", "Custom reporting", "24/7 support"]');
