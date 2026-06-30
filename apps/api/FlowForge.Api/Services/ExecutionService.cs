using Microsoft.EntityFrameworkCore;
using FlowForge.Api.Data;
using FlowForge.Api.DTOs;   
using FlowForge.Api.Models;

namespace FlowForge.Api.Services;

public class ExecutionService : IExecutionService
{
    private readonly FlowForgeDbContext _db;
    private readonly IRabbitMqPublisher _publisher;
    private readonly ILogger<ExecutionService> _logger;

    public ExecutionService(FlowForgeDbContext db, IRabbitMqPublisher publisher, ILogger<ExecutionService> logger)
    {
        _db = db;
        _publisher = publisher;
        _logger = logger;
    }


    public async Task<WorkflowExecutionResponse> RunWorkflowAsync(Guid workflowId)
    {
         _logger.LogInformation("Running workflow: {WorkflowId}", workflowId);
        var workflow = await _db.Workflows.FindAsync(workflowId);
        if (workflow == null) throw new KeyNotFoundException($"Workflow {workflowId} not found");

        var workflowExecution = new WorkflowExecution
        {
            WorkflowId = workflowId,
            Status = "pending",
            StartedAt = DateTime.UtcNow
        };

        _db.WorkflowExecutions.Add(workflowExecution);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Execution created: {ExecutionId}, publishing to RabbitMQ", workflowExecution.Id);
        // Publish to RabbitMQ for worker to pick up 
        await _publisher.PublishExecutionMessage(workflowExecution.Id, workflowId);

        return MapToResponse(workflowExecution);
    }
    public async Task<List<WorkflowExecutionResponse>> GetAllAsync()
    {
        var workflowExecutions = await _db.WorkflowExecutions
            .Include(e => e.StepExecutions)
            .Include(e => e.Logs)
            .OrderByDescending(e => e.CreatedAt)
            .Take(50)
            .ToListAsync();
        _logger.LogInformation("Retrieved {Count} workflow executions", workflowExecutions.Count);
        return workflowExecutions.Select(MapToResponse).ToList();
    }
    public async Task<WorkflowExecutionResponse?> GetByIdAsync(Guid id)
    {
        var workflowExecution = await _db.WorkflowExecutions
            .Include(e => e.StepExecutions)
            .Include(e => e.Logs.OrderBy(l => l.CreatedAt))
            .FirstOrDefaultAsync(e => e.Id == id);

        return workflowExecution == null ? null : MapToResponse(workflowExecution);
    }
    public async Task<List<WorkflowExecutionResponse>> GetByWorkflowIdAsync(Guid workflowId)
    {
        var workflowExecutions = await _db.WorkflowExecutions
            .Where(e => e.WorkflowId == workflowId)
            .Include(e => e.StepExecutions)
            .OrderByDescending(e => e.CreatedAt)
            .Take(20)
            .ToListAsync();

        return workflowExecutions.Select(MapToResponse).ToList();
    }

    private static WorkflowExecutionResponse MapToResponse(WorkflowExecution workflowExecution) => new()
    {
        Id = workflowExecution.Id,
        WorkflowId = workflowExecution.WorkflowId,
        Status = workflowExecution.Status,
        StartedAt = workflowExecution.StartedAt,
        FinishedAt = workflowExecution.FinishedAt,
        ErrorMessage = workflowExecution.ErrorMessage,
        CreatedAt = workflowExecution.CreatedAt,
        StepExecutions = workflowExecution.StepExecutions?.Select(s => new StepExecutionResponse
        {
            Id = s.Id,
            StepId = s.StepId,
            Status = s.Status,
            Output = s.Output,
            ErrorMessage = s.ErrorMessage,
            RetryCount = s.RetryCount
        }).ToList() ?? new(),
        Logs = workflowExecution.Logs?.Select(l => new ExecutionLogResponse
        {
            Id = l.Id,
            Level = l.Level,
            Message = l.Message,
            CreatedAt = l.CreatedAt
        }).ToList() ?? new()
    };
}