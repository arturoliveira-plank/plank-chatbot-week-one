"use client";

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';

export default function ChatInterface() {
  const [chatId] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('chatId');
      if (savedId) return savedId;
      
      // Generate a new chat ID and save it
      const newId = `chat-${Date.now()}`;
      localStorage.setItem('chatId', newId);
      return newId;
    }
    return `chat-${Date.now()}`;
  });

  // Save chatId to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatId', chatId);
    }
  }, [chatId]);

  // Add state for streaming content
  const [streamingContent, setStreamingContent] = useState("");

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    id: chatId,
    api: '/api/chat',
    body: {
      id: chatId,
    },
    onResponse: async (response) => {
      if (!response.ok) {
        console.error('Response error:', response.statusText);
        return;
      }
      
      try {
        const reader = response.body?.getReader();
        if (!reader) return;
        
        // Reset streaming content at the start of new response
        setStreamingContent("");
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Convert the chunk to text and append to streaming content
          const text = new TextDecoder().decode(value);
          setStreamingContent(prev => prev + text);
        }
      } catch (error) {
        console.error('Error reading stream:', error);
      }
    },
    onFinish: (message) => {
      // Clear streaming content when message is complete
      setStreamingContent("");
      console.log('Finished message:', message);
    }
  });

  // Combine actual messages with streaming content for display
  const displayMessages = [...messages];
  if (streamingContent) {
    displayMessages.push({
      id: 'streaming',
      role: 'assistant',
      content: streamingContent,
    });
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayMessages.map((message, i) => (
          <div 
            key={message.id || i} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[70%] p-4 rounded-2xl ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.content}
                {message.id === 'streaming' && (
                  <span className="inline-block animate-pulse">▊</span>
                )}
              </div>
              <div className="text-sm text-gray-300 mt-2">
                {message.role === 'user' ? 'You' : 'AI'}
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
            disabled={isLoading}
            className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}