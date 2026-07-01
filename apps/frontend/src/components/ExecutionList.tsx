import type { Execution } from '../types';

interface ExecutionListProps {
    executions: Execution[];
    onSelect: (id: string) => void;
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    running: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
};

export default function ExecutionList({ executions, onSelect }: ExecutionListProps) {
    if (executions.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                No executions yet. Run a workflow to see results here.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-3">ID</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Started</th>
                        <th className="px-6 py-3">Finished</th>
                        <th className="px-6 py-3">Steps</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {executions.map((execution) => (
                        <tr
                            key={execution.id}
                            onClick={() => onSelect(execution.id)}
                            className="hover:bg-gray-50 cursor-pointer"
                        >
                            <td className="px-6 py-4 font-mono text-xs text-blue-600">
                                {execution.id.slice(0, 8)}...
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[execution.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {execution.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                                {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : '-'}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                                {execution.finishedAt ? new Date(execution.finishedAt).toLocaleString() : '-'}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                                {execution.stepExecutions.length}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}