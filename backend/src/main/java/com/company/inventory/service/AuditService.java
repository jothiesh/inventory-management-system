package com.company.inventory.service;

import com.company.inventory.entity.AuditLog;
import com.company.inventory.entity.User;
import com.company.inventory.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    // ─── Write operations ─────────────────────────────────────────────────────

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
            log.setIpAddress(ipAddress);

            if (oldValue != null) {
                log.setOldValue(objectMapper.writeValueAsString(oldValue));
            }
            if (newValue != null) {
                log.setNewValue(objectMapper.writeValueAsString(newValue));
            }

            auditLogRepository.save(log);
        } catch (Exception e) {
            log.error("Failed to create audit log: {}", e.getMessage(), e);
        }
    }

    @Async
    @Transactional
    public void logAction(User user, String action, String tableName, Long recordId) {
        logAction(user, action, tableName, recordId, null, null, null);
    }

    @Async
    @Transactional
    public void logAction(User user, String action) {
        logAction(user, action, null, null, null, null, null);
    }

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

    // ─── Read operations ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByUser(Long userId) {
        return auditLogRepository.findByUserUserId(userId);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByUser(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return auditLogRepository.findByUserUserId(userId, pageable);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByTable(String tableName) {
        return auditLogRepository.findByTableName(tableName);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogsByTable(String tableName, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return auditLogRepository.findByTableName(tableName, pageable);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByAction(String action) {
        return auditLogRepository.findByAction(action);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getRecordHistory(String tableName, Long recordId) {
        return auditLogRepository.findByTableNameAndRecordIdOrderByCreatedAtDesc(tableName, recordId);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getRecentAuditLogs(int limit) {
        // FIX: pass Pageable instead of raw int limit
        return auditLogRepository.findRecentLogs(PageRequest.of(0, limit));
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return auditLogRepository.findByDateRange(startDate, endDate);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getUserActivitySummary(Long userId) {
        List<Object[]> results = auditLogRepository.getUserActivitySummary(userId);
        Map<String, Long> summary = new HashMap<>();
        for (Object[] result : results) {
            summary.put((String) result[0], (Long) result[1]);
        }
        return summary;
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getSystemActivitySummary() {
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);
        List<Object[]> results = auditLogRepository.getSystemActivitySummary(startDate);
        Map<String, Long> summary = new HashMap<>();
        for (Object[] result : results) {
            summary.put((String) result[0], (Long) result[1]);
        }
        return summary;
    }

    // ─── Maintenance ──────────────────────────────────────────────────────────

    @Transactional
    public void cleanupOldLogs(int months) {
        LocalDateTime cutoffDate = LocalDateTime.now().minusMonths(months);
        auditLogRepository.deleteByCreatedAtBefore(cutoffDate);
        log.info("Deleted audit logs older than {} months", months);
    }

    @Transactional(readOnly = true)
    public String exportAuditLogs(LocalDateTime startDate, LocalDateTime endDate) {
        try {
            List<AuditLog> logs = auditLogRepository.findByDateRange(startDate, endDate);
            return objectMapper.writeValueAsString(logs);
        } catch (Exception e) {
            log.error("Failed to export audit logs: {}", e.getMessage(), e);
            return "[]";
        }
    }
}