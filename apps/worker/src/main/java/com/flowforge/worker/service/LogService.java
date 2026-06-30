package com.flowforge.worker.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class LogService {
    
    private final JdbcTemplate jdbc;

    public LogService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void log(UUID executionId, UUID stepId, String level, String message) {
        jdbc.update("INSERT INTO execution_logs (id, execution_id, step_id, level, message, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
                UUID.randomUUID(), executionId, stepId, level, message);
    }
}
