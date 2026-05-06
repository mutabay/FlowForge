namespace FlowForge.Api.Models;


public class Workflow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<WorkflowStep> Steps { get; set; } = new List<WorkflowStep>();
    public ICollection<WorkflowEdge> Edges { get; set; } = new List<WorkflowEdge>();
    public ICollection<WorkflowTrigger> Triggers { get; set; } = new List<WorkflowTrigger>();
    public ICollection<WorkflowExecution> Executions { get; set; } = new List<WorkflowExecution>();
}