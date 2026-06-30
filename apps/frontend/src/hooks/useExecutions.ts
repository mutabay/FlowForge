import { useQuery } from '@tanstack/react-query';
import { executionsApi } from '../api/executions';

export function useExecutions() {
    return useQuery({
        queryKey: ['executions'],
        queryFn: executionsApi.getAll,
        refetchInterval: 5000, // Poll every 5 seconds for status updates
    });
}

export function useExecution(id: string) {
    return useQuery({
        queryKey: ['executions', id],
        queryFn: () => executionsApi.getById(id),
        enabled: Boolean(id),
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            // Stop polling when execution is complete
            return status === 'success' || status === 'failed' ? false : 2000;
        },
    });
}