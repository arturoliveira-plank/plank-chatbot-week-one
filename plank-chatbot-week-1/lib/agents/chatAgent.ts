"use client";

import { OpenAI } from "openai";
import { wrapOpenAI } from "langsmith/wrappers";
import { ChatCompletionMessageParam } from "openai/resources/chat";

const openAIClient = wrapOpenAI(new OpenAI());

interface AgentState {
  messages: ChatCompletionMessageParam[];
}

async function processMessage(state: AgentState, message: string) {
  const updatedMessages: ChatCompletionMessageParam[] = [
    ...state.messages,
    { role: "user", content: message }
  ];

  const completion = await openAIClient.chat.completions.create({
    messages: updatedMessages,
    model: "gpt-4o-mini",
  });

  const assistantMessage = completion.choices[0].message;
  
  return {
    messages: [
      ...updatedMessages,
      assistantMessage
    ]
  };
}

// Função principal do agente
export async function chatAgent(initialMessage: string) {
  const initialState: AgentState = {
    messages: []
  };

  return await processMessage(initialState, initialMessage);
}

