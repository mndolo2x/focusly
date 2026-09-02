-- Create exam_profiles table for storing structured exam specifications
CREATE TABLE IF NOT EXISTS exam_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_name TEXT NOT NULL,
  board TEXT NOT NULL,
  subject TEXT,
  level TEXT NOT NULL,
  overall_duration_minutes INTEGER,
  total_marks INTEGER,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  style_notes_general TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exam_profiles_status ON exam_profiles(status);
CREATE INDEX IF NOT EXISTS idx_exam_profiles_exam_name ON exam_profiles(exam_name);
CREATE INDEX IF NOT EXISTS idx_exam_profiles_board ON exam_profiles(board);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exam_profiles_updated_at
  BEFORE UPDATE ON exam_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE exam_profiles IS 'Stores structured exam specifications for practice paper generation';
COMMENT ON COLUMN exam_profiles.sections IS 'JSON array of section objects with name, question_types, number_of_questions, time_minutes, marks_available, style_notes';
COMMENT ON COLUMN exam_profiles.sources IS 'JSON array of URLs or document names used for research';
COMMENT ON COLUMN exam_profiles.confidence_flags IS 'JSON array of fields the agent was not confident about';
COMMENT ON COLUMN exam_profiles.status IS 'draft = not reviewed, reviewed = human approved, published = ready for use';
