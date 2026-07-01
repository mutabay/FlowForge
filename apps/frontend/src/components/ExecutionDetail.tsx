import { useState } from 'react';
import type { Execution, StepExecution } from '../types';
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

function StepRow({ step }: { step: StepExecution }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    <span className="text-sm font-mono text-gray-700">{step.stepId.slice(0, 8)}...</span>
                    {step.retryCount > 0 && (
                        <span className="text-xs text-orange-500">retry #{step.retryCount}</span>
                    )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[step.status] || ''}`}>
                    {step.status}
                </span>
            </button>
            {expanded && (
                <div className="border-t border-gray-200 p-3 bg-gray-50">
                    {step.output ? (
                        <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-all bg-white p-3 rounded border border-gray-200 max-h-48 overflow-auto">
                            {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                        </pre>
                    ) : step.errorMessage ? (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">{step.errorMessage}</div>
                    ) : (
                        <p className="text-xs text-gray-400">No output data</p>
                    )}
                </div>
            )}
        </div>
    );
}

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
                {execution.stepExecutions.length === 0 ? (
                    <p className="text-gray-500 text-sm">No step data yet.</p>
                ) : (
                    <div className="space-y-2">
                        {execution.stepExecutions.map((step) => (
                            <StepRow key={step.id} step={step} />
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