import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

const typeConfig: Record<string, { icon: string; border: string; bg: string; accent: string; hasInput: boolean; hasOutput: boolean }> = {
    http_request: { icon: '🌐', border: 'border-blue-300', bg: 'bg-blue-50', accent: '#3b82f6', hasInput: true, hasOutput: true },
    transform_json: { icon: '🔄', border: 'border-purple-300', bg: 'bg-purple-50', accent: '#8b5cf6', hasInput: true, hasOutput: true },
    csv_process: { icon: '📄', border: 'border-green-300', bg: 'bg-green-50', accent: '#22c55e', hasInput: true, hasOutput: true },
    db_query: { icon: '🗄️', border: 'border-amber-300', bg: 'bg-amber-50', accent: '#f59e0b', hasInput: true, hasOutput: true },
};

type StepNodeData = { label: string; type: string };
type StepNodeType = Node<StepNodeData, 'stepNode'>;

export default function StepNode({ data, selected }: NodeProps<StepNodeType>) {
    const cfg = typeConfig[data.type] || { icon: '⚙️', border: 'border-gray-300', bg: 'bg-gray-50', accent: '#6b7280', hasInput: true, hasOutput: true };

    return (
        <div className={`${cfg.bg} border-2 ${cfg.border} rounded-xl px-5 py-3 shadow-sm min-w-[170px] transition-shadow ${selected ? 'shadow-lg ring-2 ring-blue-400' : 'hover:shadow-md'}`}>
            {/* Input handle (left side) */}
            {cfg.hasInput && (
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{
                        width: 14,
                        height: 14,
                        background: '#fff',
                        border: `3px solid ${cfg.accent}`,
                        cursor: 'crosshair',
                        left: -7,
                    }}
                />
            )}

            <div className="flex items-center gap-2.5">
                <span className="text-xl">{cfg.icon}</span>
                <div>
                    <div className="text-sm font-semibold text-gray-800 leading-tight">{data.label}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
                        {data.type.replace('_', ' ')}
                    </div>
                </div>
            </div>

            {/* Output handle (right side) */}
            {cfg.hasOutput && (
                <Handle
                    type="source"
                    position={Position.Right}
                    style={{
                        width: 14,
                        height: 14,
                        background: cfg.accent,
                        border: '3px solid white',
                        cursor: 'crosshair',
                        right: -7,
                    }}
                />
            )}
        </div>
    );
}