import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Tool } from '@langchain/core/tools';

// News API Tool
class NewsTool extends Tool {
  name = "news";
  description = "Get the latest news on a topic";
  
  constructor(private apiKey: string) {
    super();
  }

  async _call(topic: string): Promise<string> {
    try {
      // Get news data from NewsAPI
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&sortBy=publishedAt&language=en&pageSize=5&apiKey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'ok') {
        return `Error getting news: ${data.message || 'Unknown error'}`;
      }
      
      if (data.totalResults === 0) {
        return `No news found for topic: ${topic}`;
      }
      
      // Format the news data
      const articles = data.articles.slice(0, 5); // Limit to 5 articles
      let result = `Here are the latest news articles about "${topic}":\n\n`;
      
      articles.forEach((article: any, index: number) => {
        result += `${index + 1}. ${article.title}\n`;
        result += `   Source: ${article.source.name}\n`;
        result += `   Published: ${new Date(article.publishedAt).toLocaleString()}\n`;
        result += `   Summary: ${article.description || 'No description available'}\n\n`;
      });
      
      return result;
    } catch (error) {
      console.error("Error fetching news data:", error);
      return `Error fetching news data: ${error}`;
    }
  }
}

export class NewsAgent {
  private model: ChatOpenAI;
  private newsTool: NewsTool;
  private chain: RunnableSequence;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const newsApiKey = process.env.NEWSAPI_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    if (!newsApiKey) {
      throw new Error('NEWSAPI_KEY is not set in environment variables');
    }

    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      openAIApiKey: apiKey,
      temperature: 0.2,
    });
    
    this.newsTool = new NewsTool(newsApiKey);

    // Create a prompt for the news agent
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are a news specialist. 
Your job is to extract the topic from the user's query and use the news tool to get the latest news articles.
If the user's query is not about news, politely inform them that you can only provide news information.`],
      ['human', '{input}'],
    ]);

    this.chain = RunnableSequence.from([
      {
        input: (input: string) => input,
      },
      prompt,
      this.model,
      new StringOutputParser(),
    ]);
  }

  async getNews(topic: string): Promise<string> {
    try {
      return await this.newsTool._call(topic);
    } catch (error) {
      console.error("Error in news agent:", error);
      return `Sorry, I couldn't get the news information for ${topic}. Please try again later.`;
    }
  }

  async processQuery(query: string): Promise<string> {
    try {
      // First, use the LLM to extract the topic from the query
      const response = await this.chain.invoke({
        input: `Extract the news topic from this query: "${query}"`,
      });
      
      // Extract just the topic from the response
      const topicMatch = response.match(/topic is:?\s*([^\.]+)/i) || 
                         response.match(/topic:?\s*([^\.]+)/i) ||
                         response.match(/^([^\.]+)/i);
      
      const topic = topicMatch ? topicMatch[1].trim() : query;
      
      // Get the news for the extracted topic
      return await this.getNews(topic);
    } catch (error) {
      console.error("Error processing news query:", error);
      return "Sorry, I couldn't process your news query. Please try again with a clear topic.";
    }
  }
} 