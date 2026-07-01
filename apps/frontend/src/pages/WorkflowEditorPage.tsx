import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWorkflow, useCreateWorkflow, useUpdateWorkflow } from '../hooks/useWorkflows';
import WorkflowEditor from '../components/WorkflowEditor';
import type { CreateWorkflowRequest } from '../types';

export default function WorkflowEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const { data: workflow, isLoading } = useWorkflow(id ?? '');
    const createWorkflow = useCreateWorkflow();
    const updateWorkflow = useUpdateWorkflow(id ?? '');

    if (isEditing && isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div className="text-gray-400 text-sm">Loading workflow...</div>
            </div>
        );
    }

    const handleSave = (request: CreateWorkflowRequest) => {
        if (isEditing) {
            updateWorkflow.mutate(request, {
                onSuccess: () => navigate(`/workflows/${id}`),
            });
        } else {
            createWorkflow.mutate(request, {
                onSuccess: (created) => navigate(`/workflows/${created.id}`),
            });
        }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Top bar */}
            <div style={{ flexShrink: 0 }} className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        to={isEditing ? `/workflows/${id}` : '/workflows'}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        title="Back"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <div className="h-5 w-px bg-gray-200" />
                    <nav className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Link to="/workflows" className="hover:text-gray-700">Workflows</Link>
                        <span>/</span>
                        <span className="text-gray-900 font-medium">{isEditing ? 'Edit' : 'New'}</span>
                    </nav>
                </div>
            </div>

            {/* Editor fills remaining space */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0 }}>
                    <WorkflowEditor
                        initialName={workflow?.name}
                        initialDescription={workflow?.description}
                        initialSteps={workflow?.steps}
                        initialEdges={workflow?.edges}
                        onSave={handleSave}
                        isSaving={createWorkflow.isPending || updateWorkflow.isPending}
                    />
                </div>
            </div>
        </div>
    );
}