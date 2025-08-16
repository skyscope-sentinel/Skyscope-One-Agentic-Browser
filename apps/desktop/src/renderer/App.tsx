import React, { useState, useRef, useEffect } from 'react'
import type { SkyscopeAPI } from '../preload'

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content?: string
  name?: string
}

interface AppProps {
  api: SkyscopeAPI
}

const App: React.FC<AppProps> = ({ api }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'Welcome to Skyscope One. How can I assist you today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [swarmEnabled, setSwarmEnabled] = useState(true)
  const [currentUrl, setCurrentUrl] = useState('about:blank')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const webviewRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Get current tab snapshot (placeholder for now)
      const tabSnapshot = webviewRef.current?.innerHTML || ''
      
      // Call the agent API with swarm mode toggle
      const response = await api.chat([...messages, userMessage], {
        tabSnapshot,
        swarmEnabled
      })
      
      // Add assistant response to messages
      if (response && response.message) {
        setMessages(prev => [...prev, response.message])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error processing your request.' 
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="app-container">
      {/* App header with draggable region */}
      <div className="app-header">
        <div className="drag-region">Skyscope One</div>
        <div className="header-controls">
          <button className="icon-button">⚙️</button>
        </div>
      </div>

      {/* Main content with split layout */}
      <div className="main-content">
        {/* Left sidebar with chat */}
        <div className="sidebar">
          <div className="messages-container">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div className="message assistant-message loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="input-container">
            <div className="swarm-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={swarmEnabled}
                  onChange={() => setSwarmEnabled(!swarmEnabled)}
                />
                30-Expert Swarm Mode
              </label>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={3}
              className="chat-input"
            />
            <button 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              className="send-button"
            >
              Send
            </button>
          </div>
        </div>

        {/* Right side webview area (placeholder) */}
        <div className="webview-container">
          <div className="browser-controls">
            <input 
              type="text" 
              value={currentUrl} 
              onChange={(e) => setCurrentUrl(e.target.value)}
              className="url-bar"
            />
            <button className="nav-button">Go</button>
          </div>
          <div className="webview-content" ref={webviewRef}>
            <div className="webview-placeholder">
              <h2>Webview Placeholder</h2>
              <p>Browser content will appear here</p>
            </div>
          </div>
        </div>
      </div>

      {/* App footer */}
      <div className="app-footer">
        <div className="status-bar">
          {swarmEnabled ? '30-Expert Swarm: Active' : 'Standard Mode'}
        </div>
      </div>
    </div>
  )
}

export default App
