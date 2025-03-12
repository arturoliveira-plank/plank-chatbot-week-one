This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Environment Variables

This project requires the following environment variables:

```
OPENAI_API_KEY="your_openai_api_key"
NEXT_PUBLIC_OPENAI_API_KEY="your_openai_api_key"
OPENWEATHER_API_KEY="your_openweather_api_key"
NEWSAPI_KEY="your_newsapi_key"
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
LANGSMITH_API_KEY="your_langsmith_api_key"
```

## Features

- **Multi-Agent System with LangGraph**: The chatbot uses a multi-agent system with a personality-driven Chat Agent, Weather Agent, and News Agent.
- **Personality**: The Chat Agent has a witty pirate personality named "Captain Codebeard".
- **Weather Information**: Ask about the weather in any location (e.g., "What's the weather in London?").
- **News Updates**: Get the latest news on any topic (e.g., "What's the latest news about AI?").
- **Routing Logic**: The system automatically routes queries to the appropriate agent based on the content.
- **LangSmith Tracing**: All agent interactions are traced in LangSmith for debugging and analysis.

## Deployment

The app is deployed at:

https://plank-chatbot-week-one-mkhm-k72bbtr07-arturs-projects-208a974c.vercel.app/