import { NextRequest, NextResponse } from "next/server";
import { getAgent, videoProjectContext } from "@/lib/agent";

// POST /api/agent/workflow - Create and start a workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      projectId = 'default', 
      userId = 'default-user', 
      workflow 
    } = body;

    if (!workflow || !workflow.name || !workflow.steps) {
      return NextResponse.json(
        { success: false, error: "workflow with name and steps is required" },
        { status: 400 }
      );
    }

    const agent = await getAgent();

    // Start the workflow using the agent action
    const result = await agent.send({
      context: videoProjectContext,
      args: { projectId, userId },
      action: {
        name: "start-workflow",
        params: {
          name: workflow.name,
          steps: workflow.steps,
        }
      }
    });

    // Extract the workflow result
    const actionResult = result.find(r => r.ref === 'action_call' && r.name === 'start-workflow');
    
    if (actionResult && 'result' in actionResult) {
      return NextResponse.json({
        success: true,
        ...actionResult.result,
        projectId,
        userId,
      });
    }

    return NextResponse.json({
      success: true,
      result,
      projectId,
      userId,
    });
  } catch (error) {
    console.error("Error starting workflow:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to start workflow" 
      },
      { status: 500 }
    );
  }
}

// GET /api/agent/workflow - Get active workflows
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default';
    const userId = searchParams.get('userId') || 'default-user';

    const agent = await getAgent();

    // Get the project context
    const projectState = await agent.getContext({
      context: videoProjectContext,
      args: { projectId, userId }
    });

    const activeWorkflows = projectState.memory.activeWorkflows || [];
    
    // Get workflow templates from preferences
    const preferencesState = await agent.getContext({
      context: 'veo-preferences',
      args: { userId }
    });
    
    const templates = preferencesState.memory.workflowTemplates || [];

    return NextResponse.json({
      success: true,
      activeWorkflows,
      templates,
      projectId,
      userId,
    });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch workflows" 
      },
      { status: 500 }
    );
  }
}

// PUT /api/agent/workflow - Save workflow as template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      projectId = 'default', 
      userId = 'default-user', 
      template 
    } = body;

    if (!template || !template.name || !template.steps) {
      return NextResponse.json(
        { success: false, error: "template with name and steps is required" },
        { status: 400 }
      );
    }

    const agent = await getAgent();

    // Save the workflow template using the agent action
    const result = await agent.send({
      context: videoProjectContext,
      args: { projectId, userId },
      action: {
        name: "save-workflow-template",
        params: {
          name: template.name,
          steps: template.steps,
        }
      }
    });

    // Extract the result
    const actionResult = result.find(r => r.ref === 'action_call' && r.name === 'save-workflow-template');
    
    if (actionResult && 'result' in actionResult) {
      return NextResponse.json({
        success: true,
        ...actionResult.result,
        message: `Template "${template.name}" saved successfully`,
      });
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error saving workflow template:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to save template" 
      },
      { status: 500 }
    );
  }
}