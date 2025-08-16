import { Message, ProviderManager } from './index';
import { ExpertRegistry } from './experts';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface defining an Expert in the swarm
 */
export interface Expert {
  /** Unique identifier for the expert */
  id: string;
  
  /** Display name of the expert */
  name: string;
  
  /** Detailed description of the expert's capabilities */
  description: string;
  
  /** Array of specialties/domains this expert excels in */
  specialties: string[];
  
  /**
   * Determines if this expert should participate in the current request
   * @param messages The conversation history
   * @param tabSnapshot Optional DOM snapshot of the current browser tab
   * @returns boolean indicating if this expert should be activated
   */
  decide(messages: Message[], tabSnapshot?: string): boolean;
  
  /**
   * Generates the expert's contribution to the response
   * @param messages The conversation history
   * @param context Additional context including tabSnapshot and tools
   * @returns Promise resolving to a partial message with optional confidence score
   */
  act(messages: Message[], context: ExpertContext): Promise<ExpertResponse>;
}

/**
 * Context provided to experts during execution
 */
export interface ExpertContext {
  tabSnapshot?: string;
  tools?: string[];
  providerManager: ProviderManager;
}

/**
 * Response from an expert including confidence score
 */
export interface ExpertResponse {
  content?: string;
  tool_calls?: any[];
  score?: number; // 0-100, higher means more confident
}

/**
 * Result from an expert after execution
 */
interface ExpertResult {
  expert: Expert;
  response: ExpertResponse;
  executionTime: number;
}

/**
 * Options for the swarm orchestration process
 */
export interface SwarmOptions {
  messages: Message[];
  tabSnapshot?: string;
  tools?: string[];
  maxExperts?: number; // Maximum number of experts to include in final response
  timeoutMs?: number; // Timeout for expert execution
}

/**
 * Orchestrates a swarm of experts to collaborate on generating responses
 */
export class SwarmOrchestrator {
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly DEFAULT_MAX_EXPERTS = 5;

  constructor(
    private providerManager: ProviderManager,
    private expertRegistry: ExpertRegistry
  ) {}

  /**
   * Process a request using the expert swarm
   * @param options SwarmOptions containing messages and context
   * @returns Promise resolving to the aggregated assistant message
   */
  async process(options: SwarmOptions): Promise<Message> {
    const {
      messages,
      tabSnapshot,
      tools,
      maxExperts = this.DEFAULT_MAX_EXPERTS,
      timeoutMs = this.DEFAULT_TIMEOUT
    } = options;

    // Step 1: Select relevant experts based on the conversation
    const relevantExperts = this.selectRelevantExperts(messages, tabSnapshot);
    
    if (relevantExperts.length === 0) {
      // If no experts are relevant, fall back to default provider
      const response = await this.providerManager.chat(messages, {
        tools: tools ? this.prepareTools(tools) : undefined,
        tabSnapshot
      });
      return response;
    }

    // Step 2: Execute relevant experts in parallel with timeout
    const expertResults = await this.executeExperts(
      relevantExperts,
      messages,
      { tabSnapshot, tools, providerManager: this.providerManager },
      timeoutMs
    );

    // Step 3: Rank and select top contributing experts
    const rankedResults = this.rankExpertResults(expertResults);
    const topResults = rankedResults.slice(0, maxExperts);

    // Step 4: Aggregate results into a single response
    const aggregatedResponse = this.aggregateResults(topResults, messages);

    return aggregatedResponse;
  }

  /**
   * Select experts that are relevant to the current conversation
   * @param messages The conversation history
   * @param tabSnapshot Optional DOM snapshot of the current browser tab
   * @returns Array of relevant experts
   */
  private selectRelevantExperts(messages: Message[], tabSnapshot?: string): Expert[] {
    const allExperts = this.expertRegistry.getAllExperts();
    return allExperts.filter(expert => expert.decide(messages, tabSnapshot));
  }

