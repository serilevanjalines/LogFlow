'use client';

import React from 'react';
import TimeTravelDebugger from './Tabs/TimeTravelDebugger';
import AiAssistant from './Tabs/AiAssistant';
import SystemMetrics from './Tabs/SystemMetrics';
import AdvancedMetrics from './Tabs/AdvancedMetrics';
import LiveFeed from './Tabs/LiveFeed';

export default function MainContent({ activeTab, setActiveTab, onSelectLogWindow, onCiteLog }) {
  /* SVG Icons matching HQ System Outline Style */
  const Icons = {
    Debugger: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
    ),
    Live: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /><path d="M12 2v10l4 2" /></svg>
    ),
    Ai: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /><path d="M12 16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z" /><path d="M2 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" /><path d="M16 12a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" /><rect x="8" y="8" width="8" height="8" rx="2" /></svg>
    ),
    Metrics: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
    ),
    Advanced: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M3 20v-8c0-2.2 1.8-4 4-4h10c2.2 0 4 1.8 4 4v8" /><path d="M7 16h10" /></svg>
    ),
  };

  const tabs = [
    { id: 'debugger', label: 'Time-Travel', icon: <Icons.Debugger /> },
    { id: 'live', label: 'Live Stream', icon: <Icons.Live /> },
    { id: 'ai', label: 'AI Assistant', icon: <Icons.Ai /> },
    { id: 'metrics', label: 'System Metrics', icon: <Icons.Metrics /> },
    { id: 'advanced', label: 'Advanced Metrics', icon: <Icons.Advanced /> },
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
          <TimeTravelDebugger onSelectLogWindow={onSelectLogWindow} onCiteLog={onCiteLog} />
        )}
        {activeTab === 'live' && <LiveFeed />}
        {activeTab === 'ai' && <AiAssistant onCiteLog={onCiteLog} onSelectLogWindow={onSelectLogWindow} />}
        {activeTab === 'metrics' && <SystemMetrics />}
        {activeTab === 'advanced' && <AdvancedMetrics />}
      </div>
    </main>
  );
}
