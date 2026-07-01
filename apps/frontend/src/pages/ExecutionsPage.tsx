import { useState } from 'react';
import { useExecutions, useExecution } from '../hooks/useExecutions';
import ExecutionList from '../components/ExecutionList';
import ExecutionDetail from '../components/ExecutionDetail';

export default function ExecutionsPage() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { data: executions, isLoading, error } = useExecutions();
    const { data: selectedExecution } = useExecution(selectedId ?? '');

    if (isLoading) {
        return <div className="text-gray-500">Loading executions...</div>;
    }

    if (error) {
        return <div className="text-red-600">Error loading executions: {error.message}</div>;
    }

    return (
        <div style={{ padding: 32, overflow: 'auto', height: '100%' }}>
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Executions</h1>
                <p className="text-sm text-gray-500 mt-1">{executions?.length ?? 0} execution{(executions?.length ?? 0) !== 1 ? 's' : ''}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* List */}
                <div>
                    <ExecutionList
                        executions={executions ?? []}
                        onSelect={setSelectedId}
                    />
                </div>

                {/* Detail */}
                <div>
                    {selectedExecution ? (
                        <ExecutionDetail execution={selectedExecution} />
                    ) : (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
                            Select an execution to view details.
                        </div>
                    )}
                </div>
            </div>
        </div>
        </div>
    );
}