  /**
   * Execute multiple experts in parallel with timeout
   * @param experts Array of experts to execute
   * @param messages The conversation history
   * @param context Additional context for the experts
   * @param timeoutMs Timeout in milliseconds
   * @returns Promise resolving to array of expert results
   */
  private async executeExperts(
    experts: Expert[],
    messages: Message[],
    context: ExpertContext,
    timeoutMs: number
  ): Promise<ExpertResult[]> {
    // Create a promise for each expert with timeout
    const expertPromises = experts.map(async (expert) => {
      const startTime = Date.now();
      
      try {
        // Create a promise that resolves with the expert's response or rejects on timeout
        const response = await Promise.race([
          expert.act(messages, context),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Expert ${expert.name} timed out`)), timeoutMs);
          })
        ]);
        
        const executionTime = Date.now() - startTime;
        
        return {
          expert,
          response,
          executionTime
        };
      } catch (error) {
        console.error(`Error executing expert ${expert.name}:`, error);
        return null;
      }
    });
    
    // Wait for all expert promises to settle
    const results = await Promise.allSettled(expertPromises);
    
    // Filter out failed experts and nulls
    return results
      .filter((result): result is PromiseFulfilledResult<ExpertResult> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  /**
   * Rank expert results by score and other heuristics
   * @param results Array of expert results
   * @returns Sorted array of expert results
   */
  private rankExpertResults(results: ExpertResult[]): ExpertResult[] {
    return results
      .filter(result => {
        // Filter out empty or low-quality responses
        const hasContent = !!result.response.content?.trim();
        const hasToolCalls = !!result.response.tool_calls?.length;
        return hasContent || hasToolCalls;
      })
      .sort((a, b) => {
        // Primary sort by score (higher is better)
        const scoreA = a.response.score ?? 50;
        const scoreB = b.response.score ?? 50;
        
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        
        // Secondary sort by specialty count (fewer is more specific)
        const specialtyCountA = a.expert.specialties.length;
        const specialtyCountB = b.expert.specialties.length;
        
        if (specialtyCountA !== specialtyCountB) {
          return specialtyCountA - specialtyCountB;
        }
        
        // Tertiary sort by execution time (faster is better)
        return a.executionTime - b.executionTime;
      });
  }

  /**
   * Aggregate multiple expert results into a single assistant message
   * @param results Array of expert results to aggregate
   * @param originalMessages The original conversation history
   * @returns Aggregated assistant message
   */
  private aggregateResults(results: ExpertResult[], originalMessages: Message[]): Message {
    // If no valid results, return a fallback message
    if (results.length === 0) {
      return {
        role: 'assistant',
        content: "I'm analyzing your request, but need more information to provide a helpful response."
      };
    }

    // Single expert case - use their response directly
    if (results.length === 1) {
      const { response } = results[0];
      return {
        role: 'assistant',
        content: response.content,
        tool_calls: response.tool_calls
      };
    }

    // Multiple experts - aggregate their insights
    let aggregatedContent = '';
    const allToolCalls: any[] = [];
    
    // Add a brief intro for multi-expert responses
    aggregatedContent += "I've analyzed your request from multiple perspectives:\n\n";
    
    // Add each expert's contribution with a header
    results.forEach(({ expert, response }) => {
      if (response.content?.trim()) {
        aggregatedContent += `**${expert.name}**: ${response.content.trim()}\n\n`;
      }
      
      if (response.tool_calls?.length) {
        allToolCalls.push(...response.tool_calls);
      }
    });
    
    // Deduplicate tool calls by function name and arguments
    const uniqueToolCalls = this.deduplicateToolCalls(allToolCalls);
    
    // Create the final aggregated message
    return {
      role: 'assistant',
      content: aggregatedContent.trim(),
      tool_calls: uniqueToolCalls.length > 0 ? uniqueToolCalls : undefined
    };
  }

  /**
   * Deduplicate tool calls based on function name and arguments
   * @param toolCalls Array of tool calls to deduplicate
   * @returns Deduplicated array of tool calls with unique IDs
   */
  private deduplicateToolCalls(toolCalls: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];
    
    for (const call of toolCalls) {
      const key = `${call.function.name}:${call.function.arguments}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        // Ensure each tool call has a unique ID
        unique.push({
          ...call,
          id: call.id || uuidv4()
        });
      }
    }
    
    return unique;
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
