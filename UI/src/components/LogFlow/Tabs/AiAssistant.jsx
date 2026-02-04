'use client';

import React, { useState, useRef, useEffect } from 'react';
import { queryAI } from '../../../services/api';

export default function AiAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      text: 'Hey! I\'m LogFlow, your AI-powered SRE assistant. Ask me anything about your logs, metrics, or system health.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), type: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const data = await queryAI(input);
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        text: data.answer || 'I could not process that request.',
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.log('[v0] Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        text: 'Sorry, I encountered an error processing your query.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-pane ai-assistant">
      <div className="chat-container">
        <div className="messages-list">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.type}`}>
              <div className="message-content">{msg.text}</div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-content loading">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading) handleSendMessage();
            }}
            placeholder="Ask about your logs, metrics, or system health..."
            className="chat-input"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            className="send-button"
            disabled={loading || !input.trim()}
          >
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}
