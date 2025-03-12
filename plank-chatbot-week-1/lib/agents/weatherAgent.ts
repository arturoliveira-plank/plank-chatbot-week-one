import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Tool } from '@langchain/core/tools';

// Weather API Tool
class WeatherTool extends Tool {
  name = "weather";
  description = "Get current weather information for a location";
  
  constructor(private apiKey: string) {
    super();
  }

  async _call(location: string): Promise<string> {
    try {
      // First, get coordinates for the location
      const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${this.apiKey}`;
      const geoResponse = await fetch(geoUrl);
      const geoData = await geoResponse.json();
      
      if (!geoData || geoData.length === 0) {
        return `Could not find location: ${location}`;
      }
      
      const { lat, lon } = geoData[0];
      
      // Then, get weather data using coordinates
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${this.apiKey}`;
      const weatherResponse = await fetch(weatherUrl);
      const weatherData = await weatherResponse.json();
      
      if (weatherData.cod !== 200) {
        return `Error getting weather: ${weatherData.message}`;
      }
      
      // Format the weather data
      const temp = weatherData.main.temp;
      const feelsLike = weatherData.main.feels_like;
      const description = weatherData.weather[0].description;
      const humidity = weatherData.main.humidity;
      const windSpeed = weatherData.wind.speed;
      const cityName = weatherData.name;
      const country = weatherData.sys.country;
      
      return `
Weather for ${cityName}, ${country}:
- Temperature: ${temp}°C (feels like ${feelsLike}°C)
- Conditions: ${description}
- Humidity: ${humidity}%
- Wind Speed: ${windSpeed} m/s
      `.trim();
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return `Error fetching weather data: ${error}`;
    }
  }
}

export class WeatherAgent {
  private model: ChatOpenAI;
  private weatherTool: WeatherTool;
  private chain: RunnableSequence;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const weatherApiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    if (!weatherApiKey) {
      throw new Error('OPENWEATHER_API_KEY is not set in environment variables');
    }

    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      openAIApiKey: apiKey,
      temperature: 0.2,
    });
    
    this.weatherTool = new WeatherTool(weatherApiKey);

    // Create a prompt for the weather agent
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are a weather information specialist. 
Your job is to extract the location from the user's query and use the weather tool to get accurate weather information.
If the user's query is not about weather, politely inform them that you can only provide weather information.`],
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

  async getWeather(location: string): Promise<string> {
    try {
      return await this.weatherTool._call(location);
    } catch (error) {
      console.error("Error in weather agent:", error);
      return `Sorry, I couldn't get the weather information for ${location}. Please try again later.`;
    }
  }

  async processQuery(query: string): Promise<string> {
    try {
      // First, use the LLM to extract the location from the query
      const response = await this.chain.invoke({
        input: `Extract the location from this weather query: "${query}"`,
      });
      
      // Extract just the location name from the response
      const locationMatch = response.match(/location is:?\s*([^\.]+)/i) || 
                           response.match(/location:?\s*([^\.]+)/i) ||
                           response.match(/^([^\.]+)/i);
      
      const location = locationMatch ? locationMatch[1].trim() : query;
      
      // Get the weather for the extracted location
      return await this.getWeather(location);
    } catch (error) {
      console.error("Error processing weather query:", error);
      return "Sorry, I couldn't process your weather query. Please try again with a clear location.";
    }
  }
} 