-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  monthly_usage_count INTEGER DEFAULT 0,
  usage_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 month'
);

-- Documents table
CREATE TABLE documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'processing',
  error_message TEXT,
  CONSTRAINT valid_status CHECK (status IN ('processing', 'complete', 'failed'))
);

-- Sections table
CREATE TABLE sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  order_index INTEGER NOT NULL,
  source_page_start INTEGER NOT NULL,
  source_page_end INTEGER NOT NULL
);

-- Summary bullets table
CREATE TABLE summary_bullets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- Create a view for backward compatibility with 'bullets' alias
CREATE OR REPLACE VIEW bullets AS
SELECT * FROM summary_bullets;

-- Create indexes for better performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_sections_document_id ON sections(document_id);
CREATE INDEX idx_bullets_section_id ON summary_bullets(section_id);

-- Note: Row Level Security (RLS) is not enabled for this implementation
-- Security is handled server-side through API routes using the service role key
-- If you want to enable RLS later with Supabase Auth, you'll need to modify these policies
