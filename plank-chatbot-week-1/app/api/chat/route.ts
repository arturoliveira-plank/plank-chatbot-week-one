// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { graph } from '@/app/langgraph/agent/agent';
import { HumanMessage } from '@langchain/core/messages';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { messages, id } = json;

    if (!id) {
      return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const previousMessages = messages.slice(0, messages.length - 1);

    const formattedMessages = [
      ...previousMessages.map((msg: Message) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: lastMessage.content },
    ];

    const stream = await graph.stream(
      { 
        messages: [
          new HumanMessage({
            content:  lastMessage.content,
          }),
          //messages: formattedMessages
        ] 
      },
      { 
        configurable: {
          conversationId: id,
          maxIterations: 100,
        }
      }
    );

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Check if the chunk has a valid response
            const content = chunk?.chat?.lastResponse || 
                          chunk?.weather?.lastResponse || 
                          chunk?.news?.lastResponse || '';
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