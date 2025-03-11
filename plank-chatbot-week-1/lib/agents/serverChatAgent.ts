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

    // Create a dynamic prompt that will include conversation history
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_PROMPT],
      ['placeholder', '{chat_history}'], // This will be replaced with actual chat history
      ['human', '{input}'],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, new StringOutputParser()]);
  }

  async processMessage(message: string, state: ChatState): Promise<ChatState> {
    // Format the chat history for the prompt
    const chatHistory = this.formatChatHistory(state.messages);
    
    // Create a unique run ID for LangSmith tracing
    const runId = state.messages.length > 0 ? 
      `chat-${Date.now()}` : 
      `chat-${Date.now()}-new`;
    
    // Invoke the chain with the chat history and new input
    const response = await this.chain.invoke(
      {
        chat_history: chatHistory,
        input: message,
      },
      {
        // Add LangSmith tracing metadata
        runName: "Chat Conversation",
        runId: runId,
        // If there are previous messages, tag this as a continuation
        tags: state.messages.length > 0 ? ["conversation", "continuation"] : ["conversation", "new"],
        // Add metadata about the conversation
        metadata: {
          conversationId: runId,
          messageCount: state.messages.length + 1,
        }
      }
    );

    // Return updated state with new messages
    return {
      messages: [
        ...state.messages,
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      ]
    };
  }

  async streamResponse(input: string, previousMessages: ChatCompletionMessageParam[] = [], conversationId?: string) {
    // Format the chat history for the prompt
    const chatHistory = this.formatChatHistory(previousMessages);
    
    // Use the provided conversationId or generate a new one
    const runId = conversationId || 
      (previousMessages.length > 0 ? 
        `chat-${Date.now()}` : 
        `chat-${Date.now()}-new`);
    
    // Stream the response with the chat history and new input
    return await this.chain.stream(
      {
        chat_history: chatHistory,
        input: input,
      },
      {
        // Add LangSmith tracing metadata
        runName: "Chat Conversation",
        runId: runId,
        // If there are previous messages, tag this as a continuation
        tags: previousMessages.length > 0 ? ["conversation", "continuation"] : ["conversation", "new"],
        // Add metadata about the conversation
        metadata: {
          conversationId: runId,
          messageCount: previousMessages.length + 1,
          isNewConversation: previousMessages.length === 0,
        }
      }
    );
  }

  // Helper method to format chat history for the prompt
  private formatChatHistory(messages: ChatCompletionMessageParam[]): string {
    if (!messages || messages.length === 0) {
      return "";
    }
    
    // Convert messages to a format suitable for the prompt
    return messages.map(msg => {
      const role = msg.role === 'user' ? 'Human' : 'Assistant';
      return `${role}: ${msg.content}`;
    }).join('\n');
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