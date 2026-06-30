import { Link } from 'react-router-dom';
import { useWorkflows } from '../hooks/useWorkflows';
import { useExecutions } from '../hooks/useExecutions';

export default function DashboardPage() {
    const { data: workflows, isLoading: loadingWorkflows } = useWorkflows();
    const { data: executions, isLoading: loadingExecutions } = useExecutions();

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-500">Total Workflows</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        {loadingWorkflows ? '...' : workflows?.length ?? 0}
                    </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-500">Total Executions</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        {loadingExecutions ? '...' : executions?.length ?? 0}
                    </p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-500">Failed Executions</h3>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                        {loadingExecutions ? '...' : executions?.filter(e => e.status === 'failed').length ?? 0}
                    </p>
                </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-4">
                <Link to="/workflows" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                    View Workflows
                </Link>
                <Link to="/executions" className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700">
                    View Executions
                </Link>
            </div>
        </div>
    );
}