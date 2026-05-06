namespace FlowForge.Api.Models;

public class WorkflowStep
{
    public Guid Id { get; set; }
    public Guid WorkflowId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // http_request, db_query, transform_json, csv_process
    public string? Config { get; set; }  = "{}"; // JSON string for step-specific configuration
    public double PositionX { get; set; }
    public double PositionY { get; set; }

    public DateTime CreatedAt { get; set; }
    public Workflow Workflow { get; set; } = null!;
}