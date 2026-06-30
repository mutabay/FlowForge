import { Link } from 'react-router-dom';
import { useWorkflows, useDeleteWorkflow, useRunWorkflow } from '../hooks/useWorkflows';
import WorkflowList from '../components/WorkflowList';

export default function WorkflowsPage() {
    const { data: workflows, isLoading, error } = useWorkflows();
    const deleteWorkflow = useDeleteWorkflow();
    const runWorkflow = useRunWorkflow();

    if (isLoading) {
        return <div className="text-gray-500">Loading workflows...</div>;
    }

    if (error) {
        return <div className="text-red-600">Error loading workflows: {error.message}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
                <Link
                    to="/workflows/new"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                    + New Workflow
                </Link>
            </div>

            <WorkflowList
                workflows={workflows ?? []}
                onDelete={(id) => deleteWorkflow.mutate(id)}
                onRun={(id) => runWorkflow.mutate(id)}
            />
        </div>
    );
}