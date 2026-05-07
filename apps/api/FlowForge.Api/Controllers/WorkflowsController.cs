using Microsoft.AspNetCore.Mvc;
using FlowForge.Api.DTOs;
using FlowForge.Api.Services;
using FlowForge.Api.Models;

namespace FlowForge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkflowsController : ControllerBase
{
    private readonly IWorkflowService _workflowService;
    private readonly IExecutionService _executionService;

    public WorkflowsController(IWorkflowService workflowService, IExecutionService executionService)
    {
        _workflowService = workflowService;
        _executionService = executionService;
    }

    [HttpGet]
    public async Task<ActionResult<List<WorkflowResponse>>> GetAll()
    {
        var workflows = await _workflowService.GetAllAsync();
        return Ok(workflows);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkflowResponse>> GetById(Guid id)
    {
        var workflow = await _workflowService.GetByIdAsync(id);
        if (workflow == null) return NotFound();
        return Ok(workflow);
    }

    [HttpPost]
    public async Task<ActionResult<WorkflowResponse>> Create([FromBody]CreateWorkflowRequest request)
    {
        var workflow = await _workflowService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = workflow.Id }, workflow);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkflowResponse>> Update(Guid id, [FromBody] CreateWorkflowRequest request)
    {
        var workflow = await _workflowService.UpdateAsync(id, request);
        if (workflow == null) return NotFound();
        return Ok(workflow);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var result = await _workflowService.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:guid}/run")]
    public async Task<ActionResult<WorkflowExecutionResponse>> Run(Guid id)
    {
        var execution = await _executionService.RunWorkflowAsync(id);
        return Accepted(execution);
    }

    [HttpGet("{id:guid}/executions")]
    public async Task<ActionResult<List<WorkflowExecutionResponse>>> GetExecutions(Guid id)
    {
        var executions = await _executionService.GetByWorkflowIdAsync(id);
        return Ok(executions);
    }
}