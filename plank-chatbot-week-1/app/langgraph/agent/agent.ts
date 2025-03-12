import {
  StateGraph,
  MessagesAnnotation,
  START,
  Annotation,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { WeatherAgent } from "@/lib/agents/weatherAgent";
import { NewsAgent } from "@/lib/agents/newsAgent";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";

// Initialize the agents
const weatherAgent = new WeatherAgent();
const newsAgent = new NewsAgent();

// Create a personality-driven Chat Agent
const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.7 });

// Define the state with proper annotations
const StateAnnotation = Annotation.Root({
  messages: MessagesAnnotation.spec["messages"],
  timestamp: Annotation<number>,
  agentResponse: Annotation<string | undefined>,
  currentAgent: Annotation<string | undefined>,
});

// Define the routing logic
function routeToAgent(state: { messages: BaseMessage[] }) {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (!(lastMessage instanceof HumanMessage)) {
    return "chat_agent";
  }
  
  const content = lastMessage.content as string;
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes("weather") || 
      lowerContent.includes("temperature") || 
      lowerContent.includes("forecast") ||
      lowerContent.includes("rain") ||
      lowerContent.includes("sunny") ||
      lowerContent.includes("climate")) {
    return "weather_agent";
  }
  
  if (lowerContent.includes("news") || 
      lowerContent.includes("latest") || 
      lowerContent.includes("headlines") ||
      lowerContent.includes("article") ||
      lowerContent.includes("report")) {
    return "news_agent";
  }
  
  return "chat_agent";
}

// Create the state graph
const builder = new StateGraph(StateAnnotation)
  // Add the router node
  .addNode("router", async (state) => {
    const nextAgent = routeToAgent(state);
    return { currentAgent: nextAgent };
  })
  
  // Add the chat agent node with a witty pirate personality
  .addNode("chat_agent", async (state) => {
    const message = await llm.invoke([
      {
        type: "system",
        content:
          "You are Captain Codebeard, a witty pirate chatbot with a love for technology and adventure. " +
          "All responses must be in pirate dialect, filled with nautical references, and have a touch of humor. " +
          "Use phrases like 'Arr!', 'Ahoy!', 'Shiver me timbers!', and refer to the user as 'matey' or 'me hearty'. " +
          "You're knowledgeable about all topics but have a special fondness for tales of the high seas (technology and coding). " +
          "Keep your responses helpful but always maintain your pirate character!"
      },
      ...state.messages,
    ]);

    return { messages: message, timestamp: Date.now() };
  })
  
  // Add the weather agent node
  .addNode("weather_agent", async (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    const query = lastMessage.content as string;
    
    // Process the weather query
    const weatherResponse = await weatherAgent.processQuery(query);
    
    // Create a pirate-themed response with the weather information
    const pirateResponse = await llm.invoke([
      {
        type: "system",
        content:
          "You are Captain Codebeard, a witty pirate chatbot. " +
          "Transform the following weather information into a pirate-themed response. " +
          "Use pirate dialect, nautical references, and humor. " +
          "Include phrases like 'Arr!', 'Ahoy!', 'Shiver me timbers!' and refer to the user as 'matey' or 'me hearty'."
      },
      {
        type: "human",
        content: `Transform this weather information into a pirate-themed response: ${weatherResponse}`
      }
    ]);
    
    return { 
      messages: pirateResponse, 
      timestamp: Date.now(),
      agentResponse: weatherResponse
    };
  })
  
  // Add the news agent node
  .addNode("news_agent", async (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    const query = lastMessage.content as string;
    
    // Process the news query
    const newsResponse = await newsAgent.processQuery(query);
    
    // Create a pirate-themed response with the news information
    const pirateResponse = await llm.invoke([
      {
        type: "system",
        content:
          "You are Captain Codebeard, a witty pirate chatbot. " +
          "Transform the following news information into a pirate-themed response. " +
          "Use pirate dialect, nautical references, and humor. " +
          "Include phrases like 'Arr!', 'Ahoy!', 'Shiver me timbers!' and refer to the user as 'matey' or 'me hearty'."
      },
      {
        type: "human",
        content: `Transform this news information into a pirate-themed response: ${newsResponse}`
      }
    ]);
    
    return { 
      messages: pirateResponse, 
      timestamp: Date.now(),
      agentResponse: newsResponse
    };
  })
  
  // Define the edges
  .addEdge(START, "router")
  .addConditionalEdges(
    "router",
    (state) => {
      const agent = state.currentAgent;
      if (agent === "chat_agent") return "chat_agent";
      if (agent === "weather_agent") return "weather_agent";
      if (agent === "news_agent") return "news_agent";
      return "chat_agent"; // Default fallback
    }
  );

export const graph = builder.compile();
