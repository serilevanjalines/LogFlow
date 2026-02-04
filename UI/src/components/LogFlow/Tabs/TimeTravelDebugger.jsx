'use client';

import React, { useState } from 'react';
import { compareLogsPeriods } from '../../../services/api';

export default function TimeTravelDebugger({ onSelectLogWindow, onCiteLog }) {
  const extractCitation = (text) => {
    const match = text.match(/\[Log #(\d+)\]/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  };
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [archDiagram, setArchDiagram] = useState(null);
  const [mimeType, setMimeType] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        setArchDiagram(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportPDF = () => {
    if (!comparison?.analysis) return;
    import('../../../services/api').then(api => {
      api.generateReport('Time-Travel Differential Analysis', comparison.analysis);
    });
  };

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
      alert('Please fill ALL fields');
      return;
    }

    try {
      const healthyISO = formatTimeForAPI(healthyDate, healthyTime, healthyPeriod);
      const crashISO = formatTimeForAPI(crashDate, crashTime, crashPeriod);

      console.log('🚀 Sending to /ai/compare:', { healthyISO, crashISO });

      setLoading(true);
      const data = await compareLogsPeriods(healthyISO, crashISO, archDiagram, mimeType);
      setComparison(data);

      // Handle citation highlight
      if (onCiteLog && data.analysis) {
        const citedId = extractCitation(data.analysis);
        if (citedId) onCiteLog(citedId);
      }

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
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /* SVG Icons for Time Travel */
  const Icons = {
    Search: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    Check: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    Cross: () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    Zap: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    Shield: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    Alert: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    Image: () => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
    ),
    Download: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
    )
  };

  const stripEmojis = (text) => {
    if (!text) return '';
    // This regex covers most common emojis and symbols
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2194}-\u{2199}\u{21A9}-\u{21AA}\u{3297}\u{3299}\u{1F201}\u{1F202}\u{1F21A}\u{1F22F}\u{1F232}-\u{1F236}\u{1F238}-\u{1F23A}\u{1F250}\u{1F251}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  };

  const renderTextWithCitations = (text) => {
    if (!text) return null;
    const cleanText = stripEmojis(text);
    const parts = cleanText.split(/(\[Log #\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/\[Log #(\d+)\]/);
      if (match) {
        const id = match[1];
        return (
          <span
            key={i}
            className="citation-link"
            onClick={() => onCiteLog && onCiteLog(id)}
            style={{
              color: '#2563eb',
              fontWeight: '700',
              cursor: 'pointer',
              textDecoration: 'underline',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              padding: '0 4px',
              borderRadius: '4px'
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="tab-pane p-6">
      {/* CONTROLS */}
      <div className="time-travel-controls-wrapper">
        <h2 className="controls-title"><Icons.Search /> Select Time Periods to Compare</h2>

        <div className="compact-controls-grid">
          <div className="compact-control-card healthy-card">
            <span className="compact-status-icon green"><Icons.Check /></span>
            <span className="compact-label">Healthy Period</span>
            <input type="date" value={healthyDate} onChange={(e) => setHealthyDate(e.target.value)} className="compact-input" />
            <input type="time" value={healthyTime} onChange={(e) => setHealthyTime(e.target.value)} className="compact-input" />
            <select value={healthyPeriod} onChange={(e) => setHealthyPeriod(e.target.value)} className="compact-select">
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          <div className="compact-control-card crash-card">
            <span className="compact-status-icon red"><Icons.Cross /></span>
            <span className="compact-label">Crash Period</span>
            <input type="date" value={crashDate} onChange={(e) => setCrashDate(e.target.value)} className="compact-input" />
            <input type="time" value={crashTime} onChange={(e) => setCrashTime(e.target.value)} className="compact-input" />
            <select value={crashPeriod} onChange={(e) => setCrashPeriod(e.target.value)} className="compact-select">
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      </div>

      <div className="vision-upload-card mt-4">
        <label className="vision-upload-label">
          <input type="file" onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
          <div className="vision-upload-content">
            <span className="vision-icon"><Icons.Image /></span>
            <div className="vision-text">
              <span className="vision-title">{archDiagram ? 'Diagram Uploaded' : 'Upload Architecture Map (Vision Context)'}</span>
              <span className="vision-sub">Optional: Help Gemini 3 see your infrastructure dependencies.</span>
            </div>
            {archDiagram && <span className="vision-status">✓ Image Ready</span>}
          </div>
        </label>
      </div>

      <button onClick={handleCompare} className="compare-button" disabled={loading}>
        {loading ? (
          <>
            <span className="loading-spinner"></span>
            Analyzing Logs...
          </>
        ) : (
          <>
            <Icons.Zap /> Compare Periods
          </>
        )}
      </button>

      {/* RESULTS */}
      {comparison && (
        <div className="comparison-results-wrapper mt-8">
          {/* Compact Stats Badges */}
          <div className="stats-badges-row">
            <div className="stat-badge healthy-badge">
              <span className="badge-icon"><Icons.Check /></span>
              <div className="badge-content">
                <span className="badge-label">Healthy Period</span>
                <div className="badge-stats">
                  <span className="badge-value">{comparison.healthy_count || 0}</span>
                  <span className="badge-time">{healthyTime} {healthyPeriod}</span>
                </div>
              </div>
            </div>

            <div className="stat-badge crash-badge">
              <span className="badge-icon"><Icons.Cross /></span>
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
            <div className="analysis-header-row">
              <h3 className="analysis-title"><Icons.Shield /> Security Analysis</h3>
              <button onClick={handleExportPDF} className="export-pdf-button">
                <Icons.Download /> Export Report (PDF)
              </button>
            </div>
            <div className="analysis-text-container">
              {comparison.analysis ? (
                <pre className="analysis-content">
                  {renderTextWithCitations(comparison.analysis)}
                </pre>
              ) : (
                <p className="text-gray-400 text-lg"><Icons.Alert /> No significant divergence detected</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
