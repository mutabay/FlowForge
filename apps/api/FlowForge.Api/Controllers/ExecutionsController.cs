using Microsoft.AspNetCore.Mvc;
using FlowForge.Api.DTOs;
using FlowForge.Api.Services;

namespace FlowForge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExecutionsController : ControllerBase
{
    private readonly IExecutionService _executionService;

    public ExecutionsController(IExecutionService executionService)
    {
        _executionService = executionService;
    }

    [HttpGet]
    public async Task<ActionResult<List<WorkflowExecutionResponse>>> GetAll()
    {
        var executions = await _executionService.GetAllAsync();
        return Ok(executions);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<WorkflowExecutionResponse>> GetById(Guid id)
    {
        var execution = await _executionService.GetByIdAsync(id);
        if (execution == null) return NotFound();
        return Ok(execution);

    }
}