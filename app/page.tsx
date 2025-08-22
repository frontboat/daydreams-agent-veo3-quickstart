"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Brain, Video, Image } from "lucide-react";
import { sendToAgent } from "@/lib/agent/client";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    hasVideo?: boolean;
    hasImage?: boolean;
    images?: Array<{
      imageId: string;
      url?: string; // URL to fetch the image
      data?: string; // base64 data URL (legacy)
    }>;
    videos?: Array<{
      operationName: string;
      videoId: string;
      message: string;
    }>;
  };
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI video generation assistant. I can help you create videos, generate images, and manage complex workflows. Try saying things like:\n\n• \"Generate a video of a sunset over mountains\"\n• \"Create an image of a futuristic city\"\n• \"Show me all my videos\"\n• \"Create a workflow that generates an image then uses it for a video\"",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [projectId] = useState('default');
  const [userId] = useState('default-user');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [agentReady, setAgentReady] = useState(false);

  useEffect(() => {
    initializeAgent();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeAgent = async () => {
    // Agent runs on server, just mark as ready
    setAgentReady(true);
    console.log("Chat interface ready");
  };

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !agentReady) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    addMessage({ role: 'user', content: userMessage });

    try {
      // Send message to agent via API
      const response = await sendToAgent(userMessage, projectId, userId);
      console.log('Response from agent:', response);

      if (response.success) {
        // Build the assistant response
        let assistantResponse = response.message;
        
        // Check if we have images to display
        const hasImages = response.metadata?.images && response.metadata.images.length > 0;
        
        // Only add notifications if we don't have the actual content
        if (!hasImages) {
          for (const action of response.actions) {
            if (action.name === 'generate-veo-video') {
              assistantResponse += "\n🎬 Video generation started...";
            } else if (action.name === 'generate-imagen-image') {
              assistantResponse += "\n🖼️ Processing image generation...";
            }
          }
        }

        // Add assistant response with metadata including images
        addMessage({ 
          role: 'assistant', 
          content: assistantResponse.trim(),
          metadata: response.metadata
        });
      } else {
        throw new Error(response.error || 'Unknown error occurred');
      }

    } catch (error) {
      console.error("Error sending message to agent:", error);
      addMessage({
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to process your request'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Veo AI Assistant</h1>
              <p className="text-xs text-gray-500">Powered by Daydreams + Veo 3 + Imagen</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a 
              href="/agent-dashboard" 
              className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : message.role === 'system'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-white shadow-md border border-gray-100'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                    <Brain className="w-3 h-3" />
                    AI Assistant
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
                
                {/* Display generated images */}
                {message.metadata?.images && message.metadata.images.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.metadata.images.map((image, idx) => (
                      <div key={image.imageId || idx} className="rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={image.url || image.data} // Support both URL and legacy data format
                          alt={`Generated image ${idx + 1}`}
                          className="w-full h-auto"
                          style={{ maxHeight: '400px', objectFit: 'contain' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {message.metadata?.hasVideo && !message.metadata?.videos && (
                  <div className="mt-2 flex items-center gap-1 text-xs opacity-75">
                    <Video className="w-3 h-3" />
                    Video generation in progress
                  </div>
                )}
                
                {message.metadata?.videos && message.metadata.videos.length > 0 && (
                  <div className="mt-2 text-xs opacity-75">
                    {message.metadata.videos.map((video, idx) => (
                      <div key={video.videoId || idx} className="flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        {video.message}
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs mt-2 opacity-50">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={agentReady ? "Ask me to generate videos, images, or create workflows..." : "Initializing agent..."}
              disabled={!agentReady || isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !agentReady}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send
                </>
              )}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {agentReady ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Agent ready - Try: "Generate a video of ocean waves" or "Create an image of a sunset"
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Initializing AI agent...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}