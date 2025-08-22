"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Image, 
  RefreshCw,
  Edit2,
  Save,
  X
} from 'lucide-react';

interface AgentMemoryViewerProps {
  projectId: string;
  userId: string;
}

export function AgentMemoryViewer({ projectId, userId }: AgentMemoryViewerProps) {
  const [contexts, setContexts] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editedMemory, setEditedMemory] = useState<string>('');

  useEffect(() => {
    fetchMemory();
    const interval = setInterval(fetchMemory, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [projectId, userId]);

  const fetchMemory = async () => {
    try {
      const res = await fetch(`/api/agent/memory?projectId=${projectId}&userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setContexts(data.contexts);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch memory:', error);
      setLoading(false);
    }
  };

  const saveMemory = async (contextType: string) => {
    try {
      const updates = JSON.parse(editedMemory);
      const res = await fetch('/api/agent/memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          userId, 
          contextType,
          updates 
        })
      });
      
      if (res.ok) {
        setEditing(null);
        await fetchMemory();
      } else {
        alert('Failed to save memory');
      }
    } catch (error) {
      alert('Invalid JSON format');
    }
  };

  const formatCost = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Agent Memory</h2>
        <Button onClick={fetchMemory} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="media">Media Library</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Project Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Project</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contexts.project?.memory?.projectName || 'Untitled'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sessions: {contexts.project?.memory?.sessionCount || 0}
                </p>
              </CardContent>
            </Card>

            {/* Media Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Media</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Video className="w-4 h-4 text-blue-500" />
                    <span className="text-xl font-bold">
                      {contexts.project?.memory?.videos?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Image className="w-4 h-4 text-green-500" />
                    <span className="text-xl font-bold">
                      {contexts.project?.memory?.images?.length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Usage Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCost(contexts.analytics?.memory?.costs?.estimatedCost || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimated usage cost
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Workflows */}
          {contexts.project?.memory?.activeWorkflows?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Workflows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contexts.project.memory.activeWorkflows.map((workflow: any) => (
                    <div key={workflow.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{workflow.name}</span>
                        <div className="flex gap-1 mt-1">
                          {workflow.steps.map((step: any, idx: number) => (
                            <Badge 
                              key={idx} 
                              variant={
                                step.status === 'completed' ? 'default' : 
                                step.status === 'active' ? 'default' : 
                                'secondary'
                              }
                              className={
                                step.status === 'completed' ? 'bg-green-500' : 
                                step.status === 'active' ? '' : 
                                ''
                              }
                            >
                              {idx + 1}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Started {new Date(workflow.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Media Library Tab */}
        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contexts.project?.memory?.videos?.map((video: any) => (
                  <div key={video.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{video.prompt}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(video.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        video.status === 'ready' ? 'default' : 
                        video.status === 'generating' ? 'secondary' : 
                        'destructive'
                      }
                      className={
                        video.status === 'ready' ? 'bg-green-500' : ''
                      }
                    >
                      {video.status}
                    </Badge>
                  </div>
                )) || <p className="text-muted-foreground">No videos generated yet</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {contexts.project?.memory?.images?.map((image: any) => (
                  <div key={image.id} className="border rounded overflow-hidden">
                    {image.url && (
                      <img 
                        src={image.url} 
                        alt={image.prompt}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{image.prompt}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(image.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                )) || <p className="text-muted-foreground col-span-2">No images generated yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Generation Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Videos:</span>
                    <span className="font-medium">{contexts.analytics?.memory?.costs?.totalVideos || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Images:</span>
                    <span className="font-medium">{contexts.analytics?.memory?.costs?.totalImages || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Estimated Cost:</span>
                    <span className="font-medium">{formatCost(contexts.analytics?.memory?.costs?.estimatedCost || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Video Time:</span>
                    <span className="font-medium">
                      {contexts.analytics?.memory?.performance?.averageVideoTime?.toFixed(1) || 0}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Failure Rate:</span>
                    <span className="font-medium">
                      {(contexts.analytics?.memory?.performance?.failureRate * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {contexts.analytics?.memory?.events?.slice(-5).reverse().map((event: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <span className="text-sm">{event.type.replace('_', ' ')}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )) || <p className="text-muted-foreground">No events tracked yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Video Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Aspect Ratio:</span>
                  <Badge>{contexts.preferences?.memory?.videoSettings?.aspectRatio || '16:9'}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Model:</span>
                  <Badge variant="outline">{contexts.preferences?.memory?.videoSettings?.model || 'veo-3.0'}</Badge>
                </div>
                {contexts.preferences?.memory?.videoSettings?.preferredStyle && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Preferred Style:</span>
                    <Badge variant="secondary">{contexts.preferences.memory.videoSettings.preferredStyle}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workflow Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Saved Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contexts.preferences?.memory?.workflowTemplates?.map((template: any, idx: number) => (
                  <div key={idx} className="p-2 border rounded">
                    <span className="font-medium text-sm">{template.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({template.steps.length} steps)
                    </span>
                  </div>
                )) || <p className="text-muted-foreground">No templates saved yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw Data Tab */}
        <TabsContent value="raw" className="space-y-4">
          {Object.entries(contexts).map(([key, context]: [string, any]) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">{key} Context</CardTitle>
                  {editing === key ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveMemory(key)}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditing(key);
                      setEditedMemory(JSON.stringify(context.memory, null, 2));
                    }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editing === key ? (
                  <textarea
                    value={editedMemory}
                    onChange={(e) => setEditedMemory(e.target.value)}
                    className="w-full h-64 font-mono text-xs p-2 border rounded bg-background"
                  />
                ) : (
                  <pre className="text-xs overflow-auto max-h-64 p-2 bg-muted rounded">
                    {JSON.stringify(context.memory, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}