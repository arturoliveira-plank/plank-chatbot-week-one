import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Client } from 'langsmith';

interface AgentState {
  messages: ChatCompletionMessageParam[];
}

interface ChatState {
  messages: ChatCompletionMessageParam[];
}

const SYSTEM_PROMPT = `You are a helpful assistant that can answer questions and help with tasks.`;

export class ServerChatAgent {
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

export async function serverChatAgent(initialMessage: string) {
  const initialState: AgentState = {
    messages: []
  };

  return await processMessage(initialState, initialMessage);
}

async function processMessage(state: AgentState, message: string) {
  try {
    const chatAgent = new ServerChatAgent();
    
    // Convert the current state to the format expected by ChatAgent
    const currentState = {
      messages: state.messages.map((msg: ChatCompletionMessageParam) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content as string
      }))
    };

    // Process the message using ChatAgent
    const newState = await chatAgent.processMessage(message, currentState);
    
    // Convert the response back to the format expected by the interface
    return {
      messages: newState.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })) as ChatCompletionMessageParam[]
    };
  } catch (error) {
    console.error("Error processing message:", error);
    throw error;
  }
} 