# PlantCare - Educational Plant Identification App

## Overview

PlantCare is an AI-powered educational plant identification application for teachers and students. It uses image recognition to identify plants, providing detailed care instructions, educational content, and propagation guidance. Teachers can create customized prompts, share class codes, and set challenges. The application features a mobile-first design inspired by Apple's Human Interface Guidelines and botanical apps, emphasizing clarity, approachability, and content-first presentation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript
- Vite for building and development
- Wouter for client-side routing
- TanStack Query for server state management

**UI Component System:**
- shadcn/ui component library on Radix UI primitives
- Tailwind CSS for styling
- Typography: Caveat (handwritten headlines), Crimson Text (body), Space Mono (numbers/scores), Inter (UI)
- Botanical design system with organic CSS variables (--soil-brown, --vine-live, --leaf-spring, --pollen-gold, --dew-blue)
- Custom color system with light/dark modes

**Landing Page Design (Light Mode):**
- Landing.tsx forces light mode on mount (removes 'dark' class, restores on unmount)
- White palette: #FFFFFF bg, #FAFAFA off-white, #E8B4BC dusty rose buttons, #B5D7B3 sage leaf accents
- Inter font throughout (weights 250–700)
- Frosted glass cards (.glass-card-white) with dusty rose hover glow
- 4 floating pollen particles (#FAD4A6 gold dots, slow drift + mouse-magnetic)
- PathAI-style LeafScannerDemo: drag-and-drop, animated scan line (.scan-line-white), CSS heatmap overlay, confidence badge
- Rose-tinted scan line animation for white theme
- SectionHeader with sandstone underline + leaf tip SVG flourish

**In-App Visual System (Dark Mode):**
- Living Leaf Shrine hero: SVG leaf with pulsing animated veins and dew drops
- Seed Germination Loader: 3.4s intro sequence shown once per session (sessionStorage)
- Idle Animations: 3 floating fireflies + periodic drifting leaves (OrganicAnimations component)
- Pollen burst micro-interaction on CTA clicks (18 radial particles)
- Sound design: Web Audio API (leaf rustle, pot tap, chime, wind gust) via useSound hook
- Moss texture background with shimmer parallax effect on hero
- Organic ease timing (--ease-organic: cubic-bezier(0.34,1.56,0.64,1))
- Vine underline link animation (.vine-link), botanical card lift (.botanical-card)
- PWA manifest at /public/manifest.json

**State Management:**
- React Query for server-side state
- React hooks for local state
- react-hook-form with Zod for form validation
- Toast notifications for user feedback

**Key Design Decisions:**
- Mobile-first responsive design
- Content-first approach
- Instant visual feedback for watering status
- Accessibility-first design

### Backend Architecture

**Server Framework:**
- Express.js REST API with TypeScript
- Dual-mode server setup (development/production)
- Custom request logging middleware
- JSON body parsing

**Database & ORM:**
- Drizzle ORM for type-safe interactions
- PostgreSQL via Neon serverless driver
- Schema-driven development with Zod validation
- Drizzle-kit for migrations

**Data Models:**
- Users, Plants, WateringHistory, PlantImages
- VisitorStats, TeacherPrompts, Challenges, ChallengeProgress

**Storage Strategy:**
- PostgreSQL database storage via Neon HTTP driver
- Google Cloud Storage for plant images

**API Design:**
- RESTful endpoints for CRUD operations
- Plant identification endpoint
- Teacher prompts with share code lookup
- Challenges with query param filtering
- JSON responses with appropriate HTTP status codes

### AI Integration

**Plant Identification Response:**
- Provides `commonName`, `species`, `genus`, `identificationLevel`, `confidence`, `photoQuality`, `description`, `lightRequirement`, `wateringFrequencyDays`, `careInstructions`, `propagationInfo`, and `educationalContent`.

**Teacher Prompt Integration:**
- Custom instructions bundled with AI requests
- Grade level and subject customization
- Propagation mode toggle

### Core Features

- **User Authentication**: Session-based login/registration with role selection (teacher/student), including native Google OAuth.
- **Plant Identification**: AI-powered identification from photos using GPT-4o Vision, providing detailed care and educational content.
- **Teacher Dashboard**: Create custom prompts, configure propagation mode, generate shareable class codes, manage classes and assignments, and view analytics.
- **Student Features**: Submit plant identifications, respond to teacher questions, track assignment progress, and join classes.
- **Classroom Management**: Full CRUD for classes, 6-character join codes, teacher-student memberships, assignments, and grading.
- **Community Forum**: Categories for discussions, reply threading, and location-based discussions.
- **AI Chatbot**: Specialized for plant care questions, identification help, and gardening advice with real-time streaming.
- **GPS Location Tracking**: Plants capture latitude, longitude, and human-readable location during identification.
- **Analytics**: Teacher dashboard with aggregate statistics, visual charts for submissions, confidence, and photo quality.
- **Navigation**: Role-aware home dashboard, global sidebar navigation, and dedicated pages for various features (e.g., /map, /whats-new, /changelog).
- **Security**: Role guard for Google users, authentication checks for API endpoints.
- **Privacy Controls**: Plants are private to the account that uploaded them (server-side filtering by studentId). Teacher prompts are scoped — teachers see only their own prompts, students see only prompts from teachers of classes they belong to. All plant API routes (CRUD, water, notes, history, map) enforce ownership via `getUserId()` helper that supports both local auth and Google OAuth. Share code lookup remains open for class enrollment.

## External Dependencies

**AI Services:**
- OpenAI GPT-4o integration via Replit AI Integrations service (Vision API).

**Cloud Storage:**
- Google Cloud Storage for plant image persistence (via Replit Sidecar authentication).

**Database:**
- Neon PostgreSQL serverless database.

**File Upload:**
- Multer middleware for handling multipart/form-data.

**Key Integration Patterns:**
- Environment-based configuration.
- Credential-free cloud service access via Replit Sidecar.
- Date manipulation using date-fns library.