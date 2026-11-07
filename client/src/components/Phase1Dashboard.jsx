import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Activity,
  Server,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  Terminal,
  Cpu,
  Workflow
} from 'lucide-react';

export default function Phase1Dashboard() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/health');
      setHealth(response.data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to reach API server');
      setHealth(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                QueueLess
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                Phase 1 Active
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Client: React + Vite</span>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              MERN Stack Portfolio
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-medium">
              <Cpu className="w-3.5 h-3.5" />
              <span>Full-Stack Architecture Initialized</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              QueueLess – Smart Appointment & Real-Time Queue Management
            </h1>
            <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed">
              Phase 1 establishes the production-grade foundation: a reactive Vite + React client, an Express.js backend with robust security headers and error boundaries, and a managed MongoDB Mongoose connection.
            </p>
          </div>
        </div>

        {/* Live System Diagnostics Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Live System Diagnostics & Health Check</span>
              </h2>
              <p className="text-sm text-slate-500">
                Real-time API probe verifying client-server-database communication.
              </p>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span>{loading ? 'Probing...' : 'Re-test API'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Frontend Status */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-base">React.js Client</h3>
                <p className="text-xs text-slate-500 mt-1">Vite + Tailwind CSS + Axios</p>
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Dev Server:</span>
                    <span className="font-mono font-medium text-slate-800">http://localhost:5173</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Target API:</span>
                    <span className="font-mono font-medium text-slate-800">/api/health</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Backend API Status */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Server className="w-5 h-5" />
                  </div>
                  {error ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                      Offline
                    </span>
                  ) : health ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Checking...
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 text-base">Express.js API</h3>
                <p className="text-xs text-slate-500 mt-1">Node.js + Helmet + CORS + Morgan</p>
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Status:</span>
                    <span className="font-semibold text-slate-900">
                      {error ? 'Unreachable' : health ? health.service : 'Loading...'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Uptime:</span>
                    <span className="font-mono text-slate-800">
                      {health ? `${health.uptimeSeconds}s` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* MongoDB Status */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Database className="w-5 h-5" />
                  </div>
                  {health?.database?.status === 'connected' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending URI
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 text-base">MongoDB Database</h3>
                <p className="text-xs text-slate-500 mt-1">Mongoose ODM Connection</p>
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>State:</span>
                    <span className="font-semibold capitalize text-slate-800">
                      {health?.database?.status || 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Host:</span>
                    <span className="font-mono text-slate-800 truncate max-w-[140px]">
                      {health?.database?.host || 'None (Configure .env)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Details Banner */}
          {health && (
            <div className={`p-4 rounded-2xl border text-sm flex items-start space-x-3 ${
              health.database.status === 'connected'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {health.database.status === 'connected' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{health.message}</p>
                <p className="text-xs opacity-90">
                  Last verified probe timestamp: <span className="font-mono font-medium">{lastChecked}</span> | Environment: <span className="font-mono">{health.environment}</span>
                </p>
                {health.database.status !== 'connected' && (
                  <p className="text-xs text-amber-800 mt-2">
                    💡 <strong>Next Step for Database:</strong> Paste your MongoDB Atlas URI into <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">server/.env</code> under <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">MONGODB_URI</code>, then restart the server.
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Backend Server Offline or Unreachable</p>
                <p className="text-xs text-rose-700 mt-1">
                  Ensure the Express server is running on <code className="font-mono bg-rose-100 px-1 py-0.5 rounded">http://localhost:5000</code>. Run <code className="font-mono bg-rose-100 px-1 py-0.5 rounded">cd server; npm run dev</code> in your terminal.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Full-Stack Learning Card: Request Flow */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Mental Model: How the Health Check Request Travels
              </h2>
              <p className="text-xs text-slate-500">
                This exact lifecycle occurs for all future features (authentication, slot booking, live queues).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-600">
                <span>STEP 1</span>
                <span>React Client</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">Button Click & State</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                User clicks "Re-test API". React sets <code className="bg-slate-200 px-1 rounded font-mono">loading=true</code> and triggers <code className="bg-slate-200 px-1 rounded font-mono">api.get('/health')</code> using Axios.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-600">
                <span>STEP 2</span>
                <span>Vite Proxy / CORS</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">HTTP Transport</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Request forwards across ports (5173 to 5000). Express passes through security middleware: Helmet, CORS, and Morgan logging.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-purple-600">
                <span>STEP 3</span>
                <span>Express Controller</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">Route & Mongoose Probe</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                <code className="bg-slate-200 px-1 rounded font-mono">health.routes.js</code> calls <code className="bg-slate-200 px-1 rounded font-mono">checkHealth</code>. It inspects Mongoose's <code className="bg-slate-200 px-1 rounded font-mono">connection.readyState</code> and server uptime.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                <span>STEP 4</span>
                <span>JSON Response</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">UI Re-rendering</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Express responds with HTTP 200 JSON. Axios receives it, React saves it to state, and Tailwind cards update dynamically!
              </p>
            </div>
          </div>
        </section>

        {/* 4 Roles Overview */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Platform Role Architecture (Enforced at Backend Level)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Role 1</span>
              <h3 className="font-bold text-slate-900">Customer</h3>
              <p className="text-xs text-slate-600">
                Discovers clinics/salons, books slot appointments, joins walk-in queues, views live queue position and estimated wait times.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Role 2</span>
              <h3 className="font-bold text-slate-900">Service Provider</h3>
              <p className="text-xs text-slate-600">
                Configures business profile, services, durations, staff members, working hours, and reviews business analytics.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-teal-100 bg-teal-50/50 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Role 3</span>
              <h3 className="font-bold text-slate-900">Staff / Receptionist</h3>
              <p className="text-xs text-slate-600">
                Operates daily live queues: checks in customers, calls next ticket, marks serving, skips or recalls tickets.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-purple-100 bg-purple-50/50 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Role 4</span>
              <h3 className="font-bold text-slate-900">Platform Admin</h3>
              <p className="text-xs text-slate-600">
                Verifies registered businesses, suspends/activates users, monitors platform activity, and views system logs.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        QueueLess &copy; {new Date().getFullYear()} – Production MERN Stack Architecture | Phase 1 Initialized
      </footer>
    </div>
  );
}

