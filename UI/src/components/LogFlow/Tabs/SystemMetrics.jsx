'use client';

import React, { useState, useEffect } from 'react';
import { getMetrics } from '../../../services/api';

export default function SystemMetrics() {
  const [metrics, setMetrics] = useState({
    log_counts: { ERROR: 0, INFO: 0, WARNING: 0, total: 0 },
    error_rate: 0,
    error_count: 0,
    info_count: 0,
    warning_count: 0,
    unique_services: 0,
    all_services: [],
  });

  useEffect(() => {
    const handleFetchMetrics = async () => {
      try {
        const data = await getMetrics();
        setMetrics(data);
      } catch (error) {
        console.log('[v0] Error fetching metrics:', error);
      }
    };

    handleFetchMetrics();
    const interval = setInterval(handleFetchMetrics, 1500); // ⚡ Faster updates (1.5s)
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    if (status === 'Online') return '#238636';
    if (status === 'Degraded') return '#d29922';
    return '#ff4757';
  };

  return (
    <div className="tab-pane metrics-grid">
      <div className="metric-card">
        <div className="metric-label">Total Logs</div>
        <div className="metric-value">{metrics.log_counts?.total || 0}</div>
      </div>

      <div className="metric-card">
        <div className="metric-label">Error Rate</div>
        <div
          className="metric-value"
          style={{ color: metrics.error_rate > 50 ? '#ff4757' : '#238636' }}
        >
          {metrics.error_rate || 0}%
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">Error Count</div>
        <div className="metric-value" style={{ color: '#ff4757' }}>
          {metrics.error_count || 0}
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">Info Logs</div>
        <div className="metric-value" style={{ color: '#4d90fe' }}>
          {metrics.info_count || 0}
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">Warnings</div>
        <div className="metric-value" style={{ color: '#d29922' }}>
          {metrics.warning_count || 0}
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">Active Services</div>
        <div className="metric-value" style={{ color: '#238636' }}>
          {metrics.unique_services || 0}
        </div>
      </div>

      <div className="metric-card wide">
        <div className="metric-label">Service Health</div>
        <div className="services-list">
          {Array.isArray(metrics.all_services) && metrics.all_services.filter(s => s.errors > 0).length > 0 ? (
            metrics.all_services.filter(s => s.errors > 0).map((service, index) => (
              <div key={index} className="service-item">
                <span className="service-name">{service.name}</span>
                <div className="service-info">
                  <span className="service-errors">{service.errors} errors</span>
                  <span
                    className="service-status"
                    style={{
                      color: getStatusColor(service.status),
                      backgroundColor: getStatusColor(service.status) + '20',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    {service.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#8b949e' }}>No services available</p>
          )}
        </div>
      </div>
    </div>
  );
}
