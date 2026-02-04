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
    log_counts: logCounts,
    top_services: topServices,
  };
};

// 🔥 TIME TRAVEL - USES SAME apiCall!
export const compareLogsPeriods = async (healthyISO, crashISO) => {
  const url = `/ai/compare?healthy=${healthyISO}&crash=${crashISO}`;
  console.log('🕒 TimeTravel:', url);
  return apiCall(url); // SAME apiCall as Sidebar!
};

// AI Summary
export const getSummary = () => apiCall('/ai/summary');

// Ingest log
export const ingestLog = (log) => apiCall('/ingest', {
  method: 'POST',
  body: JSON.stringify(log),
});

// Query AI
export const queryAI = (question) => apiCall('/ai/query', {
  method: 'POST',
  body: JSON.stringify({ question }),
});

export default { checkHealth, getLogs, getMetrics, compareLogsPeriods, queryAI, getSummary, ingestLog };
