# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application that demonstrates how to use Google's Veo video generation (Veo 3, Veo 3 Fast, Veo 2) and Imagen 4 image generation models through the Gemini API. It includes an AI agent system powered by Daydreams AI framework for managing media generation workflows.

## Commands

### Development
- `npm run dev` - Start the development server on http://localhost:3000
- `npm run build` - Build the production application
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

### Dependencies
- `npm install` - Install all dependencies

## Environment Setup

The application requires `GEMINI_API_KEY` and `DREAMSROUTER_API_KEY` environment variables. These should be set in a `.env` file in the project root:
```
GEMINI_API_KEY="YOUR_API_KEY"
DREAMSROUTER_API_KEY="YOUR_API_KEY"
```

Note: Veo 3 and Imagen 4 require a paid tier Gemini API subscription.

## Architecture

### Frontend Structure
- **Main Chat Interface**: `app/page.tsx` - AI chat interface for generating images and videos
- **Agent Dashboard**: `app/agent-dashboard/page.tsx` - Management interface for agent memory, workflows, and actions
- **UI Components**: Located in `components/ui/`
  - `Composer.tsx` - Handles prompt input and generation controls
  - `VideoPlayer.tsx` - Video playback and trimming functionality
  - `ModelSelector.tsx` - Model selection interface
- **Agent Components**: Located in `components/agent/`
  - `AgentMemoryViewer.tsx` - Displays agent memory and context states
  - `WorkflowBuilder.tsx` - Visual workflow creation interface

### API Routes
All API endpoints are in `app/api/`:

#### Core Generation APIs
- **Veo Video Generation**:
  - `/api/veo/generate/route.ts` - Initiates video generation with Veo models (supports Veo 3, Veo 3 Fast, Veo 2)
  - `/api/veo/operation/route.ts` - Polls generation operation status  
  - `/api/veo/download/route.ts` - Downloads completed videos from Google's servers
- **Imagen Image Generation**:
  - `/api/imagen/generate/route.ts` - Generates 1-4 images using Imagen 4.0 model with various aspect ratios

#### Agent System APIs
- **Agent Chat & Actions**:
  - `/api/agent/chat/route.ts` - Main chat interface with AI agent, handles text messages and returns generated media
  - `/api/agent/action/route.ts` - Execute specific agent actions (generate-veo-video, generate-imagen-image, list-media, etc.)
  - `/api/agent/memory/route.ts` - GET/PATCH/DELETE agent memory and context states
  - `/api/agent/workflow/route.ts` - POST/GET/PUT workflows for multi-step generation pipelines

### State Management
- **Frontend**: React hooks for UI state in chat and dashboard components
- **Agent System**: Daydreams AI framework with composed contexts:
  - `video-project` - Main project context with videos/images arrays
  - `veo-analytics` - Tracks usage, costs, and performance metrics
  - `veo-preferences` - User settings and workflow templates
  - `media-library` - Generated content management
- **Image Storage**: File-based storage in `/public/generated-images/` with URL references to prevent context bloat
- **Memory**: Currently in-memory only (resets on page navigation)

### Key Technical Details
- **Agent Actions**: Located in `/lib/agent/actions-fixed.ts` with support for all Veo parameters
- **Image Handling**: Images saved to disk, only URLs stored in memory to prevent context bloat
- **Agent Library**: `/lib/agent/index.ts` defines contexts and composed memory structure
- **Client Interface**: `/lib/agent/client.ts` provides browser-side agent communication
- **Polling**: Operation status checked every 5 seconds for async video generation
- **TypeScript**: Configured with loose checking (`strict: false`)
- **Path alias**: `@/` maps to the project root

## Known Limitations
- **Memory Persistence**: Agent memory is in-memory only and resets on page navigation
- **Dashboard**: Shows empty data due to new agent instance creation on each page load
- **Workflow Execution**: Workflows can be created but don't execute automatically
- **Performance**: Agent adds ~20-30 seconds overhead for simple operations

## TypeScript Configuration
The project uses relaxed TypeScript settings:
- `strict: false`
- `noImplicitAny: false`
- Path alias: `@/*` → `./*`

## File Tree

```bash
.
├── CLAUDE.md
├── LICENSE
├── README.md
├── app
│   ├── agent-dashboard
│   │   └── page.tsx
│   ├── api
│   │   ├── agent
│   │   │   ├── action
│   │   │   │   └── route.ts
│   │   │   ├── chat
│   │   │   │   └── route.ts
│   │   │   ├── memory
│   │   │   │   └── route.ts
│   │   │   └── workflow
│   │   │       └── route.ts
│   │   ├── imagen
│   │   │   └── generate
│   │   │       └── route.ts
│   │   └── veo
│   │       ├── download
│   │       │   └── route.ts
│   │       ├── generate
│   │       │   └── route.ts
│   │       └── operation
│   │           └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── bun.lock
├── components
│   ├── agent
│   │   ├── AgentMemoryViewer.tsx
│   │   └── WorkflowBuilder.tsx
│   └── ui
│       ├── Composer.tsx
│       ├── ModelSelector.tsx
│       ├── VideoPlayer.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── tabs.tsx
│       └── textarea.tsx
├── components.json
├── eslint.config.mjs
├── lib
│   ├── agent
│   │   ├── actions-fixed.ts
│   │   ├── client.ts
│   │   └── index.ts
│   ├── storage
│   │   └── image-store.ts
│   └── utils.ts
├── llm.txt
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── public
└── tsconfig.json
```