import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWorkflow, useRunWorkflow } from '../hooks/useWorkflows';
import WorkflowCanvas from '../components/WorkflowCanvas';

export default function WorkflowDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: workflow, isLoading, error } = useWorkflow(id!);
    const runWorkflow = useRunWorkflow();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-400 text-sm">Loading workflow...</div>
            </div>
        );
    }

    if (error || !workflow) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-red-500 font-medium">Workflow not found</p>
                    <Link to="/workflows" className="text-sm text-blue-600 hover:underline mt-2 block">Back to workflows</Link>
                </div>
            </div>
        );
    }

    const handleRun = () => {
        runWorkflow.mutate(workflow.id, {
            onSuccess: () => navigate('/executions'),
        });
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header bar */}
            <div style={{ flexShrink: 0 }} className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            to="/workflows"
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </Link>
                        <div className="h-5 w-px bg-gray-200" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{workflow.name}</h1>
                            {workflow.description && (
                                <p className="text-sm text-gray-500">{workflow.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRun}
                            disabled={runWorkflow.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                            {runWorkflow.isPending ? 'Running...' : 'Run'}
                        </button>
                        <Link
                            to={`/workflows/${workflow.id}/edit`}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Edit
                        </Link>
                    </div>
                </div>

                {/* Info chips */}
                <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${workflow.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-gray-400">{workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}</span>
                    <span className="text-gray-400">Created {new Date(workflow.createdAt).toLocaleDateString()}</span>
                    <Link to="/executions" className="text-blue-600 hover:underline ml-auto text-xs">View executions &rarr;</Link>
                </div>
            </div>

            {/* Canvas */}
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                <WorkflowCanvas
                    steps={workflow.steps}
                    edges={workflow.edges}
                    onStepsChange={() => {}}
                    onEdgesChange={() => {}}
                />
            </div>
        </div>
    );
}