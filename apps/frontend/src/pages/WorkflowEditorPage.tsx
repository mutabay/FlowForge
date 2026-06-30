import { useParams, useNavigate } from 'react-router-dom';
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
        return <div className="text-gray-500">Loading workflow...</div>;
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
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit Workflow' : 'New Workflow'}
            </h1>

            <WorkflowEditor
                initialName={workflow?.name}
                initialDescription={workflow?.description}
                initialSteps={workflow?.steps}
                initialEdges={workflow?.edges}
                onSave={handleSave}
                isSaving={createWorkflow.isPending || updateWorkflow.isPending}
            />
        </div>
    );
}