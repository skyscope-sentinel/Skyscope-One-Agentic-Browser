import { Expert, ExpertContext, ExpertResponse } from './swarm';
import { Message } from './index';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base implementation of an Expert with common functionality
 */
abstract class BaseExpert implements Expert {
  id: string;
  
  constructor(
    public name: string,
    public description: string,
    public specialties: string[],
    private keywords: string[]
  ) {
    this.id = uuidv4();
  }

  /**
   * Determines if this expert should participate based on keywords in the last user message
   * @param messages The conversation history
   * @param tabSnapshot Optional DOM snapshot of the current browser tab
   * @returns boolean indicating if this expert should be activated
   */
  decide(messages: Message[], tabSnapshot?: string): boolean {
    // Get the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage || !lastUserMessage.content) return false;
    
    // Check if any keywords match in the message
    const content = lastUserMessage.content.toLowerCase();
    return this.keywords.some(keyword => content.includes(keyword.toLowerCase()));
  }

  /**
   * Generates the expert's contribution to the response
   * @param messages The conversation history
   * @param context Additional context including tabSnapshot and tools
   * @returns Promise resolving to a partial message with confidence score
   */
  abstract act(messages: Message[], context: ExpertContext): Promise<ExpertResponse>;
}

/**
 * Registry that manages all available experts
 */
export class ExpertRegistry {
  private experts: Expert[] = [];

  constructor() {
    this.initializeExperts();
  }

  /**
   * Get all registered experts
   * @returns Array of all experts
   */
  getAllExperts(): Expert[] {
    return this.experts;
  }

  /**
   * Get an expert by ID
   * @param id The expert's unique ID
   * @returns The expert or undefined if not found
   */
  getExpertById(id: string): Expert | undefined {
    return this.experts.find(expert => expert.id === id);
  }

  /**
   * Get experts by specialty
   * @param specialty The specialty to filter by
   * @returns Array of experts with the given specialty
   */
  getExpertsBySpecialty(specialty: string): Expert[] {
    return this.experts.filter(expert => 
      expert.specialties.some(s => s.toLowerCase() === specialty.toLowerCase())
    );
  }

  /**
   * Initialize all 30 expert implementations
   */
  private initializeExperts(): void {
    this.experts = [
      // 1. Planner Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Planner",
            "Creates structured plans and breaks down complex tasks into manageable steps",
            ["planning", "task decomposition", "strategy"],
            ["plan", "steps", "organize", "structure", "strategy", "approach", "how should I"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || "";
          
          return {
            content: `I'll help break this down into a structured plan. Let's approach this methodically by first understanding what we need to accomplish, then creating a step-by-step approach with clear milestones.`,
            score: 85
          };
        }
      },

      // 2. DOM Navigator Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "DOM Navigator",
            "Specializes in traversing and understanding web page structures",
            ["DOM", "web navigation", "page structure"],
            ["find element", "locate", "navigate", "scroll", "page", "website", "element", "selector"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          // Use tab snapshot if available
          const hasSnapshot = !!context.tabSnapshot;
          
          return {
            content: `I can help navigate the page structure${hasSnapshot ? " based on the current page snapshot" : ""}. To locate the elements you need, we should use precise CSS selectors or XPath expressions for reliable targeting.`,
            score: hasSnapshot ? 90 : 60
          };
        }
      },

      // 3. DOM Interactor Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "DOM Interactor",
            "Executes interactions with web elements like clicking, typing, and form manipulation",
            ["interaction", "clicks", "input", "forms"],
            ["click", "type", "input", "fill", "submit", "button", "interact", "press"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help interact with elements on the page. We can simulate user actions like clicking buttons, filling forms, or submitting data through precise DOM interactions.`,
            score: 75
          };
        }
      },

      // 4. Form Filler Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Form Filler",
            "Specializes in automatically filling out web forms with appropriate data",
            ["forms", "data entry", "input validation"],
            ["form", "fill", "input", "field", "complete", "submit", "registration", "signup", "login"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help fill out forms efficiently. I'll identify all required fields, populate them with appropriate data, and handle any validation requirements before submission.`,
            score: 80
          };
        }
      },

      // 5. OAuth Specialist Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "OAuth Specialist",
            "Manages OAuth flows and secure authentication processes",
            ["oauth", "authentication", "authorization", "tokens"],
            ["login", "oauth", "authenticate", "authorize", "token", "sign in", "authentication", "permission"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I'll help manage the OAuth authentication flow. This will involve initiating the authorization request, handling the redirect, securely exchanging the code for tokens, and properly storing credentials.`,
            score: 90
          };
        }
      },

      // 6. Credential Specialist Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Credential Specialist",
            "Securely manages and applies user credentials across services",
            ["credentials", "security", "keychain", "passwords"],
            ["password", "credential", "secure", "keychain", "login", "secret", "api key"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help securely manage credentials using the system's secure storage (keytar). We'll ensure sensitive information is never exposed in plaintext and is properly encrypted at rest.`,
            score: 85
          };
        }
      },

      // 7. Visual Understanding Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Visual Understanding",
            "Analyzes and interprets visual content from web pages and images",
            ["vision", "images", "visual analysis", "screenshots"],
            ["image", "picture", "screenshot", "visual", "see", "look", "identify", "recognize"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          const hasSnapshot = !!context.tabSnapshot;
          
          return {
            content: `I can analyze the visual elements on the page${hasSnapshot ? " using the current snapshot" : ""}. This includes identifying UI components, understanding layouts, and interpreting images and their context within the page.`,
            score: hasSnapshot ? 85 : 50
          };
        }
      },

      // 8. Accessibility Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Accessibility",
            "Ensures web interactions are accessible and follow WCAG guidelines",
            ["accessibility", "a11y", "WCAG", "screen readers"],
            ["accessible", "accessibility", "a11y", "wcag", "aria", "screen reader", "disability"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help ensure our interactions are accessible. We should focus on using proper ARIA attributes, ensuring keyboard navigability, and maintaining sufficient color contrast for all users.`,
            score: 75
          };
        }
      },

      // 9. Data Extractor Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Data Extractor",
            "Extracts structured data from web pages and converts it to usable formats",
            ["data extraction", "scraping", "parsing"],
            ["extract", "scrape", "gather", "collect", "data", "information", "pull", "get"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can extract structured data from the page content. We'll identify the relevant information patterns, extract the data systematically, and organize it into a clean, structured format for further use.`,
            score: 80
          };
        }
      },

      // 10. Table Parser Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Table Parser",
            "Specializes in extracting and processing tabular data from web pages",
            ["tables", "tabular data", "rows and columns"],
            ["table", "row", "column", "cell", "tabular", "grid", "spreadsheet"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can parse table structures from the page. I'll identify the table headers, extract row and column data, and convert it into a structured format like JSON or CSV that preserves the relationships between data points.`,
            score: 85
          };
        }
      },

      // 11. OCR Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "OCR",
            "Performs optical character recognition on images to extract text",
            ["optical character recognition", "text extraction", "image to text"],
            ["ocr", "text from image", "extract text", "read image", "scan", "recognize text"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help extract text from images using OCR techniques. This is particularly useful for screenshots, images with embedded text, or content that's not directly accessible in the DOM.`,
            score: 70
          };
        }
      },

      // 12. Document Summarizer Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Document Summarizer",
            "Creates concise summaries of long documents and web pages",
            ["summarization", "content analysis", "key points"],
            ["summarize", "summary", "brief", "condense", "key points", "tldr", "overview"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can summarize the key information from this content. I'll identify the main topics, extract the most important points, and create a concise summary that captures the essential information.`,
            score: 75
          };
        }
      },

      // 13. Workflow Orchestrator Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Workflow Orchestrator",
            "Coordinates complex multi-step workflows across different systems",
            ["workflows", "process automation", "orchestration"],
            ["workflow", "process", "sequence", "automate", "orchestrate", "pipeline", "steps"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can orchestrate a multi-step workflow for this task. We'll define clear transitions between steps, handle state management throughout the process, and ensure proper error handling at each stage.`,
            score: 85
          };
        }
      },

      // 14. Search & Discovery Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Search & Discovery",
            "Finds information and resources across web pages and services",
            ["search", "discovery", "information retrieval"],
            ["search", "find", "locate", "discover", "lookup", "query", "research"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help search for and discover the information you need. I'll use effective search strategies, filters, and targeted queries to find the most relevant resources quickly.`,
            score: 75
          };
        }
      },

      // 15. Provider Router Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Provider Router",
            "Selects the optimal AI provider for different types of requests",
            ["provider selection", "routing", "model selection"],
            ["model", "provider", "ai", "llm", "gpt", "choose", "select", "route"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I'll help select the optimal provider for this request. Based on the task requirements, we should route this to a provider with strong capabilities in visual understanding and structured data extraction.`,
            score: 70
          };
        }
      },

      // 16. Cost Optimizer Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Cost Optimizer",
            "Minimizes API and resource costs while maintaining quality",
            ["cost optimization", "efficiency", "resource management"],
            ["cost", "optimize", "efficient", "budget", "save", "expense", "token", "usage"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help optimize costs for this operation. We should use efficient prompting techniques, minimize unnecessary API calls, and select the most cost-effective provider for this specific task type.`,
            score: 65
          };
        }
      },

      // 17. Rate Limiter Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Rate Limiter",
            "Manages API rate limits and prevents throttling issues",
            ["rate limiting", "throttling", "API management"],
            ["rate limit", "throttle", "quota", "api limit", "too many requests", "429", "backoff"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I'll help manage API rate limits for this task. We should implement proper request spacing, track usage quotas, and set up adaptive backoff strategies to prevent throttling while maintaining throughput.`,
            score: 70
          };
        }
      },

      // 18. Safety & Consent Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Safety & Consent",
            "Ensures operations follow safety guidelines and user consent",
            ["safety", "consent", "permissions", "ethics"],
            ["safety", "consent", "permission", "ethical", "allowed", "privacy", "secure", "compliance"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I'll ensure we handle this request with appropriate safety measures. We should verify user consent before proceeding, maintain privacy of sensitive data, and follow ethical guidelines throughout the process.`,
            score: 75
          };
        }
      },

      // 19. Error Recovery Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Error Recovery",
            "Diagnoses and recovers from errors during operations",
            ["error handling", "recovery", "resilience"],
            ["error", "fail", "exception", "crash", "recover", "fix", "problem", "issue", "debug"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help implement robust error recovery for this operation. We should add specific error detection points, implement graceful fallbacks, and ensure the system can recover from unexpected failures.`,
            score: 75
          };
        }
      },

      // 20. Retry/Backoff Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Retry/Backoff",
            "Implements intelligent retry strategies for failed operations",
            ["retries", "exponential backoff", "fault tolerance"],
            ["retry", "backoff", "attempt", "try again", "failed", "exponential", "jitter"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I'll implement an effective retry strategy for this operation. We should use exponential backoff with jitter, set appropriate retry limits, and ensure we're only retrying operations that are safe to repeat.`,
            score: 70
          };
        }
      },

      // 21. Timeout Supervisor Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Timeout Supervisor",
            "Manages timeouts and ensures operations complete within time constraints",
            ["timeouts", "deadlines", "time management"],
            ["timeout", "deadline", "time limit", "duration", "wait", "delay", "stuck"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I'll help manage timeouts for this operation. We should set appropriate timeout thresholds for each step, implement graceful cancellation, and ensure the overall process completes within reasonable time constraints.`,
            score: 65
          };
        }
      },

      // 22. State/Memory Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "State/Memory",
            "Manages persistent state and memory across operations",
            ["state management", "persistence", "memory"],
            ["state", "memory", "remember", "store", "save", "persist", "recall", "previous"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I'll help manage state for this multi-step process. We should implement a structured state object, persist critical information between steps, and ensure we can recover state if the process is interrupted.`,
            score: 75
          };
        }
      },

      // 23. Context Compressor Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Context Compressor",
            "Optimizes and compresses context to fit within token limits",
            ["context optimization", "compression", "token management"],
            ["compress", "context", "token", "limit", "optimize", "summarize", "reduce", "condense"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help compress the context for more efficient processing. We should focus on extracting the essential information, removing redundancies, and structuring the data to minimize token usage while preserving meaning.`,
            score: 70
          };
        }
      },

      // 24. Long-Context Chunker Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Long-Context Chunker",
            "Breaks down long contexts into manageable chunks for processing",
            ["chunking", "segmentation", "long context"],
            ["chunk", "split", "segment", "divide", "long", "large", "context", "break down"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I'll help chunk this long content into manageable segments. We should divide it based on logical boundaries, maintain context between chunks, and implement a strategy to recombine the processed results.`,
            score: 75
          };
        }
      },

      // 25. Tool Selection Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Tool Selection",
            "Chooses the optimal tools and functions for different tasks",
            ["tool selection", "function calling", "capabilities"],
            ["tool", "function", "capability", "select", "choose", "use", "call", "invoke"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          const availableTools = context.tools || [];
          
          return {
            content: `I can help select the optimal tools for this task. Based on the requirements, we should prioritize tools that provide ${availableTools.length > 0 ? 'the specific capabilities from our available toolset' : 'web interaction and data extraction capabilities'}.`,
            score: 80
          };
        }
      },

      // 26. Script Runner Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Script Runner",
            "Executes and manages scripts for automation tasks",
            ["scripting", "automation", "execution"],
            ["script", "run", "execute", "automate", "code", "javascript", "program"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help create and execute scripts for this automation task. We should use JavaScript with proper error handling, implement the core logic in modular functions, and ensure the script runs safely in the appropriate context.`,
            score: 80
          };
        }
      },

      // 27. Download Manager Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Download Manager",
            "Manages file downloads and ensures they complete successfully",
            ["downloads", "file management", "transfer"],
            ["download", "file", "save", "get", "fetch", "retrieve", "transfer"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help manage the download process. We should implement progress tracking, handle interruptions gracefully, verify file integrity after download, and ensure proper permissions for the save location.`,
            score: 75
          };
        }
      },

      // 28. Upload Agent Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Upload Agent",
            "Handles file uploads and ensures they complete successfully",
            ["uploads", "file transfer", "submission"],
            ["upload", "file", "submit", "send", "attach", "transfer", "share"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help manage the file upload process. We should handle file selection, implement chunked uploading for large files if needed, track progress, and verify successful receipt by the server.`,
            score: 75
          };
        }
      },

      // 29. File System Integrations Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "File System Integrations",
            "Manages interactions with the local file system",
            ["file system", "storage", "I/O"],
            ["file", "folder", "directory", "save", "open", "read", "write", "local"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help with file system operations. We should use the appropriate secure APIs to access files, implement proper error handling for file operations, and ensure we have the necessary permissions.`,
            score: 70
          };
        }
      },

      // 30. Analytics Agent Expert
      new class extends BaseExpert {
        constructor() {
          super(
            "Analytics Agent",
            "Collects and analyzes usage data to improve performance",
            ["analytics", "metrics", "performance"],
            ["analytics", "track", "measure", "metric", "performance", "usage", "statistics", "data"]
          );
        }

        async act(messages: Message[], context: ExpertContext): Promise<ExpertResponse> {
          return {
            content: `I can help implement analytics for this process. We should track key performance metrics, collect usage patterns anonymously, and use this data to identify optimization opportunities while respecting privacy.`,
            score: 65
          };
        }
      }
    ];
  }
}
