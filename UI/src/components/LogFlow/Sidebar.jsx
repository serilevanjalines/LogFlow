'use client';

import React, { useState, useEffect } from 'react';
import { getLogs } from '../../services/api';

export default function Sidebar({ logWindow, highlightedLogId, scrollTrigger }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
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
        <h2>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          {logWindow ? 'Time Window Logs' : 'LIVE ERROR FEED'}
        </h2>
        <span className="log-count">{logs.length}</span>
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
