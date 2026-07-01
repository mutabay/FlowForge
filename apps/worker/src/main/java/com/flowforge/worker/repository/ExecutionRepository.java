package com.flowforge.worker.repository;

import com.flowforge.worker.model.ExecutionData;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

public interface ExecutionRepository extends Repository<ExecutionData, UUID> {

    @Modifying
    @Transactional
    @Query(value = """
            UPDATE workflow_executions
            SET status = :status,
            started_at = (COALESCE(:startedAt, started_at)),
            finished_at = (COALESCE(:finishedAt, finished_at)),
            error_message = :errorMessage
            WHERE id = :id
            """, nativeQuery = true)
        void updateStatus(UUID id, String status, Instant startedAt, Instant finishedAt, String errorMessage);
}
