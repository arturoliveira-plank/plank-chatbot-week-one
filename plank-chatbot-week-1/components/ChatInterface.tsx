"use client";

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';

export default function ChatInterface() {
  // Generate a unique ID for the chat session if it doesn't exist
  const [chatId] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('chatId');
      return savedId || `chat-${Date.now()}`;
    }
    return `chat-${Date.now()}`;
  });

  // Load saved messages from localStorage
  const [savedMessages, setSavedMessages] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`messages-${chatId}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    id: chatId,
    initialMessages: savedMessages,
    api: '/api/chat',
    onFinish: (message) => {
      // Save messages to localStorage when a new message is added
      const updatedMessages = [...messages, message];
      if (typeof window !== 'undefined') {
        localStorage.setItem(`messages-${chatId}`, JSON.stringify(updatedMessages));
      }
    },
  });

  // Save chatId to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatId', chatId);
    }
  }, [chatId]);

  useEffect(() => {
    console.log("messages", messages);
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, i) => (
          <div 
            key={i} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[70%] p-4 rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-105 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.content}
              </div>
              <div className={`mt-2 text-xs opacity-70 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                {message.role === 'user' ? 'You' : 'Assistant'}
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
            onChange={handleInputChange}
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
