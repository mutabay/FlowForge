import { useState } from 'react';
import type { WorkflowStep, StepType } from '../types';

interface StepConfigModalProps {
    step: WorkflowStep;
    onSave: (step: WorkflowStep) => void;
    onClose: () => void;
    onDelete: () => void;
}

const configFields: Record<StepType, { key: string; label: string; placeholder: string; type?: string }[]> = {
    http_request: [
        { key: 'url', label: 'URL', placeholder: 'https://api.example.com/data' },
        { key: 'method', label: 'Method', placeholder: 'GET' },
        { key: 'headers', label: 'Headers (JSON)', placeholder: '{"Authorization": "Bearer ..."}' },
        { key: 'body', label: 'Body (JSON)', placeholder: '{"key": "value"}' },
    ],
    transform_json: [
        { key: 'expression', label: 'JSONPath Expression', placeholder: '$.data.items' },
    ],
    csv_process: [
        { key: 'input_file', label: 'Input File Path', placeholder: '/data/input.csv' },
    ],
    db_query: [
        { key: 'query', label: 'SQL Query', placeholder: 'SELECT * FROM users' },
        { key: 'connection_string', label: 'Connection String', placeholder: 'Host=...;Database=...' },
    ],
};

export default function StepConfigModal({ step, onSave, onClose, onDelete }: StepConfigModalProps) {
    const [name, setName] = useState(step.name);
    const [config, setConfig] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        for (const [key, value] of Object.entries(step.config)) {
            initial[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
        return initial;
    });

    const fields = configFields[step.type] || [];

    const handleSave = () => {
        const parsedConfig: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(config)) {
            if (!value) continue;
            // Try to parse as JSON for headers/body fields
            if (key === 'headers' || key === 'body') {
                try {
                    parsedConfig[key] = JSON.parse(value);
                } catch {
                    parsedConfig[key] = value;
                }
            } else {
                parsedConfig[key] = value;
            }
        }
        onSave({ ...step, name, config: parsedConfig });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Configure Step</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Step name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Step Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Step type (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
                            {step.type}
                        </div>
                    </div>

                    {/* Config fields */}
                    {fields.map((field) => (
                        <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                            {field.key === 'body' || field.key === 'query' ? (
                                <textarea
                                    value={config[field.key] || ''}
                                    onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                                    placeholder={field.placeholder}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={config[field.key] || ''}
                                    onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                                    placeholder={field.placeholder}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between p-4 border-t border-gray-200">
                    <button
                        onClick={onDelete}
                        className="px-3 py-2 text-red-600 text-sm hover:bg-red-50 rounded-md"
                    >
                        Delete Step
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-gray-700 text-sm hover:bg-gray-100 rounded-md">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
