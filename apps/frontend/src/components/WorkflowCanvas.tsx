import { useCallback, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import StepNode from './StepNode';
import type { WorkflowStep, WorkflowEdge } from '../types';

interface WorkflowCanvasProps {
    steps: WorkflowStep[];
    edges: WorkflowEdge[];
    onStepsChange: (steps: WorkflowStep[]) => void;
    onEdgesChange: (edges: WorkflowEdge[]) => void;
}

export default function WorkflowCanvas({ steps, edges, onStepsChange, onEdgesChange }: WorkflowCanvasProps) {
    const nodeTypes = useMemo(() => ({ stepNode: StepNode }), []);

    const nodes: Node[] = steps.map((step) => ({
        id: step.id,
        type: 'stepNode',
        position: { x: step.positionX, y: step.positionY },
        data: { label: step.name, type: step.type },
    }));

    const flowEdges: Edge[] = edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceStepId,
        target: edge.targetStepId,
        animated: true,
    }));

    const handleNodesChange: OnNodesChange = useCallback(
        (changes) => {
            const updatedNodes = applyNodeChanges(changes, nodes);
            const updatedSteps = steps.map((step) => {
                const node = updatedNodes.find((n) => n.id === step.id);
                if (node) {
                    return { ...step, positionX: node.position.x, positionY: node.position.y };
                }
                return step;
            });
            onStepsChange(updatedSteps);
        },
        [nodes, steps, onStepsChange]
    );

    const handleEdgesChange: OnEdgesChange = useCallback(
        (changes) => {
            const updatedFlowEdges = applyEdgeChanges(changes, flowEdges);
            const updatedEdges: WorkflowEdge[] = updatedFlowEdges.map((e) => ({
                id: e.id,
                sourceStepId: e.source,
                targetStepId: e.target,
            }));
            onEdgesChange(updatedEdges);
        },
        [flowEdges, onEdgesChange]
    );

    const handleConnect: OnConnect = useCallback(
        (connection) => {
            const newEdges = addEdge({ ...connection, animated: true }, flowEdges);
            const updatedEdges: WorkflowEdge[] = newEdges.map((e) => ({
                id: e.id,
                sourceStepId: e.source,
                targetStepId: e.target,
            }));
            onEdgesChange(updatedEdges);
        },
        [flowEdges, onEdgesChange]
    );

    return (
        <div className="h-[500px] border border-gray-200 rounded-lg overflow-hidden">
            <ReactFlow
                nodes={nodes}
                edges={flowEdges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={handleConnect}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
}