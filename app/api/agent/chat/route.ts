import { NextRequest, NextResponse } from "next/server";
import { getAgent, videoProjectContext } from "@/lib/agent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, projectId = 'default', userId = 'default-user' } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    const agent = await getAgent();

    // Send message to agent
    const result = await agent.send({
      context: videoProjectContext,
      args: { projectId, userId },
      input: { 
        type: "text", 
        data: message 
      }
    });

    // Process and format the response
    let response = {
      success: true,
      message: "",
      actions: [],
      metadata: {
        hasVideo: false,
        hasImage: false,
        videos: [],
        images: []
      }
    };

    // Look for action_result items which contain the actual results with data
    const actionResults = result.filter(item => item.ref === 'action_result');
    
    for (const actionResult of actionResults) {
      // Handle image generation results
      if (actionResult.name === 'generate-imagen-image' && actionResult.data?.success) {
        response.metadata.hasImage = true;
        
        // Get images from the action result data
        if (actionResult.data.images && Array.isArray(actionResult.data.images)) {
          for (const img of actionResult.data.images) {
            response.metadata.images.push({
              imageId: img.id,
              url: img.url  // This is /generated-images/[id].png
            });
          }
          response.message = `Generated ${actionResult.data.count || 1} image(s) successfully!`;
        }
      }
      // Handle video generation results
      else if (actionResult.name === 'generate-veo-video' && actionResult.data?.success) {
        response.metadata.hasVideo = true;
        response.metadata.videos.push({
          operationName: actionResult.data.operationName,
          videoId: actionResult.data.videoId,
          message: actionResult.data.message
        });
        response.message = "Video generation started. This usually takes a few minutes.";
      }
    }
    
    // Only use agent text output if we don't have a better message
    if (!response.message) {
      for (const item of result) {
        if (item.ref === 'output' && item.data) {
          let content = '';
          if (typeof item.data === 'string') {
            content = item.data;
          } else if (item.data.content) {
            content = item.data.content;
          }
          // Skip JSON-like content
          if (content && !content.startsWith('{')) {
            response.message += content + "\n";
          }
        }
      }
    }

    // If no message was generated, create a default one
    if (!response.message.trim()) {
      if (response.metadata.hasVideo) {
        response.message = "I've started generating your video. This usually takes a few minutes.";
      } else if (response.metadata.hasImage) {
        response.message = "I've generated your image.";
      } else {
        response.message = "I've processed your request.";
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in agent chat:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to process message" 
      },
      { status: 500 }
    );
  }
}