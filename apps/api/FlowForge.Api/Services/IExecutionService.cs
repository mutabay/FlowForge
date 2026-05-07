using FlowForge.Api.DTOs;

namespace FlowForge.Api.Services;

public interface IExecutionService
{
    Task<WorkflowExecutionResponse> RunWorkflowAsync(Guid workflowId);
    Task<List<WorkflowExecutionResponse>> GetAllAsync();
    Task<WorkflowExecutionResponse?> GetByIdAsync(Guid id);
    Task<List<WorkflowExecutionResponse>> GetByWorkflowIdAsync(Guid workflowId);
}