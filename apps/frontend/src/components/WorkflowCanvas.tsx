import { useCallback, useEffect, useRef, type DragEvent } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type OnConnect,
    type NodeMouseHandler,
    type ReactFlowInstance,
    addEdge,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import StepNode from './StepNode';
import type { WorkflowStep, WorkflowEdge, StepType } from '../types';

const nodeTypes = { stepNode: StepNode };

const defaultEdgeOptions = {
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1', width: 20, height: 20 },
};

interface WorkflowCanvasProps {
    steps: WorkflowStep[];
    edges: WorkflowEdge[];
    onStepsChange: (steps: WorkflowStep[]) => void;
    onEdgesChange: (edges: WorkflowEdge[]) => void;
    onNodeClick?: (stepId: string) => void;
    onDrop?: (type: StepType, position: { x: number; y: number }) => void;
}

function stepsToNodes(steps: WorkflowStep[]): Node[] {
    return steps.map((step) => ({
        id: step.id,
        type: 'stepNode',
        position: { x: step.positionX, y: step.positionY },
        data: { label: step.name, type: step.type },
    }));
}

function edgesToFlow(edges: WorkflowEdge[]): Edge[] {
    return edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceStepId,
        target: edge.targetStepId,
        ...defaultEdgeOptions,
    }));
}

function InnerCanvas({ steps, edges, onStepsChange, onEdgesChange, onNodeClick, onDrop }: WorkflowCanvasProps) {
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(stepsToNodes(steps));
    const [flowEdges, setEdges, onEdgesChangeInternal] = useEdgesState(edgesToFlow(edges));

    // Refs to access latest props in callbacks without re-creating them
    const stepsRef = useRef(steps);
    const edgesRef = useRef(edges);
    stepsRef.current = steps;
    edgesRef.current = edges;

    // Track the steps/edges identity to sync from parent (e.g. when a step is added/deleted externally)
    const prevStepsRef = useRef(steps);
    const prevEdgesRef = useRef(edges);

    useEffect(() => {
        if (prevStepsRef.current !== steps) {
            prevStepsRef.current = steps;
            setNodes(stepsToNodes(steps));
        }
    }, [steps, setNodes]);

    useEffect(() => {
        if (prevEdgesRef.current !== edges) {
            prevEdgesRef.current = edges;
            setEdges(edgesToFlow(edges));
        }
    }, [edges, setEdges]);

    // Sync positions back to parent after drag ends
    const handleNodeDragStop = useCallback(
        (_event: MouseEvent | TouchEvent, _node: Node, allNodes: Node[]) => {
            const updatedSteps = stepsRef.current.map((step) => {
                const node = allNodes.find((n: Node) => n.id === step.id);
                if (node) {
                    return { ...step, positionX: node.position.x, positionY: node.position.y };
                }
                return step;
            });
            onStepsChange(updatedSteps);
        },
        [onStepsChange]
    );

    const handleConnect: OnConnect = useCallback(
        (connection) => {
            setEdges((eds) => addEdge({ ...connection, ...defaultEdgeOptions }, eds));
            // Sync to parent
            const newEdge: WorkflowEdge = {
                id: `e-${connection.source}-${connection.target}`,
                sourceStepId: connection.source!,
                targetStepId: connection.target!,
            };
            onEdgesChange([...edgesRef.current, newEdge]);
        },
        [onEdgesChange, setEdges]
    );

    // Handle edge deletion (select edge + Delete/Backspace)
    const handleEdgesDelete = useCallback(
        (deletedEdges: Edge[]) => {
            const deletedIds = new Set(deletedEdges.map((e) => e.id));
            const remaining = edgesRef.current.filter((e) => !deletedIds.has(e.id));
            onEdgesChange(remaining);
        },
        [onEdgesChange]
    );

    // Handle node deletion (select node + Delete/Backspace)
    const handleNodesDelete = useCallback(
        (deletedNodes: Node[]) => {
            const deletedIds = new Set(deletedNodes.map((n) => n.id));
            const remainingSteps = stepsRef.current.filter((s) => !deletedIds.has(s.id));
            const remainingEdges = edgesRef.current.filter(
                (e) => !deletedIds.has(e.sourceStepId) && !deletedIds.has(e.targetStepId)
            );
            onStepsChange(remainingSteps);
            onEdgesChange(remainingEdges);
        },
        [onStepsChange, onEdgesChange]
    );

    const handleNodeClick: NodeMouseHandler = useCallback(
        (_event, node) => {
            onNodeClick?.(node.id);
        },
        [onNodeClick]
    );

    const handleDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/flowforge-step-type') as StepType;
            if (!type || !reactFlowInstance.current) return;

            const position = reactFlowInstance.current.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            onDrop?.(type, position);
        },
        [onDrop]
    );

    return (
        <div
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <ReactFlow
                nodes={nodes}
                edges={flowEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChangeInternal}
                onConnect={handleConnect}
                onNodeClick={handleNodeClick}
                onNodeDragStop={handleNodeDragStop}
                onEdgesDelete={handleEdgesDelete}
                onNodesDelete={handleNodesDelete}
                onInit={(instance) => { reactFlowInstance.current = instance; }}
                nodeTypes={nodeTypes}
                fitView
                snapToGrid
                snapGrid={[16, 16]}
                deleteKeyCode={['Backspace', 'Delete']}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
            >
                <Background gap={16} size={1} color="#e5e7eb" />
                <Controls position="bottom-right" />
                <MiniMap
                    position="bottom-left"
                    nodeColor="#6366f1"
                    maskColor="rgba(0,0,0,0.08)"
                    className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
                />
            </ReactFlow>
        </div>
    );
}

export default function WorkflowCanvas(props: WorkflowCanvasProps) {
    return (
        <ReactFlowProvider>
            <InnerCanvas {...props} />
        </ReactFlowProvider>
    );
}