import { NextRequest, NextResponse } from "next/server";
import { getAgent, videoProjectContext } from "@/lib/agent";

// GET /api/agent/memory - Get agent memory for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default';
    const userId = searchParams.get('userId') || 'default-user';
    const contextType = searchParams.get('context'); // Optional: specific context to fetch

    const agent = await getAgent();

    // Get all context states for this project
    const contexts: Record<string, any> = {};

    // Main project context
    const projectState = await agent.getContext({
      context: videoProjectContext,
      args: { projectId, userId }
    });
    contexts.project = {
      memory: projectState.memory,
      args: projectState.args,
      id: projectState.id,
    };

    // Get composed contexts if requested
    if (!contextType || contextType === 'all') {
      // Analytics context
      try {
        const analyticsState = await agent.getContext({
          context: 'veo-analytics',
          args: { projectId }
        });
        contexts.analytics = {
          memory: analyticsState.memory,
          args: analyticsState.args,
        };
      } catch (e) {
        // Context might not exist yet
      }

      // Preferences context
      try {
        const preferencesState = await agent.getContext({
          context: 'veo-preferences',
          args: { userId }
        });
        contexts.preferences = {
          memory: preferencesState.memory,
          args: preferencesState.args,
        };
      } catch (e) {
        // Context might not exist yet
      }

      // Media library context
      try {
        const mediaState = await agent.getContext({
          context: 'media-library',
          args: { projectId }
        });
        contexts.mediaLibrary = {
          memory: mediaState.memory,
          args: mediaState.args,
        };
      } catch (e) {
        // Context might not exist yet
      }
    }

    return NextResponse.json({
      success: true,
      projectId,
      userId,
      contexts,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error fetching agent memory:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch memory" 
      },
      { status: 500 }
    );
  }
}

// PATCH /api/agent/memory - Update agent memory
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, userId, contextType, updates } = body;

    if (!projectId || !userId) {
      return NextResponse.json(
        { success: false, error: "projectId and userId are required" },
        { status: 400 }
      );
    }

    const agent = await getAgent();

    // Determine which context to update
    let contextState;
    
    switch (contextType) {
      case 'project':
      case 'video-project':
        contextState = await agent.getContext({
          context: videoProjectContext,
          args: { projectId, userId }
        });
        break;
        
      case 'analytics':
      case 'veo-analytics':
        contextState = await agent.getContext({
          context: 'veo-analytics',
          args: { projectId }
        });
        break;
        
      case 'preferences':
      case 'veo-preferences':
        contextState = await agent.getContext({
          context: 'veo-preferences',
          args: { userId }
        });
        break;
        
      case 'media':
      case 'media-library':
        contextState = await agent.getContext({
          context: 'media-library',
          args: { projectId }
        });
        break;
        
      default:
        // Default to project context
        contextState = await agent.getContext({
          context: videoProjectContext,
          args: { projectId, userId }
        });
    }

    // Apply updates to memory
    if (updates && typeof updates === 'object') {
      Object.assign(contextState.memory, updates);
      await contextState.save();
    }

    return NextResponse.json({
      success: true,
      contextType: contextType || 'project',
      memory: contextState.memory,
      message: "Memory updated successfully",
    });
  } catch (error) {
    console.error("Error updating agent memory:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to update memory" 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/agent/memory - Clear agent memory for a project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default';
    const userId = searchParams.get('userId') || 'default-user';
    const contextType = searchParams.get('context'); // Optional: specific context to clear

    const agent = await getAgent();

    if (contextType) {
      // Clear specific context
      let contextState;
      
      switch (contextType) {
        case 'analytics':
          contextState = await agent.getContext({
            context: 'veo-analytics',
            args: { projectId }
          });
          contextState.memory = {
            events: [],
            costs: { totalVideos: 0, totalImages: 0, estimatedCost: 0 },
            performance: { averageVideoTime: 0, averageImageTime: 0, failureRate: 0 }
          };
          break;
          
        case 'media':
          contextState = await agent.getContext({
            context: 'media-library',
            args: { projectId }
          });
          contextState.memory = { videos: [], images: [], collections: [] };
          break;
          
        default:
          return NextResponse.json(
            { success: false, error: "Invalid context type for deletion" },
            { status: 400 }
          );
      }
      
      await contextState.save();
    } else {
      // Clear all contexts for this project
      await agent.callAction('clear-project', { confirm: true });
    }

    return NextResponse.json({
      success: true,
      message: contextType ? `${contextType} context cleared` : "All project data cleared",
    });
  } catch (error) {
    console.error("Error clearing agent memory:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to clear memory" 
      },
      { status: 500 }
    );
  }
}