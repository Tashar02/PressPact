import React, { useState, useEffect, useRef } from "react";
import { Terminal, Copy, Trash2, X } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "error" | "warn" | "unhandled";
  message: string;
  stack?: string;
}

export const DebugOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const originalConsoleError = useRef<typeof console.error | null>(null);
  const originalConsoleWarn = useRef<typeof console.warn | null>(null);

  useEffect(() => {
    // 1. Intercept Global Unhandled Errors
    const handleError = (event: ErrorEvent) => {
      const entry: LogEntry = {
        id: `err-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "unhandled",
        message: event.message || "Unhandled exception",
        stack: event.error?.stack || undefined,
      };
      setLogs((prev) => [entry, ...prev]);
    };

    // 2. Intercept Promise Rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const entry: LogEntry = {
        id: `rej-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "unhandled",
        message: typeof reason === "string" ? reason : reason?.message || "Unhandled Promise Rejection",
        stack: reason?.stack || undefined,
      };
      setLogs((prev) => [entry, ...prev]);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    // 3. Intercept console.error & console.warn
    originalConsoleError.current = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" ");
      const entry: LogEntry = {
        id: `c-err-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "error",
        message: msg,
      };
      setLogs((prev) => [entry, ...prev]);
      if (originalConsoleError.current) {
        originalConsoleError.current(...args);
      }
    };

    originalConsoleWarn.current = console.warn;
    console.warn = (...args: any[]) => {
      const msg = args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" ");
      const entry: LogEntry = {
        id: `c-warn-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "warn",
        message: msg,
      };
      setLogs((prev) => [entry, ...prev]);
      if (originalConsoleWarn.current) {
        originalConsoleWarn.current(...args);
      }
    };

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      if (originalConsoleError.current) console.error = originalConsoleError.current;
      if (originalConsoleWarn.current) console.warn = originalConsoleWarn.current;
    };
  }, []);

  const handleCopyLogs = () => {
    const logText = logs
      .map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}${l.stack ? `\nStack: ${l.stack}` : ""}`)
      .join("\n\n");
    navigator.clipboard.writeText(logText || "No logs recorded.");
    alert("Debug logs copied to clipboard!");
  };

  const errorCount = logs.filter((l) => l.type === "error" || l.type === "unhandled").length;

  return (
    <>
      {/* Floating Toggle Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] p-3.5 bg-gray-900 text-white rounded-full shadow-2xl hover:bg-gray-800 transition-transform active:scale-95 flex items-center gap-2 font-mono text-xs border border-gray-700 cursor-pointer"
      >
        <Terminal className="w-4 h-4 text-emerald-400" />
        <span>Debug Drawer</span>
        {errorCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-bounce">
            {errorCount}
          </span>
        )}
      </button>

      {/* Slide-out Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-gray-950 text-gray-200 z-[10000] shadow-2xl flex flex-col border-l border-gray-800 font-mono text-xs animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm tracking-tight text-white">PressPact Debug Console</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Bar */}
          <div className="p-3 border-b border-gray-800 bg-gray-950 flex gap-2">
            <button
              onClick={handleCopyLogs}
              className="flex-1 py-2 px-3 bg-[#2e7d46] hover:bg-[#256338] text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Logs to Clipboard
            </button>
            <button
              onClick={() => setLogs([])}
              className="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>

          {/* Log Window */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-black/50">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-505 space-y-2 py-20">
                <CheckCircle2Icon className="w-8 h-8 text-[#2e7d46]" />
                <p>System clean. No warnings or errors captured yet.</p>
                <p className="text-[10px] text-gray-600">Navigate the app to test workflows.</p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border ${
                    log.type === "warn"
                      ? "bg-amber-950/20 border-amber-900/50 text-amber-300"
                      : "bg-red-950/20 border-red-900/50 text-red-300"
                  } space-y-1`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-80 border-b border-white/5 pb-1">
                    <span className="font-bold uppercase tracking-wider">{log.type}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="text-xs break-all leading-relaxed font-semibold">{log.message}</p>
                  {log.stack && (
                    <pre className="text-[10px] opacity-60 overflow-x-auto whitespace-pre-wrap pt-1 font-mono leading-tight">
                      {log.stack}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

const CheckCircle2Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
