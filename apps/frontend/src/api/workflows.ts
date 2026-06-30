import apiClient from './client';
import type { Workflow, CreateWorkflowRequest } from '../types';

export const workflowsApi = {
    getAll: async (): Promise<Workflow[]> => {
        const { data } = await apiClient.get('/workflows');
        return data;
    },

    getById: async (id: string): Promise<Workflow> => {
        const { data } = await apiClient.get(`/workflows/${id}`);
        return data;
    },

    create: async (workflow: CreateWorkflowRequest): Promise<Workflow> => {
        const { data } = await apiClient.post('/workflows', workflow);
        return data;
    },

    update: async (id: string, requets: CreateWorkflowRequest): Promise<Workflow> => {
        const { data } = await apiClient.put(`/workflows/${id}`, requets);
        return data;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/workflows/${id}`);
    },

    run: async (id: string): Promise<string> => {
        const { data } = await apiClient.post(`/workflows/${id}/run`);
        return data;
    }
};

