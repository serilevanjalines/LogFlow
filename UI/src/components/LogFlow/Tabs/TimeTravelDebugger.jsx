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
      <div className="time-travel-controls">
        <div className="time-input-row">
          <label>🟢 Healthy Period Start (IST)</label>
          <input type="date" value={healthyDate} onChange={(e) => setHealthyDate(e.target.value)} />
          <input type="time" value={healthyTime} onChange={(e) => setHealthyTime(e.target.value)} />
          <select value={healthyPeriod} onChange={(e) => setHealthyPeriod(e.target.value)}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>

        <div className="time-input-row">
          <label>🔴 Crash Period Start (IST)</label>
          <input type="date" value={crashDate} onChange={(e) => setCrashDate(e.target.value)} />
          <input type="time" value={crashTime} onChange={(e) => setCrashTime(e.target.value)} />
          <select value={crashPeriod} onChange={(e) => setCrashPeriod(e.target.value)}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>

        <button onClick={handleCompare} className="action-button" disabled={loading}>
          {loading ? '🔍 LogFlow Sentinel Analyzing...' : '⚡ Compare 5min Periods'}
        </button>
      </div>

      {/* RESULTS - unchanged */}
      {comparison && (
        <div className="comparison-results grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="result-card healthy bg-green-900/30 border border-green-500 p-6 rounded-xl">
            <h3 className="text-green-400 text-xl font-bold mb-4">✅ Healthy Period</h3>
            <div className="stat-item">
              <span className="text-gray-300">Log Count:</span>
              <span className="stat-value text-3xl font-black text-green-400">{comparison.healthy_count || 0}</span>
            </div>
            <div className="stat-item">
              <span className="text-gray-300">Time:</span>
              <span className="stat-value text-xl font-bold">{healthyTime} {healthyPeriod}</span>
            </div>
          </div>

          <div className="result-card crash bg-red-900/30 border border-red-500 p-6 rounded-xl">
            <h3 className="text-red-400 text-xl font-bold mb-4">💥 Crash Period</h3>
            <div className="stat-item">
              <span className="text-gray-300">Log Count:</span>
              <span className="stat-value text-3xl font-black text-red-400">{comparison.crash_count || 0}</span>
            </div>
            <div className="stat-item">
              <span className="text-gray-300">Time:</span>
              <span className="stat-value text-xl font-bold">{crashTime} {crashPeriod}</span>
            </div>
          </div>

          <div className="result-card diff md:col-span-3 bg-gradient-to-r from-gray-900/80 to-black/50 border border-cyan-500 p-8 rounded-2xl">
            <h3 className="text-cyan-400 text-2xl font-black mb-6">🤖 LogFlow Sentinel Analysis</h3>
            <div className="analysis-text">
              {comparison.analysis ? (
                <pre className="whitespace-pre-wrap text-sm bg-black/60 p-6 rounded-xl border border-gray-700 font-mono">
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
