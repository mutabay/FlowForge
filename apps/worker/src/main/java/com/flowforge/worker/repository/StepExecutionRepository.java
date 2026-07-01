package com.flowforge.worker.repository;

import com.flowforge.worker.model.StepExecutionData;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

public interface StepExecutionRepository extends Repository<StepExecutionData, UUID> {

    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO step_executions (id, execution_id, step_id, status, input, started_at)
            VALUES (:id, :executionId, :stepId, :status, CAST(:input AS jsonb), :startedAt)
            """, nativeQuery = true)
    void insertStepExecution(UUID id, UUID executionId, UUID stepId, String status, String input, Instant startedAt);

    @Modifying
    @Transactional
    @Query(value = """
            UPDATE step_executions
                SET status = :status,
                output = CAST(:output AS jsonb),
                error_message = :errorMessage,
                finished_at = :finishedAt
                WHERE id = :id
            """, nativeQuery = true)
     void updateStepExecution(UUID id, String status, String output, String errorMessage, Instant finishedAt);

}
    
