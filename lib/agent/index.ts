import { createDreams, context, action, service } from "@daydreamsai/core";
import { dreamsrouter } from "@daydreamsai/ai-sdk-provider";
import { GoogleGenAI } from "@google/genai";
import * as z from "zod";
import { veoActions } from "./actions-fixed";

// Initialize Gemini client for Veo operations
const geminiClient = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY! 
});

// Service for managing Veo/Imagen API connections
const veoService = service({
  name: "veo",
  register: (container) => {
    container.singleton("geminiClient", () => geminiClient);
  },
  boot: async (container) => {
    console.log("✅ Veo 3 service ready");
  }
});

// ============================================
// ANALYTICS CONTEXT - Tracks usage and costs
// ============================================
interface AnalyticsMemory {
  events: Array<{
    type: 'video_generated' | 'image_generated' | 'workflow_completed' | 'preference_changed';
    timestamp: number;
    data?: any;
  }>;
  costs: {
    totalVideos: number;
    totalImages: number;
    estimatedCost: number; // in cents
  };
  performance: {
    averageVideoTime: number; // in seconds
    averageImageTime: number;
    failureRate: number;
  };
}

const analyticsContext = context({
  type: "veo-analytics",
  schema: z.object({
    projectId: z.string(),
  }),
  create: (): AnalyticsMemory => ({
    events: [],
    costs: {
      totalVideos: 0,
      totalImages: 0,
      estimatedCost: 0,
    },
    performance: {
      averageVideoTime: 0,
      averageImageTime: 0,
      failureRate: 0,
    }
  }),
  render: (state) => `
    Analytics for project: ${state.args.projectId}
    Total Videos: ${state.memory.costs.totalVideos}
    Total Images: ${state.memory.costs.totalImages}
    Estimated Cost: $${(state.memory.costs.estimatedCost / 100).toFixed(2)}
    Recent Events: ${state.memory.events.slice(-3).map(e => e.type).join(', ')}
  `.trim(),
}).setActions([
  action({
    name: "track-generation",
    description: "Track a generation event",
    schema: z.object({
      type: z.enum(['video', 'image']),
      success: z.boolean(),
      duration: z.number().optional(),
    }),
    handler: async ({ type, success, duration }, ctx) => {
      const eventType = type === 'video' ? 'video_generated' : 'image_generated';
      ctx.memory.events.push({
        type: eventType,
        timestamp: Date.now(),
        data: { success, duration }
      });
      
      if (success) {
        if (type === 'video') {
          ctx.memory.costs.totalVideos++;
          ctx.memory.costs.estimatedCost += 50; // 50 cents per video
          if (duration) {
            const avg = ctx.memory.performance.averageVideoTime;
            const count = ctx.memory.costs.totalVideos;
            ctx.memory.performance.averageVideoTime = (avg * (count - 1) + duration) / count;
          }
        } else {
          ctx.memory.costs.totalImages++;
          ctx.memory.costs.estimatedCost += 10; // 10 cents per image
        }
      }
      
      return { tracked: true };
    },
  }),
]);

// ============================================
// PREFERENCES CONTEXT - User settings
// ============================================
interface PreferencesMemory {
  videoSettings: {
    aspectRatio: '16:9' | '9:16' | '1:1';
    model: string;
    defaultNegativePrompt?: string;
    preferredStyle?: string;
  };
  imageSettings: {
    preferredModel?: string;
    defaultStyle?: string;
  };
  workflowTemplates: Array<{
    name: string;
    steps: any[];
  }>;
}

