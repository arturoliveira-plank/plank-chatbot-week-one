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
    for (const agent of this.agents) {
      const result = await agent.performTask(state);
      if (this.shouldConclude(result)) {
        return result;
      }
    }
  }

  private shouldConclude(result: any): boolean {
    return result === "__end__";
  }
}

// Agents Layer
class Agent {
  constructor(private name: string, private task: Function) {}

  async performTask(state: typeof MessagesAnnotation.State) {
    return await this.task(state);
  }
}

// Tooling Layer
const tools = [new TavilySearchResults({ maxResults: 1 })]; // Reduced to 1 for simplicity
const toolNode = new ToolNode(tools);

// Initialize LLM with tools bound
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  streaming: true,
}).bindTools(tools);

function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
}

// Common personality for all agents
const commonPersonality = 
  "You are a seal agent named David. " +
  "You are a tough to deal with person that can answer questions well but being kinda rude and not very friendly also stressed out " +
  "and help with tasks. When appropriate, use the provided tools to gather additional information.";

// Mock fetchNews function (unchanged, still uses API)
async function fetchNews() {
  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        country: 'us',
        apiKey: process.env.NEWS_API_KEY,
      },
    });
    return response.data.articles.map((article: any) => article.title).join('\n');
  } catch (error) {
    console.error('Error fetching news:', error);
    return 'Unable to fetch news at the moment, deal with it.';
  }
}

// News agent
async function callNewsAgent(state: typeof MessagesAnnotation.State) {
  const news = await fetchNews();
  const response = await llm.invoke([
    {
      type: "system",
      content: commonPersonality + " Here are the latest news updates, don't waste my time:\n" + news,
    },
    ...state.messages,
  ]);
  return { messages: [response], timestamp: Date.now() };
}

// Weather agent using TavilySearchResults
async function callWeatherAgent(state: typeof MessagesAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1];
  

  const response = await llm.invoke([
    {
      type: "system",
      content: commonPersonality + " Here's the weather, stop bothering me:\n" + lastMessage,
    },
    ...state.messages,
  ]);
  return { messages: [response], timestamp: Date.now() };
}

// General chat agent
async function callModelWithPersonality(state: typeof MessagesAnnotation.State) {
  const response = await llm.invoke([
    { type: "system", content: commonPersonality },
    ...state.messages,
  ]);
  return { messages: [response], timestamp: Date.now() };
}

// Supervisor Layer
class Supervisor {
  constructor(private agents: Agent[]) {}

  async delegateTask(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1].content.toString().toLowerCase();
    if (lastMessage.includes("weather")) {
      return await this.agents[2].performTask(state); // WeatherAgent
    } else if (lastMessage.includes("news")) {
      return await this.agents[1].performTask(state); // NewsAgent
    } else {
      return await this.agents[0].performTask(state); // ChatAgent
    }
  }
}

// Improved agent selection logic using Supervisor
async function agentNode(state: typeof MessagesAnnotation.State) {
  const supervisor = new Supervisor([
    new Agent("ChatAgent", callModelWithPersonality),
    new Agent("NewsAgent", callNewsAgent),
    new Agent("WeatherAgent", callWeatherAgent),
  ]);
  return await supervisor.delegateTask(state);
}

// Define the state graph
const builder = new StateGraph(
  Annotation.Root({
    messages: MessagesAnnotation.spec["messages"],
    timestamp: Annotation<number>,
  })
)
  .addNode("agent", agentNode)
  .addEdge(START, "agent")
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

export const graph = builder.compile();