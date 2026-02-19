package com.company.inventory.service;

import com.company.inventory.entity.AuditLog;
import com.company.inventory.entity.User;
import com.company.inventory.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for managing audit logs
 * Tracks all important system actions for compliance and debugging
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    /**
     * Create audit log entry
     * @param user User who performed the action
     * @param action Action performed
     * @param tableName Table/Entity affected
     * @param recordId Record ID affected
     * @param oldValue Previous state (object will be converted to JSON)
     * @param newValue New state (object will be converted to JSON)
     * @param ipAddress User's IP address
     */
    @Async
    @Transactional
    public void logAction(User user, String action, String tableName, Long recordId, 
                         Object oldValue, Object newValue, String ipAddress) {
        try {
            AuditLog log = new AuditLog();
            log.setUser(user);
            log.setAction(action);
            log.setTableName(tableName);
            log.setRecordId(recordId);
            
            // Convert objects to JSON
            if (oldValue != null) {
                log.setOldValue(objectMapper.writeValueAsString(oldValue));
            }
            if (newValue != null) {
                log.setNewValue(objectMapper.writeValueAsString(newValue));
            }
            
            log.setIpAddress(ipAddress);
            
            auditLogRepository.save(log);
        } catch (Exception e) {
            // Log error but don't fail the main operation
            System.err.println("Failed to create audit log: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Simplified logging without old/new values
     */
    @Async
    @Transactional
    public void logAction(User user, String action, String tableName, Long recordId) {
        logAction(user, action, tableName, recordId, null, null, null);
    }

    /**
     * Log simple action without record details
     */
    @Async
    @Transactional
    public void logAction(User user, String action) {
        logAction(user, action, null, null, null, null, null);
    }

    /**
     * Log with custom message
     */
    @Async
    @Transactional
    public void logActionWithMessage(User user, String action, String tableName, 
                                     Long recordId, String message) {
        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setAction(action);
        log.setTableName(tableName);
        log.setRecordId(recordId);
        log.setNewValue(message);
        
        auditLogRepository.save(log);
    }

    /**
     * Get audit logs by user
     */
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByUser(Long userId) {
        return auditLogRepository.findByUserUserId(userId);
    }

    /**
     * Get audit logs by user with pagination
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByUser(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return auditLogRepository.findByUserUserId(userId, pageable);
    }

    /**
     * Get audit logs by table
     */
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByTable(String tableName) {
        return auditLogRepository.findByTableName(tableName);
    }

    /**
     * Get audit logs by table with pagination
     */
    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByTable(String tableName, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return auditLogRepository.findByTableName(tableName, pageable);
    }

    /**
     * Get audit logs by action
     */
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByAction(String action) {
        return auditLogRepository.findByAction(action);
    }

    /**
     * Get audit logs for a specific record
     */
    @Transactional(readOnly = true)
    public List<AuditLog> getRecordHistory(String tableName, Long recordId) {
        return auditLogRepository.findByTableNameAndRecordIdOrderByCreatedAtDesc(tableName, recordId);
    }

    /**
     * Get recent audit logs
     */
    @Transactional(readOnly = true)
    public List<AuditLog> getRecentAuditLogs(int limit) {
        return auditLogRepository.findRecentLogs(limit);
    }

    /**
     * Get audit logs by date range
     */
    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return auditLogRepository.findByDateRange(startDate, endDate);
    }

    /**
     * Get user activity summary
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getUserActivitySummary(Long userId) {
        List<Object[]> results = auditLogRepository.getUserActivitySummary(userId);
        
        Map<String, Long> summary = new HashMap<>();
        for (Object[] result : results) {
            String action = (String) result[0];
            Long count = (Long) result[1];
            summary.put(action, count);
        }
        
        return summary;
    }

    /**
     * Get system activity summary (last 30 days)
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getSystemActivitySummary() {
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);
        List<Object[]> results = auditLogRepository.getSystemActivitySummary(startDate);
        
        Map<String, Long> summary = new HashMap<>();
        for (Object[] result : results) {
            String action = (String) result[0];
            Long count = (Long) result[1];
            summary.put(action, count);
        }
        
        return summary;
    }

    /**
     * Clean up old audit logs (older than specified months)
     */
    @Transactional
    public void cleanupOldLogs(int months) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusMonths(months);
        auditLogRepository.deleteByCreatedAtBefore(cutoffDate);
        System.out.println("Deleted audit logs older than " + months + " months");
    }

    /**
     * Export audit logs to JSON
     */
    @Transactional(readOnly = true)
    public String exportAuditLogs(LocalDateTime startDate, LocalDateTime endDate) {
        try {
            List<AuditLog> logs = auditLogRepository.findByDateRange(startDate, endDate);
            return objectMapper.writeValueAsString(logs);
        } catch (Exception e) {
            System.err.println("Failed to export audit logs: " + e.getMessage());
            return "[]";
        }
    }
}