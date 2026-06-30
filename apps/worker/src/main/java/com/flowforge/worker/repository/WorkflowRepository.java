package com.flowforge.worker.repository;

import com.flowforge.worker.model.WorkflowData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WorkflowRepository extends JpaRepository<WorkflowData, UUID> {
}