// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { graph } from '@/app/langgraph/agent/agent';
import { HumanMessage, AIMessage, BaseMessage, SystemMessage } from '@langchain/core/messages';
import { Message } from 'ai'; // Import VercelMessage type

// Type definition for incoming messages (aligned with Vercel AI SDK)
type IncomingMessage = Message; // { role: 'user' | 'assistant', content: string }

// Adapter function to convert Vercel messages to LangChain messages
const toLangChainMessage = (msg: IncomingMessage): BaseMessage => {
  return msg.role === 'user'
    ? new HumanMessage({ content: msg.content })
    : new AIMessage({ content: msg.content });
};

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { messages, id, isSummary } = json as { messages: IncomingMessage[]; id: string; isSummary?: boolean };

    if (!id) {
      return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
    }

    // Convert messages to LangChain format
    const langChainMessages = messages.map(toLangChainMessage);

    // If this is a summary request, add a system message to trigger the summary agent
    if (isSummary) {
      langChainMessages.unshift(new SystemMessage({
        content: "You are the Summary Agent. Please provide a mission debrief of the conversation."
      }));
    }

    const stream = await graph.stream(
      {
        messages: langChainMessages,
        next: isSummary ? "summary" : "supervisor"
      },
      {
        configurable: {
          conversationId: id,
          maxIterations: 100,
        },
      }
    );

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content =
              chunk?.chat?.lastResponse ||
              chunk?.weather?.lastResponse ||
              chunk?.news?.lastResponse ||
              chunk?.summary?.lastResponse || // Add summary agent response
              '';
            if (content) {
              const encodedChunk = new TextEncoder().encode(content);
              controller.enqueue(encodedChunk);
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}