using FlowForge.Api.DTOs;

namespace FlowForge.Api.Services;

public interface IWorkflowService
{
    Task<List<WorkflowResponse>> GetAllAsync();
    Task<WorkflowResponse?> GetByIdAsync(Guid id);
    Task<WorkflowResponse> CreateAsync(CreateWorkflowRequest request);
    Task<WorkflowResponse?> UpdateAsync(Guid id, CreateWorkflowRequest request);
    Task<bool> DeleteAsync(Guid id);
}