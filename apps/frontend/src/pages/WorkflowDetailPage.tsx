import { useParams, Link } from 'react-router-dom';
import { useWorkflow, useRunWorkflow } from '../hooks/useWorkflows';
import WorkflowCanvas from '../components/WorkflowCanvas';

export default function WorkflowDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: workflow, isLoading, error } = useWorkflow(id!);
    const runWorkflow = useRunWorkflow();

    if (isLoading) {
        return <div className="text-gray-500">Loading workflow...</div>;
    }

    if (error || !workflow) {
        return <div className="text-red-600">Workflow not found.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{workflow.name}</h1>
                    {workflow.description && (
                        <p className="text-gray-500 mt-1">{workflow.description}</p>
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => runWorkflow.mutate(workflow.id)}
                        disabled={runWorkflow.isPending}
                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                        {runWorkflow.isPending ? 'Running...' : 'Run'}
                    </button>
                    <Link
                        to={`/workflows/${workflow.id}/edit`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                    >
                        Edit
                    </Link>
                </div>
            </div>

            {/* Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <span className="text-gray-500">Status</span>
                    <p className="font-medium">{workflow.isActive ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                    <span className="text-gray-500">Steps</span>
                    <p className="font-medium">{workflow.steps.length}</p>
                </div>
                <div>
                    <span className="text-gray-500">Created</span>
                    <p className="font-medium">{new Date(workflow.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                    <span className="text-gray-500">Updated</span>
                    <p className="font-medium">{new Date(workflow.updatedAt).toLocaleDateString()}</p>
                </div>
            </div>

            {/* Canvas (read-only view) */}
            <WorkflowCanvas
                steps={workflow.steps}
                edges={workflow.edges}
                onStepsChange={() => {}}
                onEdgesChange={() => {}}
            />
        </div>
    );
}