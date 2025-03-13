import {
  StateGraph,
  MessagesAnnotation,
  START,
  Annotation,
  END,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SystemMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),
});

const members = ["news", "weather", "chat"] as const;

const supervisorPrompt =
  "You are a supervisor tasked with managing a conversation between the" +
  " following workers: {members}. Given the following user request," +
  " respond with the worker to act next. Each worker will perform a" +
  " task and respond with their results and status. When finished," +
  " respond with FINISH.";

const options = [END, ...members];

const routingTool = {
  name: "route",
  description: "Select the next role.",
  schema: z.object({
    next: z.enum([END, ...members]),
  }),
};

const prompt = ChatPromptTemplate.fromMessages([
  ["system", supervisorPrompt],
  new MessagesPlaceholder("messages"),
  [
    "human",
    "Given the conversation above, who should act next?" +
    " Or should we FINISH? Select one of: {options}",
  ],
]);

const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  streaming: true,
});

const formattedPrompt = await prompt.partial({
  options: options.join(", "),
  members: members.join(", "),
});

const supervisorChain = formattedPrompt
  .pipe(llm.bindTools(
    [routingTool],
    {
      tool_choice: "route",
    },
  ))
  .pipe((x) => x.tool_calls?.[0]?.args);

const toolsWeather = [new TavilySearchResults({ maxResults: 1 })];

const commonPersonality =
  "You are a seal agent named David. " +
  "You are a tough to deal with person that can answer questions well but being kinda rude and not very friendly also stressed out " +
  "and help with tasks. When appropriate, use the provided tools to gather additional information.";

const weatherAgent = createReactAgent({
  llm,
  tools: toolsWeather,
  stateModifier: new SystemMessage(commonPersonality + "You are weather agent. You may use the Tavily search engine to search the web for" +
    "answer questions about the weather with the following weather with your personality:")
});

const weatherNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const result = await weatherAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({ content: lastMessage.content, name: "Weather Agent" }),
    ],
  };
};

const newsAgent = createReactAgent({
  llm,
  tools: toolsWeather,
  stateModifier: new SystemMessage(commonPersonality + "You are news agent. You may use the Tavily search engine to search the web for" +
    "answer questions about the news with the following news with your personality:")
});

const newsNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const result = await newsAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({ content: lastMessage.content, name: "News Agent" }),
    ],
  };
};

const chatAgent = createReactAgent({
  llm,
  tools: toolsWeather,
  stateModifier: new SystemMessage(commonPersonality + "You are chat agent." +
    "answer questions about the chat with the following chat with your personality:")
});

const chatNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const result = await chatAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({ content: lastMessage.content, name: "Chat Agent" }),
    ],
  };
};

// Define supervisor node with proper typing
const supervisorNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const result = await supervisorChain.invoke(state, config);
  return {
    next: result?.next ?? END,
  };
};

// Define the state graph
const builder = new StateGraph(AgentState)
  .addNode("weather", weatherNode)
  .addNode("news", newsNode)
  .addNode("chat", chatNode)
  .addNode("supervisor", supervisorNode);

members.forEach((member) => {
  builder.addEdge(member, "supervisor");
});

builder.addConditionalEdges(
  "supervisor",
  (x: typeof AgentState.State) => x.next,
);

builder.addEdge(START, "supervisor");

export const graph = builder.compile();