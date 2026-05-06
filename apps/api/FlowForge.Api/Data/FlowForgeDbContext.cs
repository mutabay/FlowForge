using Microsoft.EntityFrameworkCore;
using FlowForge.Api.Models;

namespace FlowForge.Api.Data;

public class FlowForgeDbContext : DbContext
{
    public FlowForgeDbContext(DbContextOptions<FlowForgeDbContext> options) : base(options) { }

    public DbSet<Workflow> Workflows => Set<Workflow>(); // get
    public DbSet<WorkflowStep> WorkflowSteps => Set<WorkflowStep>();
    public DbSet<WorkflowEdge> WorkflowEdges => Set<WorkflowEdge>();
    public DbSet<WorkflowTrigger> WorkflowTriggers => Set<WorkflowTrigger>();
    public DbSet<WorkflowExecution> WorkflowExecutions => Set<WorkflowExecution>();
    public DbSet<StepExecution> StepExecutions => Set<StepExecution>();
    public DbSet<ExecutionLog> ExecutionLogs => Set<ExecutionLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Workflow>(entity =>
        {
            entity.ToTable("workflows");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<WorkflowStep>(entity =>
        {
            entity.ToTable("workflow_steps");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.WorkflowId).HasColumnName("workflow_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Config).HasColumnName("config").HasColumnType("jsonb");
            entity.Property(e => e.PositionX).HasColumnName("position_x");
            entity.Property(e => e.PositionY).HasColumnName("position_y");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Workflow)
                .WithMany(w => w.Steps)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkflowEdge>(entity =>
        {
            entity.ToTable("workflow_edges");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.WorkflowId).HasColumnName("workflow_id");
            entity.Property(e => e.SourceStepId).HasColumnName("source_step_id");
            entity.Property(e => e.TargetStepId).HasColumnName("target_step_id");
            
            entity.HasOne(e => e.Workflow)
                .WithMany(w => w.Edges)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.SourceStep)
                .WithMany()
                .HasForeignKey(e => e.SourceStepId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.TargetStep)
                .WithMany()
                .HasForeignKey(e => e.TargetStepId)
                .OnDelete(DeleteBehavior.Restrict); 
            
            entity.HasIndex(e => new { e.WorkflowId, e.SourceStepId, e.TargetStepId }).IsUnique();
        });

        modelBuilder.Entity<WorkflowTrigger>(entity =>
        {
            entity.ToTable("workflow_triggers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.WorkflowId).HasColumnName("workflow_id");
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Config).HasColumnName("config").HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Workflow)
                .WithMany(w => w.Triggers)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkflowExecution>(entity =>
        {
            entity.ToTable("workflow_executions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.WorkflowId).HasColumnName("workflow_id");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(e => e.StartedAt).HasColumnName("started_at");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");

            entity.HasOne(e => e.Workflow)
                .WithMany(w => w.Executions)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
        });

    }

}