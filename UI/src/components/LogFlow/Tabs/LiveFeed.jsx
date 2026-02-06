'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getLogs } from '../../../services/api';

export default function LiveFeed() {
    const [logs, setLogs] = useState([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollRef = useRef(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const toTime = new Date();
                const fromTime = new Date(toTime.getTime() - 3600000); // Last 1 hour
                const data = await getLogs(fromTime.toISOString(), toTime.toISOString(), 100);
                const logList = Array.isArray(data) ? data : (data.logs || []);
                setLogs(logList);
            } catch (error) {
                console.error('Error fetching live logs:', error);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 1500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const getLevelStyle = (level) => {
        switch (level?.toUpperCase()) {
            case 'ERROR': return { color: '#ef4444', fontWeight: 'bold' };
            case 'WARN': return { color: '#f59e0b', fontWeight: 'bold' };
            case 'INFO': return { color: '#2563eb', fontWeight: 'bold' };
            default: return { color: '#6b7280' };
        }
    };

    return (
        <div className="tab-pane live-feed-container" style={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
            <div className="live-feed-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151' }}>
                    <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                    Real-time Log Stream
                </h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className="action-button"
                        style={{ fontSize: '11px', padding: '6px 12px', background: autoScroll ? '#2563eb' : '#6b7280', borderRadius: '4px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {autoScroll ? 'AUTO-SCROLL ON' : 'AUTO-SCROLL OFF'}
                    </button>
                    <button
                        onClick={() => setLogs([])}
                        className="action-button"
                        style={{ fontSize: '11px', padding: '6px 12px', background: '#dc2626', borderRadius: '4px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        CLEAR SCREEN
                    </button>
                </div>
            </div>

            <div
                className="terminal-window"
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#0f172a',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid #1e293b',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                }}
            >
                <div className="terminal-header" style={{
                    background: '#1e293b',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #334155'
                }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }}></span>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }}></span>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }}></span>
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>logflow@admin:~/live_stream.log</span>
                    <div style={{ width: '40px' }}></div>
                </div>

                <div
                    ref={scrollRef}
                    className="log-terminal"
                    style={{
                        flex: 1,
                        color: '#e2e8f0',
                        padding: '20px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        overflowY: 'auto',
                        scrollbarWidth: 'thin'
                    }}
                >
                    {logs.length > 0 ? (
                        logs.map((log, index) => (
                            <div key={index} className="log-line" style={{ marginBottom: '6px', display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                                <span style={{ color: '#64748b' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span style={{ minWidth: '80px', ...getLevelStyle(log.level) }}>{log.level.padEnd(7)}</span>
                                <span style={{ color: '#38bdf8' }}>{log.service.padEnd(15)}</span>
                                <span style={{ color: '#cbd5e1' }}>{log.message}</span>
                            </div>
                        ))
                    ) : (
                        <div style={{ color: '#64748b', textAlign: 'center', marginTop: '40px' }}>
                            <div style={{ marginBottom: '10px' }}>$ tail -f /var/log/logflow/live_stream</div>
                            Waiting for incoming log packets...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
