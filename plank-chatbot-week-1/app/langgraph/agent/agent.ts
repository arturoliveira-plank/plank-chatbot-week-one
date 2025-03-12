import {
  StateGraph,
  MessagesAnnotation,
  START,
  Annotation,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";
import axios from 'axios';

// Planner Layer
class Planner {
  constructor(private agents: Agent[], private tools: ToolNode) {}

  async execute(state: typeof MessagesAnnotation.State) {
    // Logic to delegate tasks among agents
    for (const agent of this.agents) {
      const result = await agent.performTask(state);
      if (this.shouldConclude(result)) {
        break;
      }
    }
  }

  private shouldConclude(result: any): boolean {
    // Determine when to conclude the execution flow
    return result === "__end__";
  }
}

// Agents Layer
class Agent {
  constructor(private name: string, private task: Function) {}

  async performTask(state: typeof MessagesAnnotation.State) {
    // Logic for the agent to perform its task with the common personality
    return await this.task(state);
  }
}

// Tooling Layer
// Define the tools for the agent to use
const tools = [new TavilySearchResults({ maxResults: 3 })];
const toolNode = new ToolNode(tools);
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  streaming: true,
}).bindTools(tools);

function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  // Otherwise, we stop (reply to the user) using the special "__end__" node
  return "__end__";
}

// Define a common personality for all agents
const commonPersonality = 
  "You are a seal agent named David. " +
  "You are a tough to deal with person that can answer questions well but being kinda rude and not very friendly also stressed out" +
  "and help with tasks. When appropriate, use the provided tools to gather additional information.";

// Define a function to fetch news
async function fetchNews() {
  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        country: 'us',
        apiKey: process.env.NEWS_API_KEY, // Ensure you have this environment variable set
      },
    });
    return response.data.articles.map((article: any) => article.title).join('\n');
  } catch (error) {
    console.error('Error fetching news:', error);
    return 'Unable to fetch news at the moment.';
  }
}

// Define the function that calls the model with a specific personality for news
async function callNewsAgent(state: typeof MessagesAnnotation.State) {
  const news = await fetchNews();
  const response = await llm.invoke([
    {
      type: "system",
      content: commonPersonality + " Here are the latest news updates:\n" + news,
    },
    ...state.messages,
  ]);

  return { messages: [response], timestamp: Date.now() };
}

// Define the function that calls the model with a specific personality
async function callModelWithPersonality(state: typeof MessagesAnnotation.State) {
  const response = await llm.invoke([
    {
      type: "system",
      content: commonPersonality,
    },
    ...state.messages,
  ]);

  return { messages: [response], timestamp: Date.now() };
}

// Instantiate the planner with agents and tools
const agents = [
  new Agent("ChatAgent", callModelWithPersonality),
  new Agent("NewsAgent", callNewsAgent) // Use the news-specific function
];
const planner = new Planner(agents, toolNode);

const builder = new StateGraph(
  Annotation.Root({
    messages: MessagesAnnotation.spec["messages"],
    timestamp: Annotation<number>,
  }),
)
  .addNode("agent", callModelWithPersonality)
  .addEdge("__start__", "agent") // __start__ is a special name for the entrypoint
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

export const graph = builder.compile();
