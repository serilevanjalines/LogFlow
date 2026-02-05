'use client';

import React, { useState, useEffect } from 'react';
import { getLogs, ingestLog } from '../../services/api';

export default function Sidebar({ logWindow, highlightedLogId, scrollTrigger, onSwitchTab }) {
  const [logs, setLogs] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchLogs = async () => {
    try {
      // ✅ Use UTC times for database query
      const toTime = new Date();
      const fromTime = new Date(toTime.getTime() - 3600000); // Last 1 hour in UTC

      const from = logWindow?.from || fromTime.toISOString();
      const to = logWindow?.to || toTime.toISOString();
      const limit = logWindow ? 200 : 50;

      const data = await getLogs(from, to, limit);
      let logList = Array.isArray(data) ? data : (data.logs || []);

      if (!logWindow) {
        logList = logList.slice(0, 20);
      }

      setLogs(logList);
    } catch (error) {
      console.log('[v0] Error fetching logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!logWindow) {
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [logWindow]);

  useEffect(() => {
    if (highlightedLogId) {
      const element = document.getElementById(`log-${highlightedLogId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedLogId, scrollTrigger]);

  const simulateIncident = async () => {
    if (isSimulating) return;
    setIsSimulating(true);

    const services = ['auth-service', 'payment-gateway', 'inventory-db', 'api-router'];
    const messages = [
      'Failed to connect to primary node',
      'Transaction timeout after 5000ms',
      'Invalid authentication token provided',
      'Rate limit exceeded for user_9932',
      'Database connection pool exhausted'
    ];

    try {
      for (let i = 0; i < 5; i++) {
        await ingestLog({
          service: services[Math.floor(Math.random() * services.length)],
          level: i === 0 ? 'INFO' : 'ERROR',
          message: messages[Math.floor(Math.random() * messages.length)],
          timestamp: new Date().toISOString(),
          route: '/api/' + (Math.random() > 0.5 ? 'payments' : 'auth')
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      fetchLogs();
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const getLogLevelClass = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return 'log-error';
      case 'WARN':
        return 'log-warn';
      case 'INFO':
        return 'log-info';
      default:
        return 'log-info';
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <h2
            onClick={() => !logWindow && onSwitchTab && onSwitchTab('live')}
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: !logWindow ? 'pointer' : 'default',
              userSelect: 'none'
            }}
            title={!logWindow ? "Switch to Live Stream" : ""}
          >
            {logWindow ? 'Time Window Logs' : 'LIVE ERROR FEED'}
          </h2>
          <span className="log-count">{logs.length}</span>
        </div>
        {!logWindow && (
          <button
            onClick={simulateIncident}
            disabled={isSimulating}
            className="simulate-button"
            title="Simulate Error Burst"
          >
            {isSimulating ? '...' : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="logs-container">
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div
              key={index}
              id={`log-${log.id}`}
              className={`log-entry ${getLogLevelClass(log.level)} ${String(highlightedLogId) === String(log.id) ? 'highlighted' : ''}`}
            >
              <div className="log-level">{log.level}</div>
              <div className="log-message">{log.message}</div>
              <div className="log-time">
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        ) : (
          <div className="log-empty">No logs available</div>
        )}
      </div>
    </aside>
  );
}
