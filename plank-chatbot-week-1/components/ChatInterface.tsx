"use client";

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import { VoiceControls } from './VoiceControls';

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
  const [lastAssistantMessage, setLastAssistantMessage] = useState<string>("");

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
          const newMessage: Message = { id: `ai-${Date.now()}`, role: 'assistant' as const, content: accumulatedContent };
          setMessages((prev) => [...prev, newMessage]);
          setLastAssistantMessage(accumulatedContent);
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

  const handleVoiceInput = (text: string) => {
    const inputEvent = {
      target: { value: text }
    } as React.ChangeEvent<HTMLInputElement>;
    handleInputChange(inputEvent);
  };

  const clearHistory = () => {
    setMessages([]);
    setStreamingContent("");
    setLastAssistantMessage("");
  };

  const displayMessages = streamingContent
    ? [...messages, { id: 'streaming', role: 'assistant', content: streamingContent } as Message]
    : messages;

  useEffect(() => {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 text-white">
      <div className="chat-container flex-1 overflow-y-auto p-4 space-y-4">
        {displayMessages.map((message, i) => (
          <div
            key={message.id || i}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} transform transition-all duration-300 hover:scale-[1.02]`}
          >
            <div
              className={`max-w-[70%] p-4 rounded-lg border-2 ${
                message.role === 'user'
                  ? 'bg-navy-700 text-white border-navy-500'
                  : 'bg-navy-800 text-gray-100 border-navy-600'
              } shadow-lg hover:shadow-xl transition-all duration-300`}
            >
              <div className="whitespace-pre-wrap font-mono text-sm">
                {message.content}
                {message.id === 'streaming' && (
                  <span className="inline-block animate-pulse text-navy-300">▊</span>
                )}
              </div>
              <div className="text-xs text-navy-300 mt-2 font-mono">
                {message.role === 'user' ? 'CIVILIAN' : 'SEAL AGENT DAVID'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleCustomSubmit} className="p-4 bg-navy-900 border-t-2 border-navy-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            className="flex-1 p-3 rounded-lg bg-navy-800 border-2 border-navy-600 text-white placeholder-navy-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all duration-300"
            placeholder="Enter your message, civilian..."
          />
          <VoiceControls onVoiceInput={handleVoiceInput} messageToSpeak={lastAssistantMessage} />
          <button
            type="submit"
            disabled={isLoading}
            className={`px-6 py-3 bg-navy-700 text-white rounded-lg hover:bg-navy-600 transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-navy-500 font-mono text-sm ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            SEND
          </button>
        </div>
      </form>

      <button
        onClick={clearHistory}
        className="px-3 py-1 bg-gradient-to-r from-navy-700 to-navy-800 text-white rounded-full shadow-md hover:from-navy-600 hover:to-navy-700 transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-navy-500 font-mono text-xs mx-auto mb-4"
      >
        CLEAR TRANSMISSION LOG
      </button>
    </div>
  );
}