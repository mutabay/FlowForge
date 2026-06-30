using FluentValidation;
using FlowForge.Api.DTOs;

namespace FlowForge.Api.Validators;

public class CreateWorkflowValidator : AbstractValidator<CreateWorkflowRequest>
{
    public CreateWorkflowValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Workflow name is required.")
            .MaximumLength(100).WithMessage("Workflow name must not exceed 100 characters.");

        RuleFor(x => x.Steps)
            .NotEmpty().WithMessage("At least one step is required.");

        RuleForEach(x => x.Steps).ChildRules(step =>
        {
            step.RuleFor(s => s.Name)
                .NotEmpty().WithMessage("Step name is required.")
                .MaximumLength(100).WithMessage("Step name must not exceed 100 characters.");

            step.RuleFor(s => s.Type)
                .NotEmpty()
                .Must(t => t is "http_request" or "db_query" or "transform_json" or "csv_process")
                .WithMessage("Invalid step type");

            step.RuleFor(s => s.TempId)
                .NotEmpty().WithMessage("Step tempId is required for edge mapping");
        });

        RuleForEach(x => x.Edges).ChildRules(edge =>
        {
            edge.RuleFor(e => e.SourceTempId)
                .NotEmpty().WithMessage("Edge sourceTempId is required.");

            edge.RuleFor(e => e.TargetTempId)
                .NotEmpty().WithMessage("Edge targetTempId is required.");
        });
    }
}