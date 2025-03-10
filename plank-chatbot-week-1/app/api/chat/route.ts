import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";

const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.7,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const response = await model.invoke(messages);
    
    return NextResponse.json({ 
      messages: [...messages, response]
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
} 