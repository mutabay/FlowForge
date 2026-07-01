import { Link } from 'react-router-dom';
import { useWorkflows } from '../hooks/useWorkflows';
import { useExecutions } from '../hooks/useExecutions';

export default function DashboardPage() {
    const { data: workflows, isLoading: loadingWorkflows } = useWorkflows();
    const { data: executions, isLoading: loadingExecutions } = useExecutions();

    const successCount = executions?.filter(e => e.status === 'success').length ?? 0;
    const failedCount = executions?.filter(e => e.status === 'failed').length ?? 0;
    const runningCount = executions?.filter(e => e.status === 'running' || e.status === 'pending').length ?? 0;

    return (
        <div style={{ padding: 32, overflow: 'auto', height: '100%' }}>
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Overview of your workflow automation</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-sm font-medium text-gray-500">Workflows</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                        {loadingWorkflows ? '-' : workflows?.length ?? 0}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-sm font-medium text-gray-500">Executions</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                        {loadingExecutions ? '-' : executions?.length ?? 0}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-sm font-medium text-green-600">Succeeded</div>
                    <div className="text-3xl font-bold text-green-600 mt-1">
                        {loadingExecutions ? '-' : successCount}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="text-sm font-medium text-red-600">Failed</div>
                    <div className="text-3xl font-bold text-red-600 mt-1">
                        {loadingExecutions ? '-' : failedCount}
                    </div>
                </div>
            </div>

            {/* Running indicator */}
            {runningCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm text-blue-700 font-medium">{runningCount} execution{runningCount > 1 ? 's' : ''} in progress</span>
                    <Link to="/executions" className="text-sm text-blue-600 hover:underline ml-auto">View &rarr;</Link>
                </div>
            )}

            {/* Quick actions */}
            <div className="flex gap-3">
                <Link to="/workflows/new" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    New Workflow
                </Link>
                <Link to="/workflows" className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    View Workflows
                </Link>
                <Link to="/executions" className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    View Executions
                </Link>
            </div>
        </div>
        </div>
    );
}