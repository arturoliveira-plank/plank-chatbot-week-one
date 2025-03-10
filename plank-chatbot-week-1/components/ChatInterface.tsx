"use client";

import { useState } from 'react';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { createChatAgent } from '../lib/agents/chatAgent';

export default function ChatInterface() {
  const [messages, setMessages] = useState<BaseMessage[]>([]);
  const [input, setInput] = useState('');
  const chatAgent = createChatAgent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const userMessage = new HumanMessage(input);
    
    // Updating state
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Processing with agent  
    const result = await chatAgent.invoke({
      messages: [...messages, userMessage]
    });
    // Updating messages with response
    const lastMessage = result.messages[result.messages.length - 1];
    const messageContent = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : JSON.stringify(lastMessage.content);
    const aiMessage = new AIMessage(messageContent);
    setMessages(prev => [...prev, aiMessage]);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, i) => (
          <div 
            key={i} 
            className={`flex ${message instanceof HumanMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[70%] p-4 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-105 ${
                message instanceof HumanMessage 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
              </div>
              <div className={`mt-2 text-xs opacity-70 ${message instanceof HumanMessage ? 'text-right' : 'text-left'}`}>
                {message instanceof HumanMessage ? 'You' : 'Assistant'}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            placeholder="Type your message..."
          />
          <button 
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
