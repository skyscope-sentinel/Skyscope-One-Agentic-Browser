import axios from 'axios';
import { z } from 'zod';
import { createSmolVLMProvider, isSmolVLMAvailable } from './providers/local/smolvlm-onnx';

// Define message types
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Define provider options
export interface ProviderOptions {
  tools?: any[];
  tabSnapshot?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  /**
   * Optional explicit provider name to route the request.
   * If omitted, the default provider is used.
   */
  providerName?: string;
}

// Define provider interface
export interface Provider {
  chat(messages: Message[], options?: ProviderOptions): Promise<Message>;
}

// Define provider manager interface
export interface ProviderManager {
  chat(messages: Message[], options?: ProviderOptions): Promise<Message>;
  getDefaultProvider(): Provider;
  getProvider(name: string): Provider | undefined;
}

/**
 * Create a provider manager with access to different model providers
 * @returns ProviderManager instance
 */
export function createProviderManager(): ProviderManager {
  // Create default OpenAI-compatible provider
  const openAIProvider = createOpenAICompatibleProvider();
  
  // Create SmolVLM local ONNX provider
  const smolVLMProvider = createSmolVLMProvider();
  
  // Map of available providers
  const providers: Record<string, Provider> = {
    'openai': openAIProvider,
    'local-smolvlm': smolVLMProvider,
    // Additional providers can be added here
  };
  
  return {
    /**
     * Send a chat request to the default provider
     * @param messages Array of chat messages
     * @param options Provider options including tools and tab snapshot
     * @returns Promise resolving to the assistant's response message
     */
    async chat(messages: Message[], options?: ProviderOptions): Promise<Message> {
      const provider = options?.providerName ? providers[options.providerName.toLowerCase()] ?? openAIProvider : openAIProvider;
      return provider.chat(messages, options);
    },
    
    /**
     * Get the default provider
     * @returns Default Provider instance
     */
    getDefaultProvider(): Provider {
      return openAIProvider;
    },
    
    /**
     * Get a specific provider by name
     * @param name Provider name
     * @returns Provider instance or undefined if not found
     */
    getProvider(name: string): Provider | undefined {
      return providers[name.toLowerCase()];
    }
  };
}

/**
 * Create an OpenAI-compatible provider that works with various API-compatible services
 * @returns Provider instance
 */
function createOpenAICompatibleProvider(): Provider {
  // Get configuration from environment variables
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = process.env.OPENAI_API_KEY || '';
  const defaultModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  
  return {
    /**
     * Send a chat request to the OpenAI-compatible API
     * @param messages Array of chat messages
     * @param options Provider options including tools and tab snapshot
     * @returns Promise resolving to the assistant's response message
     */
    async chat(messages: Message[], options?: ProviderOptions): Promise<Message> {
      try {
        // Process messages if tabSnapshot is provided (vision capability)
        const processedMessages = processMessagesForVision(messages, options?.tabSnapshot);
        
        // Prepare request payload
        const payload = {
          model: defaultModel,
          messages: processedMessages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
          tools: options?.tools,
        };
        
        // Set timeout (default 30 seconds)
        const timeout = options?.timeout ?? 30000;
        
        // Make API request
        const response = await axios.post(
          `${baseUrl}/chat/completions`,
          payload,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout,
          }
        );
        
        // Extract and return the assistant's message
        if (response.data.choices && response.data.choices.length > 0) {
          return response.data.choices[0].message;
        }
        
        throw new Error('No response choices returned from provider');
      } catch (error) {
        // Handle errors
        if (axios.isAxiosError(error)) {
          if (error.response) {
            throw new Error(`Provider API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
          } else if (error.request) {
            throw new Error(`No response received from provider: ${error.message}`);
          } else {
            throw new Error(`Request configuration error: ${error.message}`);
          }
        }
        
        // Re-throw other errors
        throw error;
      }
    }
  };
}

/**
 * Process messages to include vision capability when tabSnapshot is provided
 * @param messages Original messages
 * @param tabSnapshot Optional DOM snapshot as base64 image
 * @returns Processed messages with embedded image if applicable
 */
function processMessagesForVision(messages: Message[], tabSnapshot?: string): any[] {
  if (!tabSnapshot) {
    return messages;
  }
  
  // Clone messages to avoid mutating the original array
  const processedMessages = [...messages];
  
  // Find the last user message to embed the image
  const lastUserMessageIndex = processedMessages
    .map((msg, index) => ({ role: msg.role, index }))
    .filter(item => item.role === 'user')
    .pop()?.index;
  
  if (lastUserMessageIndex !== undefined) {
    const lastUserMessage = processedMessages[lastUserMessageIndex];
    
    // Convert the message to the format required for vision
    processedMessages[lastUserMessageIndex] = {
      role: 'user',
      content: [
        // Include original text content if it exists
        ...(lastUserMessage.content ? [{ type: 'text', text: lastUserMessage.content }] : []),
        // Add the image
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${tabSnapshot}`,
            detail: 'high'
          }
        }
      ]
    };
  }
  
  return processedMessages;
}

// Export types and functions
export type { Provider, ProviderOptions };
export { isSmolVLMAvailable };
