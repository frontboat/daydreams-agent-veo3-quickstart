import { NextRequest, NextResponse } from "next/server";
import { getAgent, videoProjectContext } from "@/lib/agent";

// POST /api/agent/action - Execute an agent action
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      projectId = 'default', 
      userId = 'default-user', 
      actionName, 
      params = {} 
    } = body;

    if (!actionName) {
      return NextResponse.json(
        { success: false, error: "actionName is required" },
        { status: 400 }
      );
    }

    const agent = await getAgent();

    // Send the action to the agent in the context of the project
    const result = await agent.send({
      context: videoProjectContext,
      args: { projectId, userId },
      action: {
        name: actionName,
        params,
      }
    });

    // Extract the action result
    const actionResult = result.find(r => r.ref === 'action_call' && r.name === actionName);
    
    if (actionResult && 'result' in actionResult) {
      return NextResponse.json({
        success: true,
        result: actionResult.result,
        actionName,
        projectId,
        userId,
      });
    }

    // If no specific result, return the full result
    return NextResponse.json({
      success: true,
      result,
      actionName,
      projectId,
      userId,
    });
  } catch (error) {
    console.error("Error executing agent action:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to execute action" 
      },
      { status: 500 }
    );
  }
}

// GET /api/agent/action - List available actions
export async function GET(request: NextRequest) {
  try {
    const agent = await getAgent();
    
    // Get the list of available actions
    // This would need to be implemented in the agent library
    // For now, return a hardcoded list
    const actions = [
      // From veoActions
      { name: "generate-veo-video", description: "Generate a video using Google's Veo 3 model" },
      { name: "check-video-status", description: "Check the status of a video generation operation" },
      { name: "generate-imagen-image", description: "Generate an image using Google's Imagen 4.0 model" },
      { name: "execute-workflow-step", description: "Execute a single step in a workflow" },
      { name: "list-media", description: "List all media in the current project" },
      { name: "clear-project", description: "Clear all media from the current project" },
      
      // From context actions
      { name: "start-workflow", description: "Start a new video generation workflow" },
      { name: "track-generation", description: "Track a generation event" },
      { name: "update-video-preferences", description: "Update video generation preferences" },
      { name: "save-workflow-template", description: "Save a workflow as a reusable template" },
      { name: "add-video", description: "Add a video to the library" },
      { name: "update-video-status", description: "Update the status of a video" },
      { name: "add-image", description: "Add an image to the library" },
    ];

    return NextResponse.json({
      success: true,
      actions,
      count: actions.length,
    });
  } catch (error) {
    console.error("Error listing actions:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to list actions" 
      },
      { status: 500 }
    );
  }
}