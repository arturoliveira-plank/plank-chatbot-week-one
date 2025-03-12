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
    const { messages, id } = json;
    
    // Ensure we have a valid ID
    if (!id) {
      return NextResponse.json(
        { error: 'Missing conversation ID' },
        { status: 400 }
      );
    }
    
    const lastMessage = messages[messages.length - 1];
    
    // Get all previous messages except the last one (which is the current user message)
    const previousMessages = messages.slice(0, messages.length - 1);

    const chatAgent = new ServerChatAgent();
    
    // Pass the current message, previous messages history, and the conversation ID
    const stream = await chatAgent.streamResponse(
      lastMessage.content, 
      previousMessages,
      id // Pass the conversation ID from the frontend
    );

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