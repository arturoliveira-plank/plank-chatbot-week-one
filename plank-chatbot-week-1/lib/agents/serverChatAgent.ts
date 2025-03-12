import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Client } from 'langsmith';
import { v4 as uuidv4 } from 'uuid';
import {
  StateGraph,
  START,
  StateGraphArgs,
  CompiledStateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

interface AgentState {
  messages: ChatCompletionMessageParam[];
}

interface ChatState {
  messages: ChatCompletionMessageParam[];
}

// Define the tools
const tools = [new TavilySearchResults({ maxResults: 3 })];
const toolNode = new ToolNode(tools);

const SYSTEM_PROMPT = `You are a helpful assistant that can answer questions and help with tasks. When appropriate, use the provided tools to gather additional information.`;

export class ServerChatAgent {
  private model: ChatOpenAI; // Base ChatOpenAI type
  private client?: Client;
  private graph: CompiledStateGraph<AgentState, Partial<AgentState>, string>;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Initialize the base model without binding tools yet
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

    // Create the prompt
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_PROMPT],
      ['placeholder', '{chat_history}'],
      ['human', '{input}'],
    ]);

    // Create the chain with the model bound to tools
    const chain = RunnableSequence.from([
      prompt,
      this.model.bindTools(tools), // Bind tools here instead
      new StringOutputParser(),
    ]);

    // Rest of the graph setup remains the same
    const graphState: StateGraphArgs<AgentState>["channels"] = {
      messages: {
        value: (x: ChatCompletionMessageParam[], y: ChatCompletionMessageParam[]) => x.concat(y),
        default: () => [],
      },
    };

    const routeMessage = (state: AgentState): "tools" | "__end__" => {
      const lastMessage = state.messages[state.messages.length - 1] as ChatCompletionMessageParam & { tool_calls?: any[] };
      if (lastMessage.tool_calls?.length) {
        return "tools";
      }
      return "__end__";
    };

    const agentNode = async (state: AgentState): Promise<Partial<AgentState>> => {
      const chatHistory = this.formatChatHistory(state.messages);
      const lastMessage = state.messages[state.messages.length - 1];
      const response = await chain.invoke({
        chat_history: chatHistory,
        input: typeof lastMessage.content === 'string' ? lastMessage.content : '',
      });
      console.log('Tool used with input:', lastMessage.content);
      return {
        messages: [{ role: 'assistant', content: response } as ChatCompletionMessageParam],
      };
    };

    const graphBuilder = new StateGraph<AgentState>({ channels: graphState })
      .addNode("agent", agentNode)
      .addNode("tools", toolNode)
      .addEdge(START, "agent")
      .addEdge("tools", "agent")
      .addConditionalEdges("agent", routeMessage);

    this.graph = graphBuilder.compile();
  }

  async processMessage(message: string, state: ChatState, conversationId?: string): Promise<ChatState> {
    const runId = conversationId || uuidv4();

    // Convert ChatState to AgentState with BaseMessage types for LangGraph
    const initialState: AgentState = {
      messages: [
        ...state.messages,
        { role: 'user', content: message } as ChatCompletionMessageParam,
      ],
    };

    // Invoke the graph
    const result = await this.graph.invoke(initialState, {
      runName: "Chat Conversation",
      runId: runId,
      tags: state.messages.length > 0 ? ["conversation", "continuation"] : ["conversation", "new"],
      metadata: {
        conversationId: runId,
        messageCount: state.messages.length + 1,
        isNewConversation: state.messages.length === 0,
      },
    });

    console.log('Metadata for processMessage:', {
      conversationId: runId,
      messageCount: state.messages.length + 1,
      isNewConversation: state.messages.length === 0,
    });

    return {
      messages: result.messages,
    };
  }

  async *streamResponse(input: string, previousMessages: ChatCompletionMessageParam[] = [], conversationId?: string) {
    const runId = conversationId || `chat-${Date.now()}`;
    const messageId = uuidv4();

    const initialState: AgentState = {
      messages: [
        ...previousMessages,
        { role: 'user', content: input } as ChatCompletionMessageParam,
      ],
    };

    const stream = await this.graph.stream(initialState, {
      runName: "Chat Message",
      runId: messageId,
      tags: previousMessages.length > 0 ? ["conversation", "continuation"] : ["conversation", "new"],
      metadata: {
        conversationId: runId,
        messageId: messageId,
        messageCount: previousMessages.length + 1,
        isNewConversation: previousMessages.length === 0,
        timestamp: new Date().toISOString(),
      },
    });

    console.log('Metadata for streamResponse:', {
      conversationId: runId,
      messageId: messageId,
      messageCount: previousMessages.length + 1,
      isNewConversation: previousMessages.length === 0,
      timestamp: new Date().toISOString(),
    });

    for await (const chunk of stream) {
      console.log('Chunk bruto do graph.stream:', chunk);
      // Acesse os messages dentro do nó "agent"
      if (chunk.agent && chunk.agent.messages && chunk.agent.messages.length > 0) {
        const lastMessage = chunk.agent.messages[chunk.agent.messages.length - 1];
        const content = typeof lastMessage.content === 'string' ? lastMessage.content : '';
        console.log('Conteúdo extraído:', content); // Log para verificar o conteúdo
        if (content) {
          yield content;
        }
      }
    }
  }
  private formatChatHistory(messages: ChatCompletionMessageParam[]): string {
    if (!messages || messages.length === 0) {
      return "";
    }
    return messages.map(msg => {
      const role = msg.role === 'user' ? 'Human' : 'Assistant';
      return `${role}: ${msg.content}`;
    }).join('\n');
  }
}

export async function serverChatAgent(initialMessage: string) {
  const initialState: AgentState = { messages: [] };
  return await processMessage(initialState, initialMessage);
}

async function processMessage(state: AgentState, message: string, conversationId?: string) {
  try {
    const chatAgent = new ServerChatAgent();
    const currentState = {
      messages: state.messages.map((msg: ChatCompletionMessageParam) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content as string
      }))
    };

    // Process the message using ChatAgent
    const newState = await chatAgent.processMessage(message, currentState, conversationId);
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