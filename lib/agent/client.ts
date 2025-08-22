// Client-side agent interface
export interface AgentClient {
  send: (message: string, projectId: string, userId: string) => Promise<any>;
}

export async function sendToAgent(message: string, projectId: string = 'default', userId: string = 'default-user'): Promise<any> {
  const response = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      projectId,
      userId
    })
  });

  if (!response.ok) {
    throw new Error(`Agent request failed: ${response.statusText}`);
  }

  return response.json();
}