import { NextRequest, NextResponse } from 'next/server';
import { ServerChatAgent } from '@/lib/agents/serverChatAgent';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Export a named function for the POST method
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { messages } = json;
    const lastMessage = messages[messages.length - 1];

    const chatAgent = new ServerChatAgent();
    const stream = await chatAgent.streamResponse(lastMessage.content);

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 