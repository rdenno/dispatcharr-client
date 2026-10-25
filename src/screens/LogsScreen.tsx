import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  RotateCw,
  Download,
  Terminal,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { LogFile } from '../types/dispatcharr';
import { Fmt } from '../utils/format';
import { Modal } from '../components/common/Modal';
import { LoadingBox, EmptyBox } from '../components/common/FormControls';

export const LogsScreen: React.FC = () => {
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/core/logs/');
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">System & Server Logs</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Diagnostic server logs, background sync traces, and transcode outputs</p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition"
        >
          <RotateCw className="w-3.5 h-3.5 text-teal-400" />
          Refresh Files
        </button>
      </div>

      {loading ? (
        <LoadingBox message="Enumerating log archives..." />
      ) : logs.length === 0 ? (
        <EmptyBox message="No diagnostic logs found" />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.name}
              className="flex items-center justify-between p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-700/80 text-teal-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-zinc-100">{log.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    {log.size && <span>{Fmt.bytes(log.size)}</span>}
                    {log.updated_at && (
                      <>
                        <span>•</span>
                        <span>Updated {Fmt.relative(log.updated_at)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(log.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
              >
                <Terminal className="w-3.5 h-3.5" />
                View Log
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Log Viewer Dialog */}
      {selectedLog && (
        <LogViewerModal name={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
};

const LogViewerModal: React.FC<{ name: string; onClose: () => void }> = ({ name, onClose }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchLogContent = useCallback(async () => {
    setLoading(true);
    try {
      const text = await api.getText(`/api/core/logs/${name}/`);
      setContent(text);
    } catch {
      setContent('[ERROR] Failed to fetch log contents.');
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    fetchLogContent();
  }, [fetchLogContent]);

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lines = content.split('\n');
  const filteredLines = filter
    ? lines.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={name}
      subtitle="Raw diagnostic log output"
      maxWidth="4xl"
      actions={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={fetchLogContent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Reload
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download Log
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter log lines..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-400 text-sm">Streaming log contents...</div>
        ) : (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-300 max-h-[60vh] overflow-y-auto space-y-0.5 select-text">
            {filteredLines.map((line, idx) => {
              const isError = line.includes('ERROR') || line.includes('ERR');
              const isWarn = line.includes('WARN');
              const isInfo = line.includes('INFO');

              return (
                <div
                  key={idx}
                  className={`leading-relaxed ${
                    isError ? 'text-red-400 bg-red-950/20' : isWarn ? 'text-amber-300' : isInfo ? 'text-teal-300' : 'text-zinc-300'
                  }`}
                >
                  {line || ' '}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
