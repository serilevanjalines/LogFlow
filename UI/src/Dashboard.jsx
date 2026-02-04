import { useState, useEffect } from 'react'
import { checkHealth, getLogs, getMetrics } from './services/api'

function Dashboard() {
  const [activeTab, setActiveTab] = useState('logs')
  const [logs, setLogs] = useState([])
  const [metrics, setMetrics] = useState({
    log_counts: { ERROR: 0, WARN: 0, INFO: 0 },
    top_services: {}
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [apiStatus, setApiStatus] = useState('offline')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const healthData = await checkHealth()
        if (healthData.status === 'healthy') {
          setApiStatus('online')
        }
        
        const [logsData, metricsData] = await Promise.all([
          getLogs(new Date(Date.now() - 3600000).toISOString(), new Date().toISOString(), 20),
          getMetrics()
        ])
        
        setLogs(Array.isArray(logsData) ? logsData : (logsData.logs || []))
        setMetrics({
          log_counts: metricsData.log_counts || { ERROR: 0, WARN: 0, INFO: 0 },
          top_services: metricsData.top_services || {}
        })
      } catch (err) {
        console.error('API error:', err)
        setError(err.message)
        setApiStatus('offline')
        setLogs(getMockLogs())
        setMetrics(getMockMetrics())
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const totalLogs = Object.values(metrics.log_counts || {}).reduce((a, b) => a + b, 0)
  const errorRate = totalLogs ? ((metrics.log_counts?.ERROR || 0) / totalLogs * 100).toFixed(1) : 0
  const topService = Object.keys(metrics.top_services || {})[0] || 'N/A'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🔥</span>
              </div>
              <div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500">
                  LogFlow
                </h1>
                <p className="text-gray-400 text-sm mt-1 font-medium">Real-time SRE Intelligence Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                apiStatus === 'online' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-lg shadow-emerald-500/20' 
                  : 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-lg shadow-red-500/20'
              }`}>
                <div className={`w-2 h-2 rounded-full ${apiStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
                {apiStatus === 'online' ? 'Backend Online' : 'Backend Offline'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-8 p-5 bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl text-red-300 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-lg">Connection Issue</p>
                <p className="text-sm text-red-200/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <MetricCard 
            title="Error Rate" 
            value={`${errorRate}%`} 
            color="red" 
            icon="🔥"
            trend={errorRate > 5 ? "high" : "low"}
          />
          <MetricCard 
            title="Total Logs" 
            value={totalLogs.toLocaleString()} 
            color="green" 
            icon="📊"
            trend="stable"
          />
          <MetricCard 
            title="Top Service" 
            value={topService} 
            color="blue" 
            icon="🚀"
            trend="active"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Logs Section - Larger */}
          <div className="xl:col-span-2 bg-gradient-to-br from-slate-900/90 to-purple-900/30 backdrop-blur-xl rounded-3xl p-8 border border-purple-500/20 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">📋</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Recent Logs</h2>
                <span className="px-4 py-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-500/30 animate-pulse">
                  LIVE
                </span>
              </div>
              <button className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
                View All →
              </button>
            </div>
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent">
              {loading ? (
                <div className="text-center py-20 text-gray-500">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-600 border-t-purple-400 rounded-full mb-4"></div>
                  <p className="text-lg font-semibold">Connecting to backend...</p>
                  <p className="text-sm mt-2">Establishing secure connection</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <span className="text-5xl mb-4 block">📭</span>
                  <p className="text-lg font-semibold">No logs available</p>
                  <p className="text-sm mt-2">{apiStatus === 'online' ? 'Waiting for incoming logs...' : 'Backend offline - using mock data'}</p>
                </div>
              ) : (
                logs.map((log, idx) => <LogRow key={log.id || idx} log={log} />)
              )}
            </div>
          </div>

          {/* AI Analysis Panel */}
          <div className="xl:col-span-1 bg-gradient-to-br from-slate-900/90 to-orange-900/30 backdrop-blur-xl rounded-3xl p-8 border border-orange-500/20 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <h2 className="text-2xl font-bold text-white">AI Analysis</h2>
            </div>
            
            <div className="space-y-4 mb-8">
              <button className="w-full group relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-1 active:translate-y-0">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  ⚡ Compare Healthy vs Crash
                </span>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </button>
              
              <button className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1 active:translate-y-0">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  🧠 Ask AI Question
                </span>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </button>
            </div>

            {/* Stats Panel */}
            <div className="bg-slate-950/50 rounded-2xl p-6 border border-purple-500/20">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">System Stats</h3>
              <div className="space-y-3">
                <StatRow label="Status" value={apiStatus === 'online' ? 'Connected' : 'Using Mock Data'} valueClass={apiStatus === 'online' ? 'text-emerald-400' : 'text-yellow-400'} />
                <StatRow label="Auto-refresh" value="5s" valueClass="text-blue-400" />
                <StatRow label="Errors" value={metrics.log_counts?.ERROR || 0} valueClass="text-red-400" icon="📈" />
                <StatRow label="Warnings" value={metrics.log_counts?.WARN || 0} valueClass="text-orange-400" icon="⚠️" />
                <StatRow label="Info" value={metrics.log_counts?.INFO || 0} valueClass="text-green-400" icon="ℹ️" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatRow({ label, value, valueClass, icon }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
      <span className="text-sm text-gray-400 flex items-center gap-2">
        {icon && <span>{icon}</span>}
        <strong>{label}:</strong>
      </span>
      <span className={`text-sm font-bold ${valueClass}`}>{value}</span>
    </div>
  )
}

function LogRow({ log }) {
  const levelConfig = {
    ERROR: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-300', icon: '❌', shadow: 'shadow-red-500/20' },
    WARN: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-300', icon: '⚠️', shadow: 'shadow-orange-500/20' },
    INFO: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-300', icon: 'ℹ️', shadow: 'shadow-emerald-500/20' },
    DEBUG: { bg: 'bg-gray-500/20', border: 'border-gray-500/40', text: 'text-gray-300', icon: '🐛', shadow: 'shadow-gray-500/20' }
  }
  
  const config = levelConfig[log.level] || levelConfig.DEBUG
  const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  
  return (
    <div className="group hover:bg-white/5 p-5 rounded-2xl border border-transparent hover:border-purple-500/30 transition-all cursor-pointer hover:shadow-xl hover:shadow-purple-500/10">
      <div className="flex items-start gap-4">
        <div className={`px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap flex-shrink-0 ${config.bg} ${config.border} ${config.text} shadow-lg ${config.shadow}`}>
          <span className="mr-1">{config.icon}</span>
          {log.level}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 mb-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-white bg-slate-800/50 px-3 py-1 rounded-lg">{log.service || 'unknown'}</span>
            <span className="text-xs text-gray-500 font-mono bg-slate-900/50 px-2 py-1 rounded">{time}</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{log.message || 'No message'}</p>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, color, icon, trend }) {
  const colorClasses = {
    red: { text: 'text-red-400', bg: 'from-red-500/10 to-orange-500/10', border: 'border-red-500/30', shadow: 'shadow-red-500/20' },
    green: { text: 'text-emerald-400', bg: 'from-emerald-500/10 to-green-500/10', border: 'border-emerald-500/30', shadow: 'shadow-emerald-500/20' },
    blue: { text: 'text-blue-400', bg: 'from-blue-500/10 to-purple-500/10', border: 'border-blue-500/30', shadow: 'shadow-blue-500/20' }
  }
  
  const config = colorClasses[color] || colorClasses.blue
  
  return (
    <div className={`group p-7 bg-gradient-to-br ${config.bg} backdrop-blur-xl rounded-2xl border ${config.border} hover:border-purple-500/50 transition-all hover:shadow-2xl ${config.shadow} cursor-pointer transform hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400 font-semibold uppercase tracking-wide">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-4xl font-black ${config.text} mb-2`}>
        {value}
      </p>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className={`w-2 h-2 rounded-full ${trend === 'high' ? 'bg-red-400' : trend === 'low' ? 'bg-green-400' : 'bg-blue-400'} animate-pulse`}></span>
        <span className="font-medium">{trend === 'high' ? 'Critical' : trend === 'low' ? 'Normal' : 'Active'}</span>
      </div>
    </div>
  )
}

function getMockLogs() {
  return [
    { id: 1, level: 'ERROR', service: 'auth-service', message: 'Authentication timeout after 30s', timestamp: new Date().toISOString() },
    { id: 2, level: 'WARN', service: 'api-gateway', message: 'High memory usage detected: 85%', timestamp: new Date().toISOString() },
    { id: 3, level: 'INFO', service: 'database', message: 'Connection pool resized to 50 connections', timestamp: new Date().toISOString() },
    { id: 4, level: 'ERROR', service: 'payment-service', message: 'Failed to process payment: timeout', timestamp: new Date().toISOString() },
    { id: 5, level: 'INFO', service: 'cache', message: 'Redis cache hit rate: 94.2%', timestamp: new Date().toISOString() }
  ]
}

function getMockMetrics() {
  return {
    log_counts: { ERROR: 24, WARN: 156, INFO: 892 },
    top_services: { 'api-gateway': 452, 'auth-service': 328, 'database': 289 }
  }
}

export default Dashboard