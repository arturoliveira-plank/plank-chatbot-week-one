"use client";

import { RunnableSequence } from "@langchain/core/runnables";
import { OpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

// Definindo o tipo do estado
interface ChatState {
  messages: BaseMessage[];
}

// Inicializando o modelo LLM
const model = new OpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.7,
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY 
});

// Função para processar a mensagem
const processMessage = async (state: ChatState) => {
  const response = await model.invoke(state.messages);
  const messageContent = typeof response === 'object' && response !== null && 'choices' in response
    ? (response as OpenAIResponse).choices?.[0]?.message?.content || ''
    : String(response);
  return {
    messages: [...state.messages, { role: 'assistant', content: messageContent }]
  };
};

// Criando o agente
export const createChatAgent = () => {
  return RunnableSequence.from([
    (state: ChatState) => state,
    processMessage
  ]);
};

const systemPrompt = `Você é um especialista em programação que ajuda a melhorar código.
Sua tarefa é analisar o código fornecido e sugerir melhorias em termos de:
- Boas práticas de programação
- Performance
- Legibilidade
- Segurança
- Manutenibilidade

Retorne apenas o código melhorado, sem explicações adicionais.`;

export async function enhanceCode(code: string): Promise<string> {
  const userPrompt = `Here is the code, I need you to return the improved code:\n\n${code}`;

  try {
    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);
    
    return typeof response === 'object' && response !== null && 'choices' in response
      ? (response as OpenAIResponse).choices?.[0]?.message?.content || ''
      : String(response);
  } catch (error) {
    console.error("Erro ao melhorar o código:", error);
    throw new Error("Falha ao processar a melhoria do código");
  }
}
