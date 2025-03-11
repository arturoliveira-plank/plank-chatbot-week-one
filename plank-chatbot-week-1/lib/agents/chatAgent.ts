"use client";

import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { ChatAgent } from "../../app/api/chat/route";

interface AgentState {
  messages: ChatCompletionMessageParam[];
}

async function processMessage(state: AgentState, message: string) {
  try {
    const chatAgent = new ChatAgent();
    
    // Convert the current state to the format expected by ChatAgent
    const currentState = {
      messages: state.messages.map(msg => ({
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

// Main agent function
export async function chatAgent(initialMessage: string) {
  const initialState: AgentState = {
    messages: []
  };

  return await processMessage(initialState, initialMessage);
}

