package com.flowforge.worker.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "workflow_edges")
public class EdgeData {
    @Id
    private UUID id;

    @Column(name = "workflow_id")
    private UUID workflowId;

    @Column(name = "source_step_id")
    private UUID sourceStepId;

    @Column(name = "target_step_id")
    private UUID targetStepId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", insertable = false, updatable = false)
    private WorkflowData workflow;

    // Getters
    public UUID getId() {
        return id;
    }

    public UUID getWorkflowId() {
        return workflowId;
    }

    public UUID getSourceStepId() {
        return sourceStepId;
    }

    public UUID getTargetStepId() {
        return targetStepId;
    }
}
