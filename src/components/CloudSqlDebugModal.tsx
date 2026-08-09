import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Zap,
  HardDrive,
  Code,
  Calendar,
  User,
  Clock,
  X,
  FileText
} from 'lucide-react';

interface CloudSqlDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentContextKey: string;
}

interface DebugResponse {
  timestamp: string;
  activeEngine: 'cloudsql_postgres' | 'file_storage';
  cloudSqlStatus: {
    hasPgConfig: boolean;
    isConnected: boolean;
    error: string | null;
    host: string;
    database: string;
    instanceName: string;
    recordCount: number;
  };
  fileStorageStatus: {
    filePath: string;
    sizeKb: number;
    contextCount: number;
    totalEvents: number;
  };
  environmentVariables: Record<string, boolean | string | null>;
  storedData: {
    activeEngineData: Record<string, any>;
    cloudSqlStore: Record<string, any>;
    fileStore: Record<string, any>;
  };
}

export const CloudSqlDebugModal: React.FC<CloudSqlDebugModalProps> = ({
  isOpen,
  onClose,
  currentContextKey,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [debugData, setDebugData] = useState<DebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [writingTest, setWritingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'raw'>('overview');
  const [selectedContextKey, setSelectedContextKey] = useState<string>('');

  const fetchDebugInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/debug/db?_t=${Date.now()}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      setDebugData(data);
      if (!selectedContextKey && data.storedData?.activeEngineData) {
        const keys = Object.keys(data.storedData.activeEngineData);
        if (keys.length > 0) {
          setSelectedContextKey(keys.includes(currentContextKey) ? currentContextKey : keys[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to debug endpoint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDebugInfo();
    }
  }, [isOpen]);

  const handleWriteTestEvent = async () => {
    setWritingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/debug/test-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextKey: currentContextKey }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(`Successfully saved test event! PostgreSQL: ${data.pgSaved ? '✅ Yes' : '⚠️ Fallback'}, Disk Store: ✅ Yes`);
        await fetchDebugInfo();
      } else {
        setTestResult('Failed to write test event');
      }
    } catch (err: any) {
      setTestResult(`Error writing test event: ${err.message}`);
    } finally {
      setWritingTest(false);
    }
  };

  const copyDataToClipboard = () => {
    if (!debugData) return;
    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const isPgActive = debugData?.activeEngine === 'cloudsql_postgres';
  const contextsMap = debugData?.storedData?.activeEngineData || {};
  const currentContextData = selectedContextKey ? contextsMap[selectedContextKey] : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isPgActive ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Cloud SQL & Database Storage Inspector
                {isPgActive ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Cloud SQL Postgres Active
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-sky-400" /> Persistent File DB Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Inspect records saved on the cloud server database and debug backend synchronization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDebugInfo}
              disabled={loading}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh DB Info"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-900/60 border-b border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Connection & Engine Status</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'data'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Stored Database Records ({Object.keys(contextsMap).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`px-4 py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'raw'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Raw DB JSON Output</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              error.includes('404')
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                : 'bg-red-950/40 border-red-500/30 text-red-300'
            }`}>
              <div className="flex items-center gap-3">
                {error.includes('404') ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div>
                  <p className="font-bold text-sm">
                    {error.includes('404')
                      ? 'Static Hosting Host Detected (HTTP 404)'
                      : 'Backend Server Communication Notice'}
                  </p>
                  <p className={error.includes('404') ? 'text-amber-300/90' : 'text-red-400/80'}>{error}</p>
                </div>
              </div>

              {error.includes('404') && (
                <div className="pt-2 border-t border-amber-500/20 text-xs space-y-1.5 text-amber-200/90 leading-relaxed">
                  <p>
                    <strong>Why this happens:</strong> The deployment host (e.g. <code>dual-timezone-scheduler.vercel.app</code>) is currently serving static frontend files without a running Express backend instance.
                  </p>
                  <p>
                    <strong>Automatic Client Fallback:</strong> All calendar events, timezones, and avatars are automatically operating using local browser storage (<code>localStorage</code>)!
                  </p>
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-amber-500/30 text-[11px] space-y-1">
                    <p className="font-semibold text-amber-300">💡 How to enable Cloud SQL Serverless on Vercel:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                      <li>We have created <code>vercel.json</code> and <code>api/index.ts</code> in your repo.</li>
                      <li>In Vercel Settings → Environment Variables, add <code>DATABASE_URL</code> or <code>POSTGRES_URL</code> pointing to your Cloud SQL PostgreSQL instance.</li>
                      <li>Re-deploy on Vercel, and Vercel Serverless Functions will execute <code>server.ts</code> automatically!</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Result Alert */}
          {testResult && (
            <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-400" />
                <span>{testResult}</span>
              </div>
              <button
                onClick={() => setTestResult(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && debugData && (
            <div className="space-y-6">
              
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Active Engine */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Database Engine</span>
                    <Server className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    {isPgActive ? 'Cloud SQL (PostgreSQL)' : 'Server Storage File DB'}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isPgActive ? 'Connected to GCP Cloud SQL instance' : 'Persistent server disk JSON backend'}
                  </p>
                </div>

                {/* Stored Contexts */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Saved Context Records</span>
                    <Calendar className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {Object.keys(contextsMap).length}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Unique calendar timezones & profile pairs
                  </p>
                </div>

                {/* Total Events */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Total Database Events</span>
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {debugData.fileStorageStatus.totalEvents}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Active events synchronized across devices
                  </p>
                </div>

              </div>

              {/* Cloud SQL Connection Status Box */}
              <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    Cloud SQL (PostgreSQL) Status
                  </h3>
                  {debugData.cloudSqlStatus.isConnected ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Connected
                    </span>
                  ) : debugData.cloudSqlStatus.hasPgConfig ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Configured (Connecting/Error)
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 font-medium">
                      <Server className="w-3.5 h-3.5 text-slate-500" /> Fallback File Store Mode
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Database Host:</span>
                    <p className="font-mono text-slate-200 mt-0.5">{debugData.cloudSqlStatus.host}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Database Name:</span>
                    <p className="font-mono text-slate-200 mt-0.5">{debugData.cloudSqlStatus.database}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Cloud SQL Instance:</span>
                    <p className="font-mono text-slate-200 mt-0.5">{debugData.cloudSqlStatus.instanceName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Rows in PostgreSQL:</span>
                    <p className="font-mono text-slate-200 mt-0.5">{debugData.cloudSqlStatus.recordCount} rows</p>
                  </div>
                </div>

                {debugData.cloudSqlStatus.error && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                    <span className="font-semibold block mb-0.5">Cloud SQL Error Log:</span>
                    <p className="font-mono text-[11px] text-red-400/90">{debugData.cloudSqlStatus.error}</p>
                  </div>
                )}
              </div>

              {/* Environment Variables Box */}
              <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Detected Server Environment Configuration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {Object.entries(debugData.environmentVariables).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">{key}:</span>
                      {typeof val === 'boolean' ? (
                        val ? (
                          <span className="text-emerald-400 font-bold">Present</span>
                        ) : (
                          <span className="text-slate-500">Not set</span>
                        )
                      ) : val ? (
                        <span className="text-sky-300 font-semibold">{String(val)}</span>
                      ) : (
                        <span className="text-slate-500">Not set</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Debug Test Action Button */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Test Live Database Write
                  </h4>
                  <p className="text-xs text-slate-400">
                    Sends a test calendar ping event to verify server read/write persistence
                  </p>
                </div>
                <button
                  onClick={handleWriteTestEvent}
                  disabled={writingTest}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-md shadow-sky-500/20"
                >
                  <Zap className={`w-4 h-4 ${writingTest ? 'animate-bounce' : ''}`} />
                  <span>{writingTest ? 'Writing to DB...' : 'Write Test Event'}</span>
                </button>
              </div>

            </div>
          )}

          {/* STORED RECORDS TAB */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              
              {/* Context Selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="text-xs text-slate-400 font-medium">
                  Select Saved Context Key:
                </label>
                <select
                  value={selectedContextKey}
                  onChange={(e) => setSelectedContextKey(e.target.value)}
                  className="w-full sm:w-auto bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500"
                >
                  {Object.keys(contextsMap).length === 0 ? (
                    <option value="">No stored records found</option>
                  ) : (
                    Object.keys(contextsMap).map((key) => (
                      <option key={key} value={key}>
                        {key} ({contextsMap[key]?.events?.length || 0} events)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Selected Context Inspection */}
              {currentContextData ? (
                <div className="space-y-4">
                  
                  {/* Meta summary */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Context Key:</span>
                      <span className="font-mono text-sky-300 font-semibold">{selectedContextKey}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Last DB Update:</span>
                      <span className="font-mono text-slate-300">
                        {currentContextData.updatedAt
                          ? new Date(currentContextData.updatedAt).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>

                  {/* Saved Events List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Events Stored in Database ({currentContextData.events?.length || 0})
                    </h4>

                    {(!currentContextData.events || currentContextData.events.length === 0) ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                        No scheduled events currently stored for this context.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {currentContextData.events.map((evt: any) => (
                          <div
                            key={evt.id}
                            className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{evt.title}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${evt.createdBy === 'user1' ? 'bg-purple-950 text-purple-300 border border-purple-500/30' : 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'}`}>
                                  {evt.createdBy}
                                </span>
                              </div>
                              <p className="text-slate-400 text-[11px]">{evt.description || 'No description'}</p>
                            </div>

                            <div className="text-right text-[11px] font-mono text-slate-400 shrink-0">
                              <div>{new Date(evt.startTimeIso).toLocaleString()}</div>
                              <div className="text-sky-400">{evt.durationMinutes || 60} mins</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                  Select a stored context from above to view its contents.
                </div>
              )}

            </div>
          )}

          {/* RAW JSON TAB */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Complete Live Server Response JSON:</span>
                <button
                  onClick={copyDataToClipboard}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>

              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[400px]">
                {debugData ? JSON.stringify(debugData, null, 2) : '// Loading...'}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Active Backend Engine: <strong className="text-sky-300 font-mono">{debugData?.activeEngine || 'Checking...'}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
