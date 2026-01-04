# AI-Powered Equipment Documentation System - POC

## Overview

This proof-of-concept demonstrates an AI-powered system that captures critical equipment knowledge from subject matter experts (SMEs) through conversational interviews and automatically generates professional operations manuals.

### The Problem

Manufacturing, pharmaceutical, and food processing facilities face a critical challenge: experienced engineers and operators are retiring, taking decades of irreplaceable equipment knowledge with them. Traditional documentation is time-consuming, often taking months to complete, and frequently gets delayed or never finished.

### The Solution

Our system conducts AI-guided voice interviews with SMEs, capturing their knowledge in natural conversation. The AI then structures this information into professional operations manuals - transforming a months-long documentation process into a 30-minute session.

## Features Implemented

### ✅ Core Functionality

- **Voice-Powered Interviews**
  - Real-time voice recording with OpenAI Whisper transcription
  - AI interviewer asks intelligent follow-up questions
  - Optional text-to-speech for AI questions (human-like interview experience)
  - Skip sections if information is unknown

- **Intelligent Interview Management**
  - Pause and resume interviews across multiple sessions
  - Track progress in real-time
  - Conversation history with timestamps
  - Interview termination with incomplete status tracking

- **Professional Document Generation**
  - AI structures conversational data into logical sections
  - Generates professional DOCX operations manuals
  - Organized sections: Overview, Critical Info, Safety, Procedures, Troubleshooting, etc.
  - Clearly marks skipped/incomplete sections
  - Professional formatting with tables, headings, and bullet points

### ✅ User Experience

- **Authentication & Security**
  - Secure Supabase authentication
  - Password reset via email
  - Row-level security (users see only their interviews)

- **Professional UI**
  - Responsive design (desktop and mobile)
  - Loading states and progress indicators
  - Error handling with user-friendly messages
  - Real-time status updates

- **Dashboard**
  - View all interviews with status badges
  - Quick stats (total, completed, in progress, terminated)
  - One-click document generation
  - Interview management (continue, delete)

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

### Backend & Services
- **Supabase** - Authentication and PostgreSQL database
- **OpenAI Whisper** - Speech-to-text transcription
- **OpenAI TTS** - Text-to-speech (optional feature)
- **Anthropic Claude Sonnet 4** - Interview AI and content structuring

### Document Generation
- **docx library** - Professional DOCX generation

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key
- Anthropic API key

### Environment Variables

Create a `.env.local` file with:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Database Setup

Run this SQL in your Supabase SQL Editor:
```sql
-- Create interviews table
create table interviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  sme_name text not null,
  sme_title text not null,
  equipment_name text not null,
  equipment_location text not null,
  current_phase integer default 1,
  status text default 'in_progress',
  conversation_history jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table interviews enable row level security;

-- RLS Policies
create policy "Users can view their own interviews"
  on interviews for select
  using (auth.uid() = user_id);

create policy "Users can create their own interviews"
  on interviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own interviews"
  on interviews for update
  using (auth.uid() = user_id);

create policy "Users can delete their own interviews"
  on interviews for delete
  using (auth.uid() = user_id);

-- Indexes
create index interviews_user_id_idx on interviews(user_id);
create index interviews_status_idx on interviews(status);
```

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage Flow

1. **Sign Up / Login** - Create account or sign in
2. **Create New Interview** - Enter equipment and SME details
3. **Conduct Interview** - Answer AI questions via voice or skip unknown sections
4. **Generate Document** - AI structures content and generates professional DOCX
5. **Download** - Save operations manual for your organization

## Known Limitations

### Current Constraints

- **Single Phase Interviews** - POC focuses on "Critical Equipment Information" phase only
- **Document Templates** - Uses AI-generated structure; custom template upload not yet implemented
- **No Editing** - Generated documents cannot be edited within the app (download and edit in Word)
- **Browser Compatibility** - Voice recording requires modern browsers (Chrome, Edge, Safari, Firefox)
- **Network Required** - All features require active internet connection

### Future Enhancements

- Multi-phase interview support (Safety, Maintenance, Troubleshooting as separate phases)
- Custom document template upload
- In-app document editor
- PDF export option
- Multi-language support
- Interview collaboration (multiple SMEs per equipment)
- Version control for documents
- Integration with existing documentation systems

## API Costs (Approximate)

Per interview (30 minutes):
- **Whisper transcription**: ~$0.36 (6 minutes of audio at $0.006/min)
- **Claude AI interview**: ~$0.15 (typical conversation)
- **Claude content structuring**: ~$0.10 (document generation)
- **TTS (optional)**: ~$0.45 (15 AI questions at $0.030/1K chars)

**Total per interview**: ~$0.60-$1.00 (depending on features used)

## Security Considerations

### Production Deployment Checklist

- [ ] Enable Supabase email confirmation
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting
- [ ] Add API key rotation schedule
- [ ] Enable audit logging
- [ ] Configure backup schedule
- [ ] Set up monitoring and alerts
- [ ] Review and test RLS policies
- [ ] Add input validation middleware
- [ ] Configure CSP headers

## License

This is a proof-of-concept demonstration. All rights reserved.

## Support

For questions or issues with this POC, please contact the development team.

---

**Built with** ❤️ **to solve the Silver Tsunami challenge in manufacturing**