import type { ExecutionLog } from '../types';

interface LogViewerProps {
    logs: ExecutionLog[];
}

const levelColors: Record<string, string> = {
    debug: 'text-gray-400',
    info: 'text-blue-600',
    warn: 'text-yellow-600',
    error: 'text-red-600',
};

export default function LogViewer({ logs }: LogViewerProps) {
    if (logs.length === 0) {
        return <p className="text-gray-500 text-sm">No logs available.</p>;
    }

    return (
        <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto font-mono text-xs">
            {logs.map((log) => (
                <div key={log.id} className="flex gap-3 py-1">
                    <span className="text-gray-500 shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                    <span className={`uppercase font-bold w-12 shrink-0 ${levelColors[log.level] || 'text-gray-400'}`}>
                        {log.level}
                    </span>
                    <span className="text-gray-200">{log.message}</span>
                </div>
            ))}
        </div>
    );
}