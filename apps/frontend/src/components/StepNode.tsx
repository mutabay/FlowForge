import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

const typeIcons: Record<string, string> = {
    http_request: '🌐',
    transform_json: '🔄',
    csv_process: '📄',
    db_query: '🗄️',
};

interface StepNodeData {
    label: string;
    type: string;
}

export default function StepNode({ data }: NodeProps<StepNodeData>) {
    return (
        <div className="bg-white border-2 border-gray-300 rounded-lg px-4 py-3 shadow-sm min-w-[150px]">
            <Handle type="target" position={Position.Top} className="!bg-blue-500" />
            <div className="flex items-center gap-2">
                <span>{typeIcons[data.type] || '⚙️'}</span>
                <span className="text-sm font-medium text-gray-800">{data.label}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{data.type}</div>
            <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
        </div>
    );
}