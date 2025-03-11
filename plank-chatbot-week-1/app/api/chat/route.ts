import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Client } from 'langsmith';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a helpful assistant that can answer questions and help with tasks.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatState {
  messages: Message[];
}

export class ChatAgent {
  private model: ChatOpenAI;
  private client?: Client;
  private chain: RunnableSequence;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      openAIApiKey: apiKey,
      temperature: 0.7,
      streaming: true,
    });

    if (process.env.LANGSMITH_API_KEY && process.env.LANGSMITH_ENDPOINT) {
      this.client = new Client({
        apiUrl: process.env.LANGSMITH_ENDPOINT,
        apiKey: process.env.LANGSMITH_API_KEY,
      });
    }

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_PROMPT],
      ['human', '{input}'],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, new StringOutputParser()]);
  }

  async processMessage(message: string, state: ChatState): Promise<ChatState> {
    const response = await this.chain.invoke({
      input: message,
    });

    return {
      messages: [
        ...state.messages,
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      ]
    };
  }

  async streamResponse(input: string) {
    return await this.chain.stream({
      input,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { messages } = json;
    const lastMessage = messages[messages.length - 1];

    const chatAgent = new ChatAgent();
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