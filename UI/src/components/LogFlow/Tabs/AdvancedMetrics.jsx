'use client';

import React, { useState, useEffect } from 'react';
import { getAdvancedMetrics } from '../../../services/api';

export default function AdvancedMetrics() {
  const [metrics, setMetrics] = useState({
    top_users: [],
    top_orders: [],
    top_products: [],
    top_error_reasons: [],
    avg_response_time: 0,
    total_timeouts: 0,
    avg_retry_attempts: 0,
    avg_stock_level: 0,
  });

  useEffect(() => {
    const handleFetchMetrics = async () => {
      try {
        const data = await getAdvancedMetrics();
        setMetrics(data);
      } catch (error) {
        console.log('[v0] Error fetching advanced metrics:', error);
      }
    };

    handleFetchMetrics();
    const interval = setInterval(handleFetchMetrics, 1500); // ⚡ Faster updates (1.5s)
    return () => clearInterval(interval);
  }, []);

  const Icons = {
    User: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    Box: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
    Bag: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>,
    Alert: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
    List: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
  };

  const StatCard = ({ label, value, unit = '', color = '#4d90fe' }) => (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>
        {value}{unit}
      </div>
    </div>
  );

  const ListSection = ({ title, items, icon = <Icons.List /> }) => (
    <div className="metric-card wide">
      <div className="metric-label">{icon} {title}</div>
      <div className="services-list">
        {items && items.length > 0 ? (
          items.map((item, idx) => (
            <div key={idx} className="service-item">
              <span className="service-name">{item.name}</span>
              <span className="service-errors" style={{ color: '#d29922' }}>
                {item.count} occurrences
              </span>
            </div>
          ))
        ) : (
          <p style={{ color: '#8b949e' }}>No data available</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="tab-pane metrics-grid">
      <StatCard label="Avg Response Time" value={metrics.avg_response_time} unit="ms" color="#4d90fe" />
      <StatCard label="Total Timeouts" value={metrics.total_timeouts} color="#ff4757" />
      <StatCard label="Avg Retry Attempts" value={metrics.avg_retry_attempts?.toFixed(1)} color="#d29922" />
      <StatCard label="Avg Stock Level" value={metrics.avg_stock_level?.toFixed(0)} unit=" units" color="#238636" />

      <ListSection title="Top Users" items={metrics.top_users} icon={<Icons.User />} />
      <ListSection title="Top Orders" items={metrics.top_orders} icon={<Icons.Box />} />
      <ListSection title="Top Products" items={metrics.top_products} icon={<Icons.Bag />} />
      <ListSection title="Top Error Reasons" items={metrics.top_error_reasons} icon={<Icons.Alert />} />
    </div>
  );
}
