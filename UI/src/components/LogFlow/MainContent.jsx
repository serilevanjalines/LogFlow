'use client';

import React from 'react';
import TimeTravelDebugger from './Tabs/TimeTravelDebugger';
import AiAssistant from './Tabs/AiAssistant';
import SystemMetrics from './Tabs/SystemMetrics';

export default function MainContent({ activeTab, setActiveTab, onSelectLogWindow }) {
  const tabs = [
    { id: 'debugger', label: 'Time-Travel Debugger', icon: '⏮️' },
    { id: 'ai', label: 'AI Assistant', icon: '🤖' },
    { id: 'metrics', label: 'System Metrics', icon: '📊' },
  ];

  return (
    <main className="main-content">
      <div className="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tabs-content">
        {activeTab === 'debugger' && (
          <TimeTravelDebugger onSelectLogWindow={onSelectLogWindow} />
        )}
        {activeTab === 'ai' && <AiAssistant />}
        {activeTab === 'metrics' && <SystemMetrics />}
      </div>
    </main>
  );
}
