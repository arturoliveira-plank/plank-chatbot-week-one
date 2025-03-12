import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Client } from 'langsmith';
import {
  StateGraph,
  START,
  StateGraphArgs,
  CompiledStateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

// Define the tools
const tools = [new TavilySearchResults({ maxResults: 3 })];
const toolNode = new ToolNode(tools);

const SYSTEM_PROMPT = `You are a helpful assistant named galo doido that can answer questions and help with tasks and.`;

// Define the state interface
interface AgentState {
  messages: BaseMessage[];
}

// Define the graph state
const graphState: StateGraphArgs<AgentState>["channels"] = {
  messages: {
    value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
    default: () => [],
  },
};

export class ChatAgent {
  private model: ChatOpenAI;
  private client?: Client;
  private graph: CompiledStateGraph<AgentState, Partial<AgentState>, string>;

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
      ['placeholder', '{messages}'],
    ]);

    const chain = RunnableSequence.from([
      prompt,
      this.model,
      new StringOutputParser()
    ]);

    // Define routing logic
    const routeMessage = (state: AgentState): "tools" | "__end__" => {
      const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
      if (lastMessage.tool_calls?.length) {
        return "tools";
      }
      return "__end__";
    };

    // Define the agent node
    const agentNode = async (state: AgentState): Promise<Partial<AgentState>> => {
      const response = await chain.invoke({
        messages: state.messages,
      });
      return {
        messages: [new AIMessage(response)]
      };
    };

    // Build the graph
    const graphBuilder = new StateGraph<AgentState>({ channels: graphState })
      .addNode("agent", agentNode)
      .addNode("tools", toolNode)
      .addEdge(START, "agent")
      .addEdge("tools", "agent")
      .addConditionalEdges("agent", routeMessage);

    this.graph = graphBuilder.compile();
  }

  async processMessage(message: string): Promise<AgentState> {
    const initialState: AgentState = {
      messages: [new HumanMessage(message)]
    };
    
    const result = await this.graph.invoke(initialState) as AgentState;
    return result;
  }

  async streamResponse(message: string) {
    const initialState: AgentState = {
      messages: [new HumanMessage(message)]
    };
    
    const stream = await this.graph.stream(initialState);
    return stream;
  }
}

// Main agent function
export async function chatAgent(initialMessage: string) {
  const agent = new ChatAgent();
  const result = await agent.processMessage(initialMessage);
  
  return {
    messages: result.messages.map(msg => ({
      role: msg instanceof HumanMessage ? "user" : "assistant",
      content: typeof msg.content === 'string' ? msg.content : ''
    })) as ChatCompletionMessageParam[]
  };
}

// Optional: Streaming version
export async function* streamChatAgent(initialMessage: string) {
  const agent = new ChatAgent();
  const stream = await agent.streamResponse(initialMessage);
  
  for await (const chunk of stream) {
    yield chunk;
  }
}