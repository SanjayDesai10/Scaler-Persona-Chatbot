import React, { useState, useEffect, useRef } from 'react'
import { Send, RotateCcw, MessageSquare, ShieldAlert, Sparkles, Brain, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

// Define Types
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  thinking?: string
  text?: string
}

interface Persona {
  id: 'anshuman' | 'abhimanyu' | 'kshitij'
  name: string
  role: string
  avatar: string
  description: string
  tags: string[]
  suggestions: string[]
  themeClass: string
}

// Personas Definitions
const PERSONAS: Persona[] = [
  {
    id: 'anshuman',
    name: 'Anshuman Singh',
    role: 'Co-founder, InterviewBit & Scaler',
    avatar: '/avatars/anshuman.png',
    description: 'Competitive programming legend and ex-Facebook Messenger lead. Focuses heavily on DSA, computer science fundamentals, and first-principles thinking.',
    tags: ['DSA', 'First Principles', 'ICPC', 'FB Messenger'],
    themeClass: 'anshuman',
    suggestions: [
      'How do I master DSA and first-principles thinking?',
      'Tell me about building Facebook Messenger\'s search backend.',
      'Why is competitive programming so important for engineers?'
    ]
  },
  {
    id: 'abhimanyu',
    name: 'Abhimanyu Saxena',
    role: 'Co-founder, InterviewBit & Scaler',
    avatar: '/avatars/abhimanyu.png',
    description: 'System architect and entrepreneur. Focuses on system design, database scalability, product market fit, and building large-scale platforms.',
    tags: ['System Design', 'Scale', 'Entrepreneurship', 'Tech Stack'],
    themeClass: 'abhimanyu',
    suggestions: [
      'How do I architect systems for millions of concurrent users?',
      'How did you validate product-market fit for InterviewBit?',
      'What traits separate a senior developer from an architect?'
    ]
  },
  {
    id: 'kshitij',
    name: 'Kshitij Mishra',
    role: 'Head of Instructors, Scaler',
    avatar: '/avatars/kshitij.png',
    description: 'Beloved educator and Head of Instructors. Known for high-energy teaching, simplifying low-level concepts with fun analogies, and friendly guidance.',
    tags: ['Head Teacher', 'Relatable Analogies', 'DSA Basics', 'Low-Level details'],
    themeClass: 'kshitij',
    suggestions: [
      'Can you explain recursion in simple words?',
      'What is the difference between SQL and NoSQL databases?',
      'How should I prepare for coding interviews in just 2 weeks?'
    ]
  }
]

