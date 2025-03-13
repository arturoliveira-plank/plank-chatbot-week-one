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

// Agents Layer
class Agent {
  constructor(private name: string, private task: Function) {}

  async performTask(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1];
    // Use the full state for context but prioritize the latest message
    return await this.task({ messages: state.messages, lastMessage });
  }
}

const categories = "'news', 'weather', or 'chat'";
// Tooling Layer
const toolsWeather = [new TavilySearchResults({ maxResults: 1 })]; // Reduced to 1 for simplicity
const toolNode = new ToolNode(toolsWeather);

// Initialize LLM with tools bound
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  streaming: true,
});

const llmWeather = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  streaming: true,
}).bindTools(toolsWeather);

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
        apiKey: process.env.NEWSAPI_KEY,
      },
    });
    const data = response.data as { articles: { title: string }[] };
    return data.articles.map((article) => article.title).join('\n');
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
  return { messages: [response], timestamp: Date.now(), agentResponsible: 'news' };
}

// Weather agent using TavilySearchResults
async function callWeatherAgent(state: typeof MessagesAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1];
  

  const response = await llmWeather.invoke([
    {
      type: "system",
      content: commonPersonality + " Here's the weather, stop bothering me:\n" + lastMessage,
    },
    ...state.messages,
  ]);
  return { messages: [response], timestamp: Date.now(), agentResponsible: 'weather' };
}

// General chat agent
async function callModelWithPersonality(state: typeof MessagesAnnotation.State) {
  const response = await llm.invoke([
    { type: "system", content: commonPersonality },
    ...state.messages,
  ]);
  return { messages: [response], timestamp: Date.now(), agentResponsible: 'assistant' };
}

// Function to determine message category
async function determineMessageCategory(message: string) {
  const response = await llm.invoke([
    {
      type: "system",
      content: "You are a classifier. Analyze the message and respond with exactly one of these categories: " + categories + ". Only respond with the category name, nothing else."
    },
    {
      type: "human",
      content: message
    }
  ]);
  return String(response.content).toLowerCase().trim();
}

// Supervisor Layer
class Supervisor {
  constructor(private agents: Agent[]) {}

  async delegateTask(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1].content.toString();
    const category = await determineMessageCategory(lastMessage);
    
    console.log('Determined category:', category);
    
    switch (category) {
      case 'weather':
        console.log('Calling WeatherAgent');
        return await this.agents[2].performTask(state); // WeatherAgent
      case 'news':
        console.log('Calling NewsAgent');
        return await this.agents[1].performTask(state); // NewsAgent
      default:
        console.log('Calling ChatAgent');
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