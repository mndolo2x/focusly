# Study Lesson Generator

A web application that transforms study materials (PDFs) into structured summaries using AI.

## Features

- **PDF Upload**: Upload text-based PDFs (max 10MB, 50 pages)
- **AI-Powered Summaries**: Automatically breaks content into logical sections with bullet points
- **Page Tracking**: Each summary section references the original page range
- **Usage Limits**: Monthly document cap enforced server-side
- **Responsive Design**: Works on both desktop and mobile browsers

## Tech Stack

- **Frontend**: Next.js 14 with React, TypeScript, and Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL via Supabase
- **PDF Processing**: pdf-parse library
- **AI**: Anthropic Claude API
- **Deployment**: Vercel

## Setup Instructions

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Navigate to Project Settings > API
4. Copy:
   - Project URL
   - anon public key
   - service_role key (for server-side operations)

### 2. Get Anthropic API Key

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Generate an API key
3. Copy the key

### 3. Set up Environment Variables

For local development:
- Copy `env.example` to `.env.local`
- Fill in your credentials:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
  ANTHROPIC_API_KEY=your_anthropic_api_key
  MAX_DOCUMENT_SIZE_MB=10
  MAX_DOCUMENT_PAGES=50
  MONTHLY_USAGE_LIMIT=5
  ```

For Vercel deployment:
- Add these as environment variables in your Vercel project settings

### 4. Deploy to Vercel

1. Push this code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel project settings
4. Deploy

## Database Schema

The application uses four main tables:

- **users**: Account information and usage tracking
- **documents**: Uploaded PDFs and processing status
- **sections**: Logical sections extracted from documents
- **summary_bullets**: Bullet points for each section

See `supabase/schema.sql` for the complete schema.

## API Routes

- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate user
- `POST /api/upload` - Upload and process PDF
- `GET /api/documents?userId=X` - Get user's documents
- `GET /api/documents/[documentId]/status` - Check processing status

## Usage Limits

- Default: 5 documents per month per user
- Configurable via `MONTHLY_USAGE_LIMIT` environment variable
- Limits reset automatically each month

## Security Notes

- Passwords are hashed using bcrypt
- Claude API key is never exposed to the frontend
- Row Level Security (RLS) enabled on Supabase tables
- File size and type validation on upload

## Future Phases

Planned features for future releases:
- Quiz generation
- Audio narration
- Video lesson assembly
- Exam-specific practice papers
- Spaced repetition system
- Flashcard export

## License

MIT