export default function App() {
  const [activePersona, setActivePersona] = useState<Persona>(PERSONAS[0])
  const [conversations, setConversations] = useState<Record<string, Message[]>>({
    anshuman: [],
    abhimanyu: [],
    kshitij: []
  })
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Scroll to bottom whenever messages list or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations, isLoading, activePersona])

  const parseMessageContent = (content: string) => {
    const trimmed = content.trim()
    let thoughtStartTag = ''
    let thoughtEndTag = ''
    
    if (trimmed.startsWith('<thought>')) {
      thoughtStartTag = '<thought>'
      thoughtEndTag = '</thought>'
    } else if (trimmed.startsWith('<thinking_process>')) {
      thoughtStartTag = '<thinking_process>'
      thoughtEndTag = '</thinking_process>'
    }
    
    if (thoughtStartTag) {
      const endIndex = trimmed.indexOf(thoughtEndTag)
      if (endIndex !== -1) {
        // Closing tag found: separate reasoning and response text
        const thinking = trimmed.slice(thoughtStartTag.length, endIndex).trim()
        const text = trimmed.slice(endIndex + thoughtEndTag.length).trim()
        return { thinking, text }
      } else {
        // Still streaming the reasoning block
        const thinking = trimmed.slice(thoughtStartTag.length).trim()
        return { thinking, text: '' }
      }
    }
    return { thinking: undefined, text: content }
  }

  // Handle Switch Persona
  const handlePersonaChange = async (persona: Persona) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setActivePersona(persona)
    setErrorMessage(null)
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/chat`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ persona: persona.id.toUpperCase() })
      })
      // Clear conversation locally to keep in sync with backend reset
      setConversations(prev => ({
        ...prev,
        [persona.id]: []
      }))
    } catch (e: any) {
      setErrorMessage('Failed to change active persona context: ' + e.message)
    }
  }

  // Handle Reset Conversation
  const handleResetConversation = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setErrorMessage(null)
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/chat`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ persona: activePersona.id.toUpperCase() })
      })
      setConversations(prev => ({
        ...prev,
        [activePersona.id]: []
      }))
    } catch (e: any) {
      setErrorMessage('Failed to reset conversation: ' + e.message)
    }
  }


  // Send Message to API
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return

    const userMessageText = textToSend.trim()
    setInputText('')
    setErrorMessage(null)

    // Generate User Message Object
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Get current chat history for the active persona
    const currentHistory = conversations[activePersona.id]
    const updatedHistory = [...currentHistory, userMessage]

    // Update Local UI State with user's message
    setConversations(prev => ({
      ...prev,
      [activePersona.id]: updatedHistory
    }))

    setIsLoading(true)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      // API call to the backend using the new endpoint format
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userQuery: userMessageText
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''
      
      const assistantMessageId = `assistant-${Date.now()}`
      
      // Add initial empty assistant message to UI
      setConversations(prev => ({
        ...prev,
        [activePersona.id]: [
          ...updatedHistory,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            thinking: '',
            text: ''
          }
        ]
      }))

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunkText = decoder.decode(value, { stream: true })
        accumulatedContent += chunkText
        
        const { thinking, text } = parseMessageContent(accumulatedContent)

        setConversations(prev => {
          const currentList = prev[activePersona.id]
          return {
            ...prev,
            [activePersona.id]: currentList.map(msg => {
              if (msg.id === assistantMessageId) {
                return {
                  ...msg,
                  content: accumulatedContent,
                  thinking,
                  text
                }
              }
              return msg
            })
          }
        })


      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Intentionally aborted - do not show error banner
        return
      }
      console.error('Error during chat completion:', err)
      setErrorMessage(err.message || 'Something went wrong. Please verify your connection or try again.')
    } finally {
      setIsLoading(false)
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }

  // Shortcut key handling (Enter key)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputText)
    }
  }

  const activeHistory = conversations[activePersona.id]

  return (
    <div className="app-container">
      {/* Sidebar: Persona Selection */}
      <aside className={`sidebar${sidebarOpen ? '' : ' sidebar-mini'}`}>
        <div className="brand-section">
          <div className="brand-logo">S</div>
          <div className="brand-text">
            <span className="brand-title">ScalerBot</span>
            <span className="brand-tag">v1.0</span>
          </div>
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(prev => !prev)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
        </div>

        <div className="persona-list">
          {PERSONAS.map(p => {
            const isActive = activePersona.id === p.id
            return (
              <div
                key={p.id}
                className={`persona-card ${p.themeClass} ${isActive ? 'active' : ''}`}
                onClick={() => handlePersonaChange(p)}
              >
                <div className="persona-header">
                  <div className="avatar-wrapper">
                    <img 
                      src={p.avatar} 
                      alt={p.name} 
                      className="avatar" 
                      onError={(e) => {
                        // Fallback avatar if PNG does not exist yet
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`
                      }}
                    />
                    <div className="persona-badge"></div>
                  </div>
                  <div className="persona-meta">
                    <div className="persona-name">{p.name}</div>
                    <div className="persona-role">{p.role}</div>
                  </div>
                </div>
                <div className="persona-desc">{p.description}</div>
                <div className="persona-tags">
                  {p.tags.map(t => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="chat-section">
        {/* Chat Header */}
        <header className="chat-header">
          <div className="active-persona-indicator">
              <div className="active-indicator-circle"></div>
              <div>
                <div className="active-persona-title">{activePersona.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {activePersona.role}
                </div>
              </div>
            </div>
          
          <div className="chat-actions">
            <button 
              className="action-btn" 
              onClick={handleResetConversation}
              title="Reset current conversation"
              disabled={activeHistory.length === 0}
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>
        </header>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="error-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} />
              <span>{errorMessage}</span>
            </div>
            <button className="error-close-btn" onClick={() => setErrorMessage(null)}>
              &times;
            </button>
          </div>
        )}

        {/* Message Content Window */}
        <div className="messages-box">
          {activeHistory.length === 0 ? (
            <div className="welcome-screen">
              <div className={`welcome-logo ${activePersona.themeClass}-theme`}>
                {activePersona.id === 'anshuman' && <Brain size={36} />}
                {activePersona.id === 'abhimanyu' && <Sparkles size={36} />}
                {activePersona.id === 'kshitij' && <MessageSquare size={36} />}
              </div>
              <div>
                <h1 className="welcome-title">Chat with {activePersona.name}</h1>
                <p className="welcome-subtitle">
                  Ask me about my career, competitive programming, software architecture, scale, or educational journey. Let's have a real tech talk.
                </p>
              </div>

              {/* Suggestion Chips */}
              <div className="suggestion-container">
                {activePersona.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="suggestion-chip"
                    onClick={() => handleSendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeHistory.map(msg => {
              const isAssistant = msg.role === 'assistant'
              
              // Skip rendering assistant bubbles while they are in the thinking phase
              if (isAssistant && msg.text === '') {
                return null
              }

              const textContent = msg.text !== undefined ? msg.text : msg.content
              
              return (
                <div key={msg.id} className={`message-wrapper ${msg.role} ${isAssistant ? activePersona.themeClass : ''}`}>
                  <img
                    src={isAssistant ? activePersona.avatar : `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%234f46e5'/%3E%3Ccircle cx='20' cy='16' r='7' fill='white' opacity='0.95'/%3E%3Cellipse cx='20' cy='33' rx='12' ry='8' fill='white' opacity='0.95'/%3E%3C/svg%3E`}
                    alt={isAssistant ? activePersona.name : 'User'}
                    className="msg-avatar"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = isAssistant 
                        ? `https://api.dicebear.com/7.x/bottts/svg?seed=${activePersona.id}`
                        : `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%234f46e5'/%3E%3Ccircle cx='20' cy='16' r='7' fill='white' opacity='0.95'/%3E%3Cellipse cx='20' cy='33' rx='12' ry='8' fill='white' opacity='0.95'/%3E%3C/svg%3E`
                    }}
                  />
                  <div className="msg-bubble-container">
                    <div className="msg-bubble">
                      {/* Main Message Text */}
                      <div style={{ whiteSpace: 'pre-wrap' }}>{textContent}</div>
                    </div>
                    <div className="msg-meta">
                      <span>{isAssistant ? activePersona.name : 'You'}</span>
                      <span>&bull;</span>
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {/* Typing Indicator */}
          {isLoading && !activeHistory.some(msg => msg.role === 'assistant' && msg.text !== '') && (
            <div className="typing-wrapper">
              <img
                src={activePersona.avatar}
                alt={activePersona.name}
                className="msg-avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${activePersona.id}`
                }}
              />
              <div className="typing-bubble">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <footer className="chat-input-bar">
          <div className="input-container">
            <input
              type="text"
              className={`chat-input ${activePersona.themeClass}`}
              placeholder={`Ask ${activePersona.name} a question...`}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              className={`send-btn ${activePersona.themeClass}`}
              onClick={() => handleSendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </footer>
      </main>
    </div>
  )
}
