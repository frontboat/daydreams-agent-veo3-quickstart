"use client";

import React, { useState } from 'react';
import { AgentMemoryViewer } from '@/components/agent/AgentMemoryViewer';
import { WorkflowBuilder } from '@/components/agent/WorkflowBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Workflow, 
  Terminal,
  Send,
  Loader2
} from 'lucide-react';

export default function AgentDashboard() {
  const [projectId, setProjectId] = useState('default');
  const [userId, setUserId] = useState('default-user');
  const [actionName, setActionName] = useState('');
  const [actionParams, setActionParams] = useState('{}');
  const [actionResult, setActionResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  const executeAction = async () => {
    if (!actionName) {
      alert('Please enter an action name');
      return;
    }

    setExecuting(true);
    try {
      const params = JSON.parse(actionParams);
      const response = await fetch('/api/agent/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          actionName,
          params
        })
      });

      const result = await response.json();
      setActionResult(result);
    } catch (error) {
      setActionResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid JSON parameters' 
      });
    } finally {
      setExecuting(false);
    }
  };

  const availableActions = [
    'generate-veo-video',
    'check-video-status',
    'generate-imagen-image',
    'list-media',
    'track-generation',
    'update-video-preferences',
    'start-workflow'
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-purple-500" />
            AI Agent Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your video generation agent's memory, workflows, and actions
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">Project: {projectId}</Badge>
          <Badge variant="outline">User: {userId}</Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="memory" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="memory" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Memory & State
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex items-center gap-2">
            <Workflow className="w-4 h-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Direct Actions
          </TabsTrigger>
        </TabsList>

        {/* Memory Tab */}
        <TabsContent value="memory">
          <AgentMemoryViewer projectId={projectId} userId={userId} />
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows">
          <WorkflowBuilder projectId={projectId} userId={userId} />
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execute Agent Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Action Name</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter action name..."
                    value={actionName}
                    onChange={(e) => setActionName(e.target.value)}
                    list="action-list"
                  />
                  <datalist id="action-list">
                    {availableActions.map(action => (
                      <option key={action} value={action} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Parameters (JSON)</label>
                <Textarea
                  placeholder='{"prompt": "A beautiful sunset"}'
                  value={actionParams}
                  onChange={(e) => setActionParams(e.target.value)}
                  className="font-mono text-sm"
                  rows={4}
                />
              </div>

              <Button 
                onClick={executeAction}
                disabled={executing}
                className="w-full"
              >
                {executing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Execute Action
                  </>
                )}
              </Button>

              {actionResult && (
                <Card className={actionResult.success ? 'border-green-500' : 'border-red-500'}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Result {actionResult.success ? '✅' : '❌'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs overflow-auto max-h-64 p-2 bg-muted rounded">
                      {JSON.stringify(actionResult, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionName('list-media');
                    setActionParams('{"type": "all"}');
                  }}
                >
                  List All Media
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionName('generate-imagen-image');
                    setActionParams('{"prompt": "A serene landscape", "numberOfImages": 2}');
                  }}
                >
                  Generate Images
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionName('generate-veo-video');
                    setActionParams('{"prompt": "A timelapse of clouds", "model": "veo-3.0-generate-preview"}');
                  }}
                >
                  Video (Veo 3)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionName('generate-veo-video');
                    setActionParams('{"prompt": "Fast motion cityscape", "model": "veo-3.0-fast-generate-preview"}');
                  }}
                >
                  Video (Veo 3 Fast)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionName('generate-veo-video');
                    setActionParams('{"prompt": "Portrait video", "model": "veo-2.0-generate-001", "aspectRatio": "9:16"}');
                  }}
                >
                  Video (Veo 2 - 9:16)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionName('clear-project');
                    setActionParams('{"confirm": true}');
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Clear Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}