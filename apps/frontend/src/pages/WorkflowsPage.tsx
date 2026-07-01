import { Link } from 'react-router-dom';
import { useWorkflows, useDeleteWorkflow, useRunWorkflow } from '../hooks/useWorkflows';
import WorkflowList from '../components/WorkflowList';

export default function WorkflowsPage() {
    const { data: workflows, isLoading, error } = useWorkflows();
    const deleteWorkflow = useDeleteWorkflow();
    const runWorkflow = useRunWorkflow();

    return (
        <div style={{ padding: 32, overflow: 'auto', height: '100%' }}>
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
                    <p className="text-sm text-gray-500 mt-1">{workflows?.length ?? 0} workflow{(workflows?.length ?? 0) !== 1 ? 's' : ''}</p>
                </div>
                <Link
                    to="/workflows/new"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    New Workflow
                </Link>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
            ) : error ? (
                <div className="text-center py-12 text-red-500 text-sm">Error loading workflows: {error.message}</div>
            ) : (
                <WorkflowList
                    workflows={workflows ?? []}
                    onDelete={(id) => deleteWorkflow.mutate(id)}
                    onRun={(id) => runWorkflow.mutate(id)}
                />
            )}
        </div>
        </div>
    );
}