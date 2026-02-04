'use client';

import React, { useState, useRef, useEffect } from 'react';
import { queryAI } from '../../../services/api';

export default function AiAssistant({ onCiteLog, onSelectLogWindow }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      text: 'Hey! I\'m LogFlow, your AI-powered SRE assistant. Ask me anything about your logs, metrics, or system health.',
    },
  ]);

  const extractCitation = (text) => {
    const match = text.match(/\[Log #(\d+)\]/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  };

  const renderTextWithCitations = (text) => {
    if (!text) return null;
    // Strip common emojis like in TimeTravelDebugger for professional look
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2194}-\u{2199}\u{21A9}-\u{21AA}\u{3297}\u{3299}\u{1F201}\u{1F202}\u{1F21A}\u{1F22F}\u{1F232}-\u{1F236}\u{1F238}-\u{1F23A}\u{1F250}\u{1F251}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    const parts = cleanText.split(/(\[Log #\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[Log #(\d+)\]/);
      if (match) {
        const id = match[1];
        return (
          <span
            key={i}
            className="citation-link"
            onClick={() => onCiteLog && onCiteLog(id)}
            style={{
              color: '#2563eb',
              fontWeight: '700',
              cursor: 'pointer',
              textDecoration: 'underline',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              padding: '0 4px',
              borderRadius: '4px'
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };
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

      // Sync sidebar with AI window
      if (onSelectLogWindow && data.from_time && data.to_time) {
        onSelectLogWindow({
          from: data.from_time,
          to: data.to_time,
          label: `AI detected: ${data.time_range}`
        });
      }

      // Handle citation highlight
      if (onCiteLog) {
        const citedId = extractCitation(data.answer);
        if (citedId) onCiteLog(citedId);
      }
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
              <div className="message-content">
                {renderTextWithCitations(msg.text)}
              </div>
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
            {loading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
