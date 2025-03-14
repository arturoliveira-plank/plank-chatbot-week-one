# Plank Chatbot

A military-grade chatbot that embodies the personality of a Navy SEAL, built with Next.js, LangChain, and Supabase. Experience secure authentication and engage in tactical conversations with an AI that maintains the discipline and demeanor of an elite special operations force member.

🌐 **Live Demo:** [https://chatbot-week-one.vercel.app/](https://chatbot-week-one.vercel.app/)

## Features

- 🤖 Advanced chatbot powered by LangChain and OpenAI
- 🎨 Modern UI with Tailwind CSS and Radix UI components
- 🔐 Authentication with Supabase
- 📊 Conversation history and state management
- 🚀 Built with Next.js 15 and TypeScript
- 📱 Responsive design

## Prerequisites

- Node.js (v18 or higher)
- Yarn package manager
- Supabase account
- OpenAI API key

## Setup Instructions

1. Clone the repository:
```bash
git clone <repository-url>
cd plank-chatbot-week-1
```

2. Install dependencies:
```bash
yarn install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in the required environment variables:
     - Supabase credentials
     - OpenAI API key
     - Other configuration values

4. Run the development server:
```bash
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/app` - Next.js application routes and pages
- `/components` - Reusable UI components
- `/hooks` - Custom React hooks
- `/lib` - Utility functions and configurations
- `/utils` - Helper functions
- `/public` - Static assets

## Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build production application
- `yarn start` - Start production server
- `yarn lint` - Run ESLint
- `yarn format` - Format code with Prettier

## Technologies Used

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Authentication**: Supabase Auth
- **Database**: Supabase
- **AI/ML**: LangChain, OpenAI
- **State Management**: React Hooks
- **Form Validation**: Zod
- **Development Tools**: ESLint, Prettier

## Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
LANGCHAIN_CALLBACKS_BACKGROUND=false

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: LangSmith Configuration (for debugging)
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT=your_langsmith_endpoint
LANGSMITH_API_KEY=your_langsmith_api_key

# Optional: Additional API Keys
NEWSAPI_KEY=your_newsapi_key
OPENWEATHER_API_KEY=your_openweather_api_key
TAVILY_API_KEY=your_tavily_api_key
```

To get these values:
1. OpenAI API Key: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Supabase Keys: Create a project at [Supabase](https://supabase.com) and get the credentials from your project settings
3. Tavily API Key: Sign up at [Tavily AI](https://tavily.com) to get your API key for advanced search capabilities

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request
