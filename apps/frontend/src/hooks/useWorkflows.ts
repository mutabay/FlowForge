import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsApi } from '../api/workflows';
import type { CreateWorkflowRequest } from '../types';

export function useWorkflows() {
    return useQuery({
        queryKey: ['workflows'],
        queryFn: workflowsApi.getAll,
    });
}

export function useWorkflow(id: string) {
    return useQuery({
        queryKey: ['workflows', id],
        queryFn: () => workflowsApi.getById(id),
        enabled: Boolean(id),
    });
}

export function useCreateWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: CreateWorkflowRequest) => workflowsApi.create(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
        }
    });
}

export function useUpdateWorkflow(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: CreateWorkflowRequest) => workflowsApi.update(id, request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
            queryClient.invalidateQueries({ queryKey: ['workflows', id] });
        }
    });
}

export function useDeleteWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => workflowsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
        }
    });
}

export function useRunWorkflow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => workflowsApi.run(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['executions'] });
        }
    });
}