const preferencesContext = context({
  type: "veo-preferences",
  schema: z.object({
    userId: z.string(),
  }),
  create: (): PreferencesMemory => ({
    videoSettings: {
      aspectRatio: '16:9',
      model: 'veo-3.0-generate-preview',
    },
    imageSettings: {},
    workflowTemplates: [],
  }),
  render: (state) => `
    User Preferences: ${state.args.userId}
    Video: ${state.memory.videoSettings.aspectRatio} @ ${state.memory.videoSettings.model}
    ${state.memory.videoSettings.preferredStyle ? `Style: ${state.memory.videoSettings.preferredStyle}` : ''}
    Templates: ${state.memory.workflowTemplates.length} saved
  `.trim(),
}).setActions([
  action({
    name: "update-video-preferences",
    description: "Update video generation preferences",
    schema: z.object({
      aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional(),
      model: z.string().optional(),
      negativePrompt: z.string().optional(),
      style: z.string().optional(),
    }),
    handler: async (params, ctx) => {
      Object.assign(ctx.memory.videoSettings, params);
      return { updated: true, preferences: ctx.memory.videoSettings };
    },
  }),
  action({
    name: "save-workflow-template",
    description: "Save a workflow as a reusable template",
    schema: z.object({
      name: z.string(),
      steps: z.array(z.any()),
    }),
    handler: async ({ name, steps }, ctx) => {
      ctx.memory.workflowTemplates.push({ name, steps });
      return { saved: true, templateCount: ctx.memory.workflowTemplates.length };
    },
  }),
]);

// ============================================
// MEDIA LIBRARY CONTEXT - Generated content
// ============================================
interface MediaLibraryMemory {
  videos: Array<{
    id: string;
    prompt: string;
    url?: string;
    status: 'generating' | 'ready' | 'failed';
    operationName?: string;
    createdAt: number;
    metadata?: any;
  }>;
  images: Array<{
    id: string;
    prompt: string;
    url?: string;  // Changed from data to url
    createdAt: number;
  }>;
  collections: Array<{
    name: string;
    videoIds: string[];
    imageIds: string[];
  }>;
}

const mediaLibraryContext = context({
  type: "media-library",
  schema: z.object({
    projectId: z.string(),
  }),
  create: (): MediaLibraryMemory => ({
    videos: [],
    images: [],
    collections: [],
  }),
  render: (state) => `
    Media Library: ${state.args.projectId}
    Videos: ${state.memory.videos.length} (${state.memory.videos.filter(v => v.status === 'ready').length} ready)
    Images: ${state.memory.images.length}
    Collections: ${state.memory.collections.length}
  `.trim(),
}).setActions([
  action({
    name: "add-video",
    description: "Add a video to the library",
    schema: z.object({
      prompt: z.string(),
      operationName: z.string(),
    }),
    handler: async ({ prompt, operationName }, ctx) => {
      const video = {
        id: crypto.randomUUID(),
        prompt,
        operationName,
        status: 'generating' as const,
        createdAt: Date.now(),
      };
      ctx.memory.videos.push(video);
      return { videoId: video.id };
    },
  }),
  action({
    name: "update-video-status",
    description: "Update the status of a video",
    schema: z.object({
      videoId: z.string(),
      status: z.enum(['generating', 'ready', 'failed']),
      url: z.string().optional(),
    }),
    handler: async ({ videoId, status, url }, ctx) => {
      const video = ctx.memory.videos.find(v => v.id === videoId);
      if (video) {
        video.status = status;
        if (url) video.url = url;
      }
      return { updated: !!video };
    },
  }),
  action({
    name: "add-image",
    description: "Add an image to the library",
    schema: z.object({
      prompt: z.string(),
      url: z.string(),  // Changed from data to url
    }),
    handler: async ({ prompt, url }, ctx) => {
      const image = {
        id: crypto.randomUUID(),
        prompt,
        url,  // Store URL instead of data
        createdAt: Date.now(),
      };
      ctx.memory.images.push(image);
      return { imageId: image.id };
    },
  }),
]);

// ============================================
// MAIN VIDEO PROJECT CONTEXT - Orchestrates everything
// ============================================
interface VideoProjectMemory {
  projectName: string;
  description?: string;
  activeWorkflows: Array<{
    id: string;
    name: string;
    steps: Array<{
      type: string;
      status: 'pending' | 'active' | 'completed' | 'failed';
      result?: any;
    }>;
    startedAt: number;
  }>;
  sessionCount: number;
  // Add media arrays directly to main context for simple access
  videos: Array<{
    id: string;
    prompt: string;
    url?: string;
    status: 'generating' | 'ready' | 'failed';
    operationName?: string;
    createdAt: number;
  }>;
  images: Array<{
    id: string;
    prompt: string;
    url: string;
    createdAt: number;
  }>;
}

export const videoProjectContext = context({
  type: "video-project",
  schema: z.object({ 
    projectId: z.string().describe("Unique project identifier"),
    userId: z.string().describe("User who owns this project")
  }),
  key: ({ projectId, userId }) => `${userId}-${projectId}`,
  create: (): VideoProjectMemory => ({
    projectName: "Untitled Project",
    sessionCount: 0,
    activeWorkflows: [],
    videos: [],
    images: [],
  }),
  render: (state) => `
    Video Project: ${state.memory.projectName} (${state.args.projectId})
    User: ${state.args.userId}
    Sessions: ${state.memory.sessionCount}
    Active Workflows: ${state.memory.activeWorkflows.length}
    Videos: ${state.memory.videos.length} | Images: ${state.memory.images.length}
  `.trim(),
  instructions: `You are an AI assistant specialized in video and image generation using Google's models.
    
    Available Veo models:
    - veo-3.0-generate-preview: 8-second 720p videos with audio, cinematic quality, 16:9 only
    - veo-3.0-fast-generate-preview: Faster generation with audio, 16:9 only  
    - veo-2.0-generate-001: No audio, supports 16:9 and 9:16, can generate 2 videos at once
    
    Imagen 4.0 can generate 1-4 images with various aspect ratios.
    
    You have access to analytics tracking, user preferences, and a media library for content management.`,
  onRun: async (ctx) => {
    ctx.memory.sessionCount++;
  },
})
// Compose all the contexts together!
.use((state) => [
  { context: analyticsContext, args: { projectId: state.args.projectId } },
  { context: preferencesContext, args: { userId: state.args.userId } },
  { context: mediaLibraryContext, args: { projectId: state.args.projectId } },
])
.setActions([
  ...veoActions, // Include all actions from actions.ts
  action({
    name: "start-workflow",
    description: "Start a new video generation workflow",
    schema: z.object({
      name: z.string(),
      steps: z.array(z.object({
        type: z.enum(['generate-image', 'generate-video', 'wait', 'transform']),
        params: z.any(),
      })),
    }),
    handler: async ({ name, steps }, ctx) => {
      const workflow = {
        id: crypto.randomUUID(),
        name,
        steps: steps.map(s => ({ ...s, status: 'pending' as const })),
        startedAt: Date.now(),
      };
      ctx.memory.activeWorkflows.push(workflow);
      
      // Note: Workflow execution would need to be handled separately
      // For now, just record the workflow
      
      return { 
        workflowId: workflow.id, 
        message: `Workflow "${name}" created with ${steps.length} steps. Execute steps individually or use the workflow builder.` 
      };
    },
  }),
]);

// Create and export the agent instance
let agentInstance: ReturnType<typeof createDreams> | null = null;

export async function getAgent() {
  if (!agentInstance) {
    agentInstance = createDreams({
      model: dreamsrouter("openai/gpt-4o"), // Using dreamsrouter for non-Veo requests
      contexts: [videoProjectContext], // Only need to specify the main context
      services: [veoService],
      inputs: {
        text: {
          description: "User text input",
          schema: z.string(),
        }
      },
      outputs: {
        text: {
          description: "Text response to the user",
          schema: z.string(),
        }
      },
    });
    
    // Start the agent
    await agentInstance.start();
    console.log("🤖 Video Generation Agent initialized with composed contexts:");
    console.log("  - Analytics Context (tracking & costs)");
    console.log("  - Preferences Context (user settings)");
    console.log("  - Media Library Context (content management)");
    console.log("  - Video Project Context (main orchestrator)");
  }
  
  return agentInstance;
}

// Helper function to get or create a project context
export async function getProjectContext(projectId: string, userId: string) {
  const agent = await getAgent();
  return agent.getContext({
    context: videoProjectContext,
    args: { projectId, userId }
  });
}