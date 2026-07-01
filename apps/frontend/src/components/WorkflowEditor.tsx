import { useState, useCallback, type DragEvent } from 'react';
import WorkflowCanvas from './WorkflowCanvas';
import StepConfigModal from './StepConfigModal';
import type { WorkflowStep, WorkflowEdge, StepType, CreateWorkflowRequest } from '../types';

interface WorkflowEditorProps {
    initialName?: string;
    initialDescription?: string;
    initialSteps?: WorkflowStep[];
    initialEdges?: WorkflowEdge[];
    onSave: (request: CreateWorkflowRequest) => void;
    isSaving: boolean;
}

const stepTypes: { type: StepType; label: string; icon: string; color: string; description: string }[] = [
    { type: 'http_request', label: 'HTTP Request', icon: '🌐', color: 'border-blue-400 bg-blue-50', description: 'Call an external API' },
    { type: 'transform_json', label: 'JSON Transform', icon: '🔄', color: 'border-purple-400 bg-purple-50', description: 'Extract or reshape data' },
    { type: 'csv_process', label: 'CSV Process', icon: '📄', color: 'border-green-400 bg-green-50', description: 'Parse CSV to JSON' },
    { type: 'db_query', label: 'DB Query', icon: '🗄️', color: 'border-amber-400 bg-amber-50', description: 'Run a SQL query' },
];

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
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

    const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;

    const onDragStart = (event: DragEvent, type: StepType) => {
        event.dataTransfer.setData('application/flowforge-step-type', type);
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDropOnCanvas = useCallback(
        (type: StepType, position: { x: number; y: number }) => {
            const newStep: WorkflowStep = {
                id: `temp-${Date.now()}`,
                name: stepTypes.find((s) => s.type === type)?.label ?? type,
                type,
                config: {},
                positionX: position.x,
                positionY: position.y,
            };
            setSteps((prev) => [...prev, newStep]);
            setSelectedStepId(newStep.id);
        },
        []
    );

    const handleStepUpdate = (updatedStep: WorkflowStep) => {
        setSteps(steps.map((s) => (s.id === updatedStep.id ? updatedStep : s)));
        setSelectedStepId(null);
    };

    const handleStepDelete = () => {
        if (!selectedStepId) return;
        setSteps(steps.filter((s) => s.id !== selectedStepId));
        setEdges(edges.filter((e) => e.sourceStepId !== selectedStepId && e.targetStepId !== selectedStepId));
        setSelectedStepId(null);
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
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            {/* Left: Step palette */}
            <div style={{ width: 224, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb', background: 'white' }}>
                <div className="p-4 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Steps</h3>
                    <p className="text-xs text-gray-400 mt-1">Drag onto canvas</p>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }} className="p-3 space-y-2">
                    {stepTypes.map((st) => (
                        <div
                            key={st.type}
                            draggable
                            onDragStart={(e) => onDragStart(e, st.type)}
                            className={`border-2 ${st.color} rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{st.icon}</span>
                                <span className="text-sm font-medium text-gray-800">{st.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 ml-7">{st.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Center: Canvas area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                {/* Toolbar */}
                <div style={{ flexShrink: 0 }} className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="text-lg font-semibold text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-300 min-w-0 flex-1"
                        placeholder="Untitled Workflow"
                    />
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="text-sm text-gray-500 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-300 w-64"
                        placeholder="Add description..."
                    />
                    <div className="h-5 w-px bg-gray-200" />
                    <span className="text-xs text-gray-400">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
                    <button
                        onClick={handleSave}
                        disabled={!name || isSaving}
                        className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {/* Canvas */}
                <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
                    {steps.length === 0 && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
                            <div className="text-center">
                                <p className="text-gray-400 text-lg">Drag steps from the left panel</p>
                                <p className="text-gray-300 text-sm mt-1">Drop them here to build your workflow</p>
                            </div>
                        </div>
                    )}
                    <WorkflowCanvas
                        steps={steps}
                        edges={edges}
                        onStepsChange={setSteps}
                        onEdgesChange={setEdges}
                        onNodeClick={(stepId) => setSelectedStepId(stepId)}
                        onDrop={onDropOnCanvas}
                    />
                </div>
            </div>

            {/* Step config modal */}
            {selectedStep && (
                <StepConfigModal
                    step={selectedStep}
                    onSave={handleStepUpdate}
                    onClose={() => setSelectedStepId(null)}
                    onDelete={handleStepDelete}
                />
            )}
        </div>
    );
}