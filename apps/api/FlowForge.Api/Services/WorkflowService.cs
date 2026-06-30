using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using FlowForge.Api.Data;
using FlowForge.Api.DTOs;
using FlowForge.Api.Models;

namespace FlowForge.Api.Services;

public class WorkflowService : IWorkflowService
{
    private readonly FlowForgeDbContext _db;
    private readonly ILogger<WorkflowService> _logger;

    public WorkflowService(FlowForgeDbContext db, ILogger<WorkflowService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<WorkflowResponse>> GetAllAsync()
    {
        var workflows = await _db.Workflows
            .Include(w => w.Steps)
            .Include(w => w.Edges)
            .OrderByDescending(w => w.UpdatedAt)
            .ToListAsync();

        return workflows.Select(MapToResponse).ToList();
    }

    public async Task<WorkflowResponse?> GetByIdAsync(Guid id)
    {
        var workflow = await _db.Workflows
            .Include(w => w.Steps)
            .Include(w => w.Edges)
            .FirstOrDefaultAsync(w => w.Id == id);
        
        return workflow == null ? null : MapToResponse(workflow);
    }

    public async Task<WorkflowResponse> CreateAsync(CreateWorkflowRequest request)
    {
        _logger.LogInformation("Creating workflow: {Name} with {StepCount} steps",
            request.Name, request.Steps.Count);

        var workflow = new Workflow
        {
            Name = request.Name,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Workflows.Add(workflow);

        // Map temp IDs to real IDs
        var tempIdMap = new Dictionary<string, Guid>();

        foreach (var stepReq in request.Steps)
        {
            var step = new WorkflowStep
            {
                WorkflowId= workflow.Id,
                Name = stepReq.Name,
                Type = stepReq.Type,
                Config = JsonSerializer.Serialize(stepReq.Config),
                PositionX = stepReq.PositionX,
                PositionY = stepReq.PositionY,
                CreatedAt = DateTime.UtcNow,
            };
            _db.WorkflowSteps.Add(step);
            tempIdMap[stepReq.TempId] = step.Id;
        }

        foreach (var edgeReq in request.Edges)
        {
            if (tempIdMap.TryGetValue(edgeReq.SourceTempId, out var sourceId) &&
                tempIdMap.TryGetValue(edgeReq.TargetTempId, out var targetId))
            {
                var edge = new WorkflowEdge
                {
                    WorkflowId = workflow.Id,
                    SourceStepId = sourceId,
                    TargetStepId = targetId
                };
                _db.WorkflowEdges.Add(edge);
            }
        }

        if (request.Trigger != null)
        {
            var trigger = new WorkflowTrigger
            {
                WorkflowId = workflow.Id,
                Type = request.Trigger.Type,
                Config = JsonSerializer.Serialize(request.Trigger.Config),
                CreatedAt = DateTime.UtcNow
            };
            _db.WorkflowTriggers.Add(trigger);
        }

        await _db.SaveChangesAsync();

        return (await GetByIdAsync(workflow.Id))!;

    }

    public async Task<WorkflowResponse?> UpdateAsync(Guid id, CreateWorkflowRequest request)
    {
        var workflow = await _db.Workflows
            .Include(w => w.Steps)
            .Include(w => w.Edges)
            .FirstOrDefaultAsync(w => w.Id == id);
        
        if (workflow == null) return null;

        // Remove old steps and edges
        _db.WorkflowEdges.RemoveRange(workflow.Edges);
        _db.WorkflowSteps.RemoveRange(workflow.Steps);

        workflow.Name = request.Name;
        workflow.Description = request.Description;
        workflow.UpdatedAt = DateTime.UtcNow;

        var tempIdMap = new Dictionary<string, Guid>();

        foreach (var stepReq in request.Steps)
        {
            var step = new WorkflowStep
            {
                WorkflowId= workflow.Id,
                Name = stepReq.Name,
                Type = stepReq.Type,
                Config = JsonSerializer.Serialize(stepReq.Config),
                PositionX = stepReq.PositionX,
                PositionY = stepReq.PositionY,
                CreatedAt = DateTime.UtcNow,
            };
            _db.WorkflowSteps.Add(step);
            tempIdMap[stepReq.TempId] = step.Id;
        }

        foreach (var edgeReq in request.Edges)
        {
            if (tempIdMap.TryGetValue(edgeReq.SourceTempId, out var sourceId) &&
                tempIdMap.TryGetValue(edgeReq.TargetTempId, out var targetId))
            {
                var edge = new WorkflowEdge
                {
                    WorkflowId = workflow.Id,
                    SourceStepId = sourceId,
                    TargetStepId = targetId
                };
                _db.WorkflowEdges.Add(edge);
            }
        }

        await _db.SaveChangesAsync();
        return (await GetByIdAsync(workflow.Id))!;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        _logger.LogInformation("Deleting workflow: {WorkflowId}", id);
        var workflow = await _db.Workflows.FindAsync(id);
        if (workflow == null) 
        {
            _logger.LogWarning("Workflow not found for deletion: {WorkflowId}", id);
            return false;
        }

        _db.Workflows.Remove(workflow);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Workflow deleted: {WorkflowId}", id);
        return true;
    }

    private static WorkflowResponse MapToResponse(Workflow w) => new()
    {
        Id = w.Id,
        Name = w.Name,
        Description = w.Description,
        IsActive = w.IsActive,
        CreatedAt = w.CreatedAt,
        UpdatedAt = w.UpdatedAt,
        Steps = w.Steps.Select(s => new StepResponse
        {
            Id = s.Id,
            Name = s.Name,
            Type = s.Type,
            Config = string.IsNullOrEmpty(s.Config) ? null : JsonSerializer.Deserialize<Dictionary<string, object>?>(s.Config),
            PositionX = s.PositionX,
            PositionY = s.PositionY
        }).ToList(),
        Edges = w.Edges.Select(e => new EdgeResponse
        {
            Id = e.Id,
            SourceStepId = e.SourceStepId,
            TargetStepId = e.TargetStepId
        }).ToList()
    };
}