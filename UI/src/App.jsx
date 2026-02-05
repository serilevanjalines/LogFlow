'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './components/LogFlow/Sidebar';
import Header from './components/LogFlow/Header';
import MainContent from './components/LogFlow/MainContent';
import { checkHealth } from './services/api';
import './styles/logflow.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('debugger');
  const [systemHealth, setSystemHealth] = useState('healthy');
  const [logWindow, setLogWindow] = useState(null);
  const [citedLogData, setCitedLogData] = useState({ id: null, ts: 0 });

  const handleCiteLog = (id) => {
    setCitedLogData({ id, ts: Date.now() });
  };

  useEffect(() => {
    const handleCheckHealth = async () => {
      try {
        const data = await checkHealth();
        setSystemHealth(data.status === 'healthy' ? 'healthy' : 'degraded');
      } catch (error) {
        console.log('[v0] Health check error:', error);
        setSystemHealth('offline');
      }
    };

    handleCheckHealth();
    const interval = setInterval(handleCheckHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="logflow-container">
      <Sidebar
        logWindow={logWindow}
        highlightedLogId={citedLogData.id}
        scrollTrigger={citedLogData.ts}
        onSwitchTab={setActiveTab}
      />
      <div className="logflow-main">
        <Header systemHealth={systemHealth} />
        <MainContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSelectLogWindow={setLogWindow}
          onCiteLog={handleCiteLog}
        />
      </div>
    </div>
  );
}
