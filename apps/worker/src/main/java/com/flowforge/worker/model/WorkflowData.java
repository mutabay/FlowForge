package com.flowforge.worker.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workflows")
public class WorkflowData {
    @Id
    private UUID id;

    private String name;

    @Column(name = "is_active")
    private boolean isActive;

    @OneToMany(mappedBy = "workflow", fetch = FetchType.EAGER)
    private List<StepData> steps;

    @OneToMany(mappedBy = "workflow", fetch = FetchType.EAGER)
    private List<EdgeData> edges;

    // Getters and setters
    public UUID getId() {
        return id;
    } 
    public String getName() {
        return name;
    }   
    public boolean isActive() {
        return isActive;
    }
    public List<StepData> getSteps() {
        return steps;
    }
    public List<EdgeData> getEdges() {
        return edges;
    }

    

}
