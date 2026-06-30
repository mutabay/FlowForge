import { useState } from 'react';
import WorkflowCanvas from './WorkflowCanvas';
import type { WorkflowStep, WorkflowEdge, StepType, CreateWorkflowRequest } from '../types';

interface WorkflowEditorProps {
    initialName?: string;
    initialDescription?: string;
    initialSteps?: WorkflowStep[];
    initialEdges?: WorkflowEdge[];
    onSave: (request: CreateWorkflowRequest) => void;
    isSaving: boolean;
}

export default function WorkflowEditor({
    initialName = '',
    initialDescription = '',
    initialSteps = [],
    initialEdges = [],
    onSave,
    isSaving,
}: WorkflowEditorProps) {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps);
    const [edges, setEdges] = useState<WorkflowEdge[]>(initialEdges);

    const addStep = (type: StepType) => {
        const newStep: WorkflowStep = {
            id: `temp-${Date.now()}`,
            name: type.replace('_', ' '),
            type,
            config: {},
            positionX: 100 + steps.length * 200,
            positionY: 150,
        };
        setSteps([...steps, newStep]);
    };

    const handleSave = () => {
        const request: CreateWorkflowRequest = {
            name,
            description: description || undefined,
            steps: steps.map((s) => ({
                tempId: s.id,
                name: s.name,
                type: s.type,
                config: s.config,
                positionX: s.positionX,
                positionY: s.positionY,
            })),
            edges: edges.map((e) => ({
                sourceTempId: e.sourceStepId,
                targetTempId: e.targetStepId,
            })),
        };
        onSave(request);
    };

    return (
        <div className="space-y-6">
            {/* Workflow metadata */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="My Workflow"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional description"
                        />
                    </div>
                </div>
            </div>

            {/* Add step buttons */}
            <div className="flex gap-2">
                <button onClick={() => addStep('http_request')} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                    + HTTP Request
                </button>
                <button onClick={() => addStep('transform_json')} className="px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700">
                    + JSON Transform
                </button>
                <button onClick={() => addStep('csv_process')} className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                    + CSV Process
                </button>
                <button onClick={() => addStep('db_query')} className="px-3 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700">
                    + DB Query
                </button>
            </div>

            {/* Canvas */}
            <WorkflowCanvas
                steps={steps}
                edges={edges}
                onStepsChange={setSteps}
                onEdgesChange={setEdges}
            />

            {/* Save button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={!name || isSaving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Saving...' : 'Save Workflow'}
                </button>
            </div>
        </div>
    );
}