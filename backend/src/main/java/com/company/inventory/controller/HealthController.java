package com.company.inventory.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Tag(name = "Health", description = "Health check APIs")
@Slf4j // <-- Injected for routing diagnostics
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Check if the API is running")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        log.trace("REST Request received: GET /api/health | Heartbeat path pinged by supervisor monitoring loop router.");
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now());
        response.put("service", "Inventory Management System");
        response.put("version", "1.0.0");
        
        return ResponseEntity.ok(response);
    }
}