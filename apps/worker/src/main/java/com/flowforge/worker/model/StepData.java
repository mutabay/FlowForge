package com.flowforge.worker.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "workflow_steps")
public class StepData {
    @Id
    private UUID id;

    @Column(name = "workflow_id")
    private UUID workflowId;

    private String name;
    private String type;

    @Column(columnDefinition = "jsonb")
    private String config;

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
    public String getName() {
        return name;
    }
    public String getType() {
        return type;
    }
    public String getConfig() {
        return config;
    }
    
}
