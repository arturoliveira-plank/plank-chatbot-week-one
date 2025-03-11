import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Client } from 'langsmith';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatState {
  messages: Message[];
}

const SYSTEM_PROMPT = `You are a helpful assistant that can answer questions and help with tasks without vowels.`;

export class ChatAgent {
  private model: ChatOpenAI;
  private client?: Client;
  private chain: RunnableSequence;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Initialize the LLM with streaming enabled
    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      openAIApiKey: apiKey,
      temperature: 0.7,
      streaming: true,
    });

    // Initialize LangSmith client only if credentials are available
    if (process.env.LANGSMITH_API_KEY && process.env.LANGSMITH_ENDPOINT) {
      this.client = new Client({
        apiUrl: process.env.LANGSMITH_ENDPOINT,
        apiKey: process.env.LANGSMITH_API_KEY,
      });
    }

    // Create the prompt template
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_PROMPT],
      ['human', '{history}\n\nHuman: {input}'],
    ]);

    // Create the chain
    this.chain = RunnableSequence.from([prompt, this.model, new StringOutputParser()]);
  }

  async sendMessage(input: string, state: ChatState): Promise<ChatState> {
    // Add user message to history
    const newState = {
      messages: [...state.messages, { role: 'user' as const, content: input }],
    };

    // Get the conversation history as context
    const history = newState.messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');

    // Create a new run in LangSmith only if client is available
    let runId: string | undefined;
    if (this.client) {
      try {
        const run = await this.client.createRun({
          name: 'chat-message',
          run_type: 'chain',
          inputs: { input, history },
        });
        runId = (run as any)?.id;
      } catch (e) {
        console.error('Failed to create LangSmith run:', e);
      }
    }

    try {
      let fullResponse = '';
      // Get streaming response from the chain
      const stream = await this.chain.stream({
        input,
        history,
      });

      // Process the stream
      for await (const chunk of stream) {
        fullResponse += chunk;
      }

      // Add assistant message to history
      newState.messages.push({
        role: 'assistant' as const,
        content: fullResponse,
      });

      // Update the run with success if LangSmith client is available
      if (this.client && runId) {
        await this.client.updateRun(runId, {
          outputs: { response: fullResponse },
        });
      }

      return newState;
    } catch (error) {
      // Update the run with error if LangSmith client is available
      if (this.client && runId) {
        await this.client.updateRun(runId, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      throw error;
    }
  }
}