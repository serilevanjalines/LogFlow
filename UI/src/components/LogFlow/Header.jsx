import React from 'react';

export default function Header({ systemHealth }) {
  const getStatusColor = () => {
    switch (systemHealth) {
      case 'healthy':
        return '#238636';
      case 'degraded':
        return '#d29922';
      case 'offline':
        return '#ff4757';
      default:
        return '#238636';
    }
  };

  const getStatusText = () => {
    switch (systemHealth) {
      case 'healthy':
        return 'All Systems Normal';
      case 'degraded':
        return 'System Degraded';
      case 'offline':
        return 'System Offline';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">LogFlow</h1>
        <p className="header-subtitle">SRE Observability Dashboard</p>
      </div>
      <div className="header-right">
        <div className="status-badge" style={{ borderColor: getStatusColor() }}>
          <span
            className="status-dot"
            style={{ backgroundColor: getStatusColor() }}
          />
          <span>{getStatusText()}</span>
        </div>
      </div>
    </header>
  );
}
