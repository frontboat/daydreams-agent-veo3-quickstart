"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  ArrowRight, 
  Play, 
  Save, 
  Trash2, 
  Video,
  Image,
  Clock,
  Wand2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  type: 'generate-image' | 'generate-video' | 'wait' | 'transform';
  params: any;
  status?: 'pending' | 'active' | 'completed' | 'failed';
}

interface WorkflowBuilderProps {
  projectId: string;
  userId: string;
}

export function WorkflowBuilder({ projectId, userId }: WorkflowBuilderProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [workflowName, setWorkflowName] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [projectId, userId]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`/api/agent/workflow?projectId=${projectId}&userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const addStep = (type: WorkflowStep['type']) => {
    const newStep: WorkflowStep = {
      id: crypto.randomUUID(),
      type,
      params: type === 'wait' ? { duration: 5000 } : {},
      status: 'pending'
    };
    setSteps([...steps, newStep]);
    setExpandedStep(newStep.id);
  };

  const updateStepParam = (stepId: string, key: string, value: any) => {
    setSteps(steps.map(step => 
      step.id === stepId 
        ? { ...step, params: { ...step.params, [key]: value } }
        : step
    ));
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
  };

  const executeWorkflow = async () => {
    if (!workflowName || steps.length === 0) {
      alert('Please provide a workflow name and add at least one step');
      return;
    }

    setExecuting(true);
    try {
      const response = await fetch('/api/agent/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          workflow: {
            name: workflowName,
            steps: steps.map(s => ({
              type: s.type,
              params: s.params
            }))
          }
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`Workflow started: ${result.message}`);
        // Clear the builder after successful execution
        setSteps([]);
        setWorkflowName('');
      } else {
        alert(`Failed to start workflow: ${result.error}`);
      }
    } catch (error) {
      alert('Error executing workflow');
      console.error(error);
    } finally {
      setExecuting(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!workflowName || steps.length === 0) {
      alert('Please provide a workflow name and add at least one step');
      return;
    }

    try {
      const response = await fetch('/api/agent/workflow', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId,
          template: {
            name: workflowName,
            steps: steps.map(s => ({
              type: s.type,
              params: s.params
            }))
          }
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Template saved successfully');
        await fetchTemplates();
      } else {
        alert(`Failed to save template: ${result.error}`);
      }
    } catch (error) {
      alert('Error saving template');
      console.error(error);
    }
  };

  const loadTemplate = (template: any) => {
    setWorkflowName(template.name);
    setSteps(template.steps.map((s: any) => ({
      ...s,
      id: crypto.randomUUID(),
      status: 'pending'
    })));
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'generate-video': return <Video className="w-4 h-4" />;
      case 'generate-image': return <Image className="w-4 h-4" />;
      case 'wait': return <Clock className="w-4 h-4" />;
      case 'transform': return <Wand2 className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'generate-video': return 'bg-blue-100 hover:bg-blue-200';
      case 'generate-image': return 'bg-green-100 hover:bg-green-200';
      case 'wait': return 'bg-yellow-100 hover:bg-yellow-200';
      case 'transform': return 'bg-purple-100 hover:bg-purple-200';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Workflow Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Workflow Name */}
          <div className="space-y-2">
            <Label htmlFor="workflow-name">Workflow Name</Label>
            <Input
              id="workflow-name"
              placeholder="Enter workflow name..."
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
            />
          </div>

          {/* Step Chain Visualization */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4">
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center min-w-[80px]">
                  <button
                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-colors ${getStepColor(step.type)}`}
                  >
                    {getStepIcon(step.type)}
                    <span className="text-xs mt-1">{idx + 1}</span>
                  </button>
                  <span className="text-xs mt-1 text-center">{step.type.replace('-', ' ')}</span>
                </div>
                {idx < steps.length - 1 && <ArrowRight className="w-4 h-4 text-gray-400" />}
              </React.Fragment>
            ))}
            
            {/* Add Step Dropdown */}
            <div className="relative group">
              <button className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 
                               flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Plus className="w-6 h-6 text-gray-400" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border rounded-lg shadow-lg 
                            opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => addStep('generate-image')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <Image className="w-4 h-4" />
                  Generate Image
                </button>
                <button
                  onClick={() => addStep('generate-video')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Generate Video
                </button>
                <button
                  onClick={() => addStep('wait')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Wait
                </button>
                <button
                  onClick={() => addStep('transform')}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  Transform
                </button>
              </div>
            </div>
          </div>

          {/* Step Configuration */}
          {expandedStep && steps.find(s => s.id === expandedStep) && (
            <Card className="border-2">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">
                    Configure Step {steps.findIndex(s => s.id === expandedStep) + 1}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      removeStep(expandedStep);
                      setExpandedStep(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const step = steps.find(s => s.id === expandedStep)!;
                  
                  switch (step.type) {
                    case 'generate-video':
                      return (
                        <>
                          <div className="space-y-2">
                            <Label>Prompt</Label>
                            <Textarea
                              placeholder="Describe the video you want to generate..."
                              value={step.params.prompt || ''}
                              onChange={(e) => updateStepParam(step.id, 'prompt', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Negative Prompt (Optional)</Label>
                            <Input
                              placeholder="What to avoid..."
                              value={step.params.negativePrompt || ''}
                              onChange={(e) => updateStepParam(step.id, 'negativePrompt', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Aspect Ratio</Label>
                            <Select
                              value={step.params.aspectRatio || '16:9'}
                              onValueChange={(value) => updateStepParam(step.id, 'aspectRatio', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                                <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                <SelectItem value="1:1">1:1 (Square)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      );
                      
                    case 'generate-image':
                      return (
                        <div className="space-y-2">
                          <Label>Prompt</Label>
                          <Textarea
                            placeholder="Describe the image you want to generate..."
                            value={step.params.prompt || ''}
                            onChange={(e) => updateStepParam(step.id, 'prompt', e.target.value)}
                          />
                        </div>
                      );
                      
                    case 'wait':
                      return (
                        <div className="space-y-2">
                          <Label>Duration (seconds)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="60"
                            value={(step.params.duration || 5000) / 1000}
                            onChange={(e) => updateStepParam(step.id, 'duration', parseInt(e.target.value) * 1000)}
                          />
                        </div>
                      );
                      
                    case 'transform':
                      return (
                        <div className="space-y-2">
                          <Label>Transform Type</Label>
                          <Select
                            value={step.params.transformType || 'enhance'}
                            onValueChange={(value) => updateStepParam(step.id, 'transformType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="enhance">Enhance</SelectItem>
                              <SelectItem value="resize">Resize</SelectItem>
                              <SelectItem value="filter">Apply Filter</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      );
                      
                    default:
                      return null;
                  }
                })()}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={executeWorkflow}
              disabled={executing || steps.length === 0}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              {executing ? 'Executing...' : 'Execute Workflow'}
            </Button>
            <Button 
              onClick={saveAsTemplate}
              variant="outline"
              disabled={steps.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Templates */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Saved Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {templates.map((template, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium text-sm">{template.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({template.steps.length} steps)
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => loadTemplate(template)}
                  >
                    Load
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}