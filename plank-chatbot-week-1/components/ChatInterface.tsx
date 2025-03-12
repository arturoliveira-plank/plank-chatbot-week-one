"use client";

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';

// Define the Message type
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatInterface() {
  const [chatId] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('chatId');
      if (savedId) return savedId;
      const newId = `chat-${Date.now()}`;
      localStorage.setItem('chatId', newId);
      return newId;
    }
    return `chat-${Date.now()}`;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatId', chatId);
    }
  }, [chatId]);

  const [streamingContent, setStreamingContent] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const { input, handleInputChange, handleSubmit, isLoading } = useChat({
    id: chatId,
    api: '/api/chat',
    initialMessages: [],
    body: {
      id: chatId,
      messages: messages.filter((msg) => msg.role === 'user'), // Only send user messages
    },
    onResponse: async (response) => {
      if (!response.ok) {
        console.error('Response error:', response.statusText);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      setStreamingContent("");

      let accumulatedContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setMessages((prev) => [
            ...prev,
            { id: `ai-${Date.now()}`, role: 'assistant', content: accumulatedContent },
          ]);
          setStreamingContent("");
          break;
        }

        const text = new TextDecoder().decode(value);
        accumulatedContent += text;
        setStreamingContent(accumulatedContent);
      }
    },
  });

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input || isLoading) return;

    const newUserMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: input };
    setMessages((prev) => [...prev, newUserMessage]);

    handleSubmit(e); // Trigger the API call
  };

  const displayMessages = streamingContent
    ? [...messages, { id: 'streaming', role: 'assistant', content: streamingContent } as Message]
    : messages;

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

      <form onSubmit={handleCustomSubmit} className="p-4 bg-gray-800 border-t border-gray-700">
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