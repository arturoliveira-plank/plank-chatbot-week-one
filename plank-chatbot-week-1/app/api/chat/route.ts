import { NextRequest, NextResponse } from 'next/server';
import { ServerChatAgent } from '@/lib/agents/serverChatAgent';

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

    const chatAgent = new ServerChatAgent();
    const streamGenerator = chatAgent.streamResponse(lastMessage.content, previousMessages, id);

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          console.log('Iniciando stream');
          for await (const chunk of streamGenerator) {
            console.log('Enviando chunk ao cliente:', chunk);
            const encodedChunk = new TextEncoder().encode(
              `data: ${JSON.stringify({ content: chunk })}\n\n`
            );
            controller.enqueue(encodedChunk);
          }
          console.log('Stream concluído');
          controller.close();
        } catch (error) {
          console.error('Erro no stream:', error);
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
    console.error('Erro na rota:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}