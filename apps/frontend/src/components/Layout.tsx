import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900">FlowForge</h1>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) =>
                            `block px-4 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`
                        }
                    >
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/workflows"
                        className={({ isActive }) =>
                            `block px-4 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`
                        }
                    >
                        Workflows
                    </NavLink>
                    <NavLink
                        to="/executions"
                        className={({ isActive }) =>
                            `block px-4 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`
                        }
                    >
                        Executions
                    </NavLink>
                </nav>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto p-8">
                <Outlet />
            </main>
        </div>
    );
}