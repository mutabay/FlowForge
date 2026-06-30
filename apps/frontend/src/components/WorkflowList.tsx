import { Link } from 'react-router-dom';
import type { Workflow } from '../types';

interface WorkflowListProps {
    workflows: Workflow[];
    onDelete: (id: string) => void;
    onRun: (id: string) => void;
}

export default function WorkflowList({ workflows, onDelete, onRun }: WorkflowListProps) {
    if (workflows.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                No workflows yet. Create your first one!
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Steps</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Updated</th>
                        <th className="px-6 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {workflows.map((workflow) => (
                        <tr key={workflow.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <Link to={`/workflows/${workflow.id}`} className="text-blue-600 hover:underline font-medium">
                                    {workflow.name}
                                </Link>
                                {workflow.description && (
                                    <p className="text-gray-500 text-xs mt-1">{workflow.description}</p>
                                )}
                            </td>
                            <td className="px-6 py-4 text-gray-600">{workflow.steps.length}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${workflow.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {workflow.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                                {new Date(workflow.updatedAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 space-x-2">
                                <button
                                    onClick={() => onRun(workflow.id)}
                                    className="text-green-600 hover:text-green-800 text-xs font-medium"
                                >
                                    Run
                                </button>
                                <Link to={`/workflows/${workflow.id}/edit`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                    Edit
                                </Link>
                                <button
                                    onClick={() => onDelete(workflow.id)}
                                    className="text-red-600 hover:text-red-800 text-xs font-medium"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}