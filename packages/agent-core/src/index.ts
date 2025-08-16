import { SwarmOrchestrator } from './swarm';
import { ExpertRegistry } from './experts';

// Define core types
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

export interface ChatRequest {
  messages: Message[];
  tabSnapshot?: string;
  tools?: string[];
  swarmEnabled?: boolean;
}

export interface ChatResponse {
  message: Message;
}

export interface ProviderManager {
  chat(messages: Message[], options?: any): Promise<Message>;
}

/**
 * Agent class that handles chat interactions and tool execution
 * Can operate in single-provider mode or delegate to a swarm of experts
 */
export class Agent {
  private swarmOrchestrator: SwarmOrchestrator;
  private expertRegistry: ExpertRegistry;

  constructor(private providerManager: ProviderManager) {
    this.expertRegistry = new ExpertRegistry();
    this.swarmOrchestrator = new SwarmOrchestrator(providerManager, this.expertRegistry);
  }

  /**
   * Handle a chat request, optionally using the expert swarm
   * @param request Chat request with messages, tools, and options
   * @returns Response with assistant message
   */
  async handleChat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, tabSnapshot, tools, swarmEnabled = false } = request;

    // If swarm mode is enabled, delegate to the 30-expert SwarmOrchestrator
    if (swarmEnabled) {
      const swarmResponse = await this.swarmOrchestrator.process({
        messages,
        tabSnapshot,
        tools
      });
      return { message: swarmResponse };
    }

    // Otherwise, make a simple provider call
    const response = await this.providerManager.chat(messages, {
      tools: tools ? this.prepareTools(tools) : undefined,
      tabSnapshot
    });

    return { message: response };
  }

  /**
   * Prepare tool definitions for provider function calling
   * @param toolNames Array of tool names to prepare
   * @returns Array of tool definitions
   */
  private prepareTools(toolNames: string[]): any[] {
    // Simple tool preparation logic - will be expanded later
    return toolNames.map(name => ({
      type: 'function',
      function: {
        name,
        description: `Tool for ${name}`,
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }));
  }
}
