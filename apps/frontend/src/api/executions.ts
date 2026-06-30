import apiClient from './client';
import type { Execution } from '../types';

export const executionsApi = {
    getAll: async (): Promise<Execution[]> => {
        const { data } = await apiClient.get('/executions');
        return data;
    },

    getById: async (id: string): Promise<Execution> => {
        const { data } = await apiClient.get(`/executions/${id}`);
        return data;
    },

    getByWorkflowId: async (workflowId: string): Promise<Execution[]> => {
        const { data } = await apiClient.get(`/workflows/${workflowId}/executions`);
        return data;
    },
};

