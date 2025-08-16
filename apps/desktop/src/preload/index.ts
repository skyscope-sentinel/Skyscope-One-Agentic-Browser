import { contextBridge, ipcRenderer } from 'electron'
import { z } from 'zod'

// Define validation schemas
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().optional(),
  name: z.string().optional(),
  tool_calls: z.array(z.any()).optional(),
  tool_call_id: z.string().optional(),
})

const ChatOptionsSchema = z.object({
  tabSnapshot: z.string().optional(),
  tools: z.array(z.string()).optional(),
  swarmEnabled: z.boolean().optional().default(true),
})

const AutomationTaskSchema = z.object({
  type: z.string(),
  target: z.string().optional(),
  action: z.string(),
  params: z.record(z.any()).optional(),
})

const ProviderSchema = z.string()

// Define API types for export
export type Message = z.infer<typeof MessageSchema>
export type ChatOptions = z.infer<typeof ChatOptionsSchema>
export type AutomationTask = z.infer<typeof AutomationTaskSchema>

// Define the API to expose to renderer
const api = {
  /**
   * Send a chat request to the agent
   * @param messages Array of chat messages
   * @param options Optional parameters including tab snapshot and tool selection
   * @returns Promise with the agent's response
   */
  chat: async (messages: Message[], options?: ChatOptions) => {
    try {
      // Validate inputs
      const validatedMessages = z.array(MessageSchema).parse(messages)
      const validatedOptions = options ? ChatOptionsSchema.parse(options) : {}
      
      // Call the main process
      return await ipcRenderer.invoke('agent:chat', {
        messages: validatedMessages,
        tabSnapshot: validatedOptions.tabSnapshot,
        tools: validatedOptions.tools,
        swarmEnabled: validatedOptions.swarmEnabled,
      })
    } catch (error) {
      console.error('Chat validation error:', error)
      throw error
    }
  },

  /**
   * Run a browser automation task
   * @param task The automation task to execute
   * @returns Promise with the task result
   */
  runAutomation: async (task: AutomationTask) => {
    try {
      // Validate input
      const validatedTask = AutomationTaskSchema.parse(task)
      
      // Call the main process
      return await ipcRenderer.invoke('automation:run', validatedTask)
    } catch (error) {
      console.error('Automation validation error:', error)
      throw error
    }
  },

  /**
   * Open OAuth flow for a specific provider
   * @param provider The OAuth provider name
   * @returns Promise with the OAuth result
   */
  openOAuthProvider: async (provider: string) => {
    try {
      // Validate input
      const validatedProvider = ProviderSchema.parse(provider)
      
      // Call the main process
      return await ipcRenderer.invoke('oauth:open', { provider: validatedProvider })
    } catch (error) {
      console.error('OAuth validation error:', error)
      throw error
    }
  },

  /**
   * Get the current app version
   * @returns Promise with the version string
   */
  getAppVersion: async () => {
    return await ipcRenderer.invoke('app:version')
  }
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('skyscope', api)

// Export types for the renderer
export type SkyscopeAPI = typeof api
