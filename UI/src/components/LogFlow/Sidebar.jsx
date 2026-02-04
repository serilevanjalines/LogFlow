'use client';

import React, { useState, useEffect } from 'react';
import { getLogs } from '../../services/api';

export default function Sidebar({ logWindow }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // ✅ Use UTC times for database query
        const toTime = new Date();
        const fromTime = new Date(toTime.getTime() - 3600000); // Last 1 hour in UTC
        
        const from = logWindow?.from || fromTime.toISOString();
        const to = logWindow?.to || toTime.toISOString();
        
        const data = await getLogs(from, to, 50);
        if (Array.isArray(data)) {
          setLogs(data.slice(0, 20));
        } else if (data.logs && Array.isArray(data.logs)) {
          setLogs(data.logs.slice(0, 20));
        }
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
        <h2>{logWindow ? 'Time Window Logs' : 'Live Logs'}</h2>
        <span className="log-count">{logs.length}</span>
      </div>
      <div className="logs-container">
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index} className={`log-entry ${getLogLevelClass(log.level)}`}>
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
