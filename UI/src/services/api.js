const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// MASTER apiCall - Sidebar + TimeTravel use THIS
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  console.log('🌐 API:', url, options.method || 'GET'); // DEBUG ALL CALLS

  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API FAIL:', url, response.status, errorText.slice(0, 200));
    throw new Error(`API ${response.status}: ${errorText.slice(0, 100)}`);
  }

  return await response.json();
};

// Health
export const checkHealth = () => apiCall('/health');

// Logs (Sidebar uses this)
export const getLogs = (fromTime, toTime, limit = 50) => {
  const params = new URLSearchParams();

  // ✅ ENSURE times are in UTC before sending to server
  if (fromTime) {
    const fromDate = new Date(fromTime);
    params.set('from', fromDate.toISOString()); // toISOString() always returns UTC
  }
  if (toTime) {
    const toDate = new Date(toTime);
    params.set('to', toDate.toISOString()); // toISOString() always returns UTC
  }
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return apiCall(`/logs${query ? `?${query}` : ''}`);
};

// Metrics
export const getMetrics = async () => {
  const data = await apiCall('/metrics');
  const logCounts = data?.log_counts || {};
  const topServices = data?.top_services || {};
  const totalLogs = Object.values(logCounts).reduce(
    (sum, count) => sum + Number(count || 0),
    0
  );
  const errorCount = Number(
    logCounts.ERROR ?? logCounts.error ?? logCounts.Error ?? 0
  );
  const derivedErrorRate = totalLogs
    ? Math.round((errorCount / totalLogs) * 100)
    : 0;

  const services = Array.isArray(data?.services)
    ? data.services
    : Object.entries(topServices).map(([name]) => ({
      name,
      healthy: true,
    }));

  return {
    uptime: data?.uptime ?? 0,
    error_rate: data?.error_rate ?? derivedErrorRate,
    avg_latency: data?.avg_latency ?? 0,
    active_connections: data?.active_connections ?? 0,
    memory_usage: data?.memory_usage ?? 0,
    cpu_usage: data?.cpu_usage ?? 0,
    requests_per_second: data?.requests_per_second ?? 0,
    services,
    error_count: data?.error_count ?? errorCount,
    info_count: data?.info_count ?? Number(logCounts.INFO ?? 0),
    warning_count: data?.warning_count ?? Number(logCounts.WARNING ?? 0),
    unique_services: data?.unique_services ?? 0,
    all_services: Array.isArray(data?.all_services) ? data.all_services : [],
    log_counts: logCounts,
    top_services: topServices,
  };
};

// 🔥 TIME TRAVEL - USES SAME apiCall!
export const compareLogsPeriods = async (healthyISO, crashISO, imageData = '', mimeType = '') => {
  return apiCall('/ai/compare', {
    method: 'POST',
    body: JSON.stringify({
      healthy: healthyISO,
      crash: crashISO,
      image_data: imageData,
      mime_type: mimeType
    }),
  });
};

// AI Summary
export const getSummary = () => apiCall('/ai/summary');

// Ingest log
export const ingestLog = (log) => apiCall('/ingest', {
  method: 'POST',
  body: JSON.stringify(log),
});

// Advanced Metrics
export const getAdvancedMetrics = async () => {
  return apiCall('/metrics/advanced');
};

// Query AI
export const queryAI = (question, imageData = '', mimeType = '') => apiCall('/ai/query', {
  method: 'POST',
  body: JSON.stringify({
    question,
    image_data: imageData,
    mime_type: mimeType
  }),
});

// PDF / Report Export
export const generateReport = (title, content) => {
  const printWindow = window.open('', '_blank');
  const date = new Date().toLocaleString();

  printWindow.document.write(`
    <html>
      <head>
        <title>LogFlow SRE Report - ${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #111827; line-height: 1.6; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #2563eb; margin: 0; font-size: 24px; }
          .meta { color: #6b7280; font-size: 12px; margin-top: 5px; }
          .content { white-space: pre-wrap; background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
          .footer { margin-top: 50px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LogFlow SRE Analysis Report</h1>
          <div class="meta">Generated on ${date} | Subject: ${title}</div>
        </div>
        <div class="content">${content}</div>
        <div class="footer">Confidential SRE Document | Powered by LogFlow Gemini 3 Engine</div>
        <script>setTimeout(() => { window.print(); }, 500);</script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export default { checkHealth, getLogs, getMetrics, getAdvancedMetrics, compareLogsPeriods, queryAI, getSummary, ingestLog };
