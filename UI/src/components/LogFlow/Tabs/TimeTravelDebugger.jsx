'use client';

import React, { useState } from 'react';
import { compareLogsPeriods } from '../../../services/api';

export default function TimeTravelDebugger({ onSelectLogWindow }) {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Separate dates for healthy/crash
  const [healthyDate, setHealthyDate] = useState('2026-02-01');
  const [healthyTime, setHealthyTime] = useState('21:12');
  const [healthyPeriod, setHealthyPeriod] = useState('PM');
  
  const [crashDate, setCrashDate] = useState('2026-02-01');
  const [crashTime, setCrashTime] = useState('21:22');
  const [crashPeriod, setCrashPeriod] = useState('PM');

  const formatTimeForAPI = (date, time, period) => {
    let [hours, minutes] = time.split(':');
    let h = parseInt(hours, 10);

    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;

    const normalizedTime = `${String(h).padStart(2, '0')}:${minutes}:00`;
    // ✅ User inputs IST time. JavaScript's new Date() interprets it as local time,
    // and toISOString() automatically converts LOCAL → UTC
    const istDate = new Date(`${date}T${normalizedTime}`);
    const utcString = istDate.toISOString();
    
    console.log(`🕐 IST Input: ${date} ${normalizedTime} → UTC: ${utcString}`);
    return utcString;
  };

  // Create 5min window around timestamp for log querying
  const createTimeWindow = (date, time, period, minutes = 7) => {
    const startISO = formatTimeForAPI(date, time, period);
    const start = new Date(startISO);
    const end = new Date(start.getTime() + minutes * 60 * 1000);

    return {
      from: start.toISOString(),
      to: end.toISOString(),
    };
  };


  const handleCompare = async () => {
    if (!healthyDate || !healthyTime || !healthyPeriod || !crashDate || !crashTime || !crashPeriod) {
      alert('❌ Please fill ALL fields');
      return;
    }

    try {
      const healthyISO = formatTimeForAPI(healthyDate, healthyTime, healthyPeriod);
      const crashISO = formatTimeForAPI(crashDate, crashTime, crashPeriod);

      console.log('🚀 Sending to /ai/compare:', { healthyISO, crashISO });

      setLoading(true);
      const data = await compareLogsPeriods(healthyISO, crashISO);
      setComparison(data);

      if (onSelectLogWindow) {
        const crashWindow = createTimeWindow(crashDate, crashTime, crashPeriod, 7);
        onSelectLogWindow({
          ...crashWindow,
          label: 'Crash Period',
        });
      }

      console.log('✅ Got back:', data);
    } catch (error) {
      console.error('TimeTravel failed:', error);
      alert(`🚨 ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="tab-pane p-6">
      {/* CONTROLS */}
      <div className="time-travel-controls-wrapper">
        <h2 className="controls-title">⏱️ Select Time Periods to Compare</h2>
        
        <div className="compact-controls-grid">
          <div className="compact-control-card healthy-card">
            <span className="compact-status-icon green">✓</span>
            <span className="compact-label">Healthy Period</span>
            <input type="date" value={healthyDate} onChange={(e) => setHealthyDate(e.target.value)} className="compact-input" />
            <input type="time" value={healthyTime} onChange={(e) => setHealthyTime(e.target.value)} className="compact-input" />
            <select value={healthyPeriod} onChange={(e) => setHealthyPeriod(e.target.value)} className="compact-select">
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          <div className="compact-control-card crash-card">
            <span className="compact-status-icon red">✕</span>
            <span className="compact-label">Crash Period</span>
            <input type="date" value={crashDate} onChange={(e) => setCrashDate(e.target.value)} className="compact-input" />
            <input type="time" value={crashTime} onChange={(e) => setCrashTime(e.target.value)} className="compact-input" />
            <select value={crashPeriod} onChange={(e) => setCrashPeriod(e.target.value)} className="compact-select">
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>

        <button onClick={handleCompare} className="compare-button" disabled={loading}>
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              Analyzing Logs...
            </>
          ) : (
            <>
              ⚡ Compare 5 Minute Periods
            </>
          )}
        </button>
      </div>

      {/* RESULTS */}
      {comparison && (
        <div className="comparison-results-wrapper mt-8">
          {/* Compact Stats Badges */}
          <div className="stats-badges-row">
            <div className="stat-badge healthy-badge">
              <span className="badge-icon">✓</span>
              <div className="badge-content">
                <span className="badge-label">Healthy Period</span>
                <div className="badge-stats">
                  <span className="badge-value">{comparison.healthy_count || 0}</span>
                  <span className="badge-time">{healthyTime} {healthyPeriod}</span>
                </div>
              </div>
            </div>

            <div className="stat-badge crash-badge">
              <span className="badge-icon">✕</span>
              <div className="badge-content">
                <span className="badge-label">Crash Period</span>
                <div className="badge-stats">
                  <span className="badge-value">{comparison.crash_count || 0}</span>
                  <span className="badge-time">{crashTime} {crashPeriod}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Width Analysis */}
          <div className="analysis-card">
            <h3 className="analysis-title">🤖 LogFlow Analysis</h3>
            <div className="analysis-text-container">
              {comparison.analysis ? (
                <pre className="analysis-content">
                  {comparison.analysis}
                </pre>
              ) : (
                <p className="text-gray-400 text-lg">⚠️ No significant divergence detected</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
