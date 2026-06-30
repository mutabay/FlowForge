import type { Execution } from '../types';
import LogViewer from './LogViewer';

interface ExecutionDetailProps {
    execution: Execution;
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    running: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
};

export default function ExecutionDetail({ execution }: ExecutionDetailProps) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Execution {execution.id.slice(0, 8)}...
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Started: {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : 'Not started'}
                        </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[execution.status] || ''}`}>
                        {execution.status}
                    </span>
                </div>
                {execution.errorMessage && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {execution.errorMessage}
                    </div>
                )}
            </div>

            {/* Step Executions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Steps</h3>
                {execution.steps.length === 0 ? (
                    <p className="text-gray-500 text-sm">No step data yet.</p>
                ) : (
                    <div className="space-y-2">
                        {execution.steps.map((step) => (
                            <div key={step.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <span className="text-sm font-mono text-gray-700">{step.stepId.slice(0, 8)}...</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[step.status] || ''}`}>
                                    {step.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Logs */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Logs</h3>
                <LogViewer logs={execution.logs} />
            </div>
        </div>
    );
}