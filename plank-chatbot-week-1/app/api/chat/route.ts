import { NextRequest, NextResponse } from 'next/server';
import { graph } from '@/app/langgraph/agent/agent';

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

    // Format messages for the graph (ensure compatibility with LangGraph's expected state)
    const formattedMessages = [
      ...previousMessages.map((msg: Message) => ({
        type: msg.role === 'user' ? 'human' : 'ai',
        content: msg.content,
      })),
      { type: 'human', content: lastMessage.content },
    ];

    // Use the graph to stream responses
    const streamGenerator = graph.stream(
      { messages: formattedMessages },
      { configurable: { conversationId: id } } // Optional: pass conversation ID if supported
    );

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          //console.log('Iniciando stream');
          for await (const chunk of await streamGenerator) {
            // Extract the content from the graph's output
            const messages = chunk?.agent?.messages;
            const lastMessageContent = messages ? messages[messages.length - 1]?.content : '';
            //console.log('Contgentttttt', lastMessageContent);

            // Split the content into words and send each word as a chunk
            const words = lastMessageContent.split(' ');
            for (const word of words) {
              //console.log('Enviando palavra ao cliente:', word);
              const encodedChunk = new TextEncoder().encode(
                `${word} `
              );
              controller.enqueue(encodedChunk);
            }
          }
          //console.log('Stream concluído');
          controller.close();
        } catch (error) {
          //console.error('Erro no stream:', error);
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
    //console.error('Erro na rota:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}