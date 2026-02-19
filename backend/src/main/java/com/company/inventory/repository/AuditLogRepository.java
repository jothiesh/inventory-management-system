package com.company.inventory.repository;

import com.company.inventory.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for AuditLog entity
 * Provides queries for audit trail tracking
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Find audit logs by user
     */
    List<AuditLog> findByUserUserId(Long userId);

    /**
     * Find audit logs by user with pagination
     */
    Page<AuditLog> findByUserUserId(Long userId, Pageable pageable);

    /**
     * Find audit logs by table name
     */
    List<AuditLog> findByTableName(String tableName);

    /**
     * Find audit logs by table name with pagination
     */
    Page<AuditLog> findByTableName(String tableName, Pageable pageable);

    /**
     * Find audit logs by action
     */
    List<AuditLog> findByAction(String action);

    /**
     * Find audit logs by action with pagination
     */
    Page<AuditLog> findByAction(String action, Pageable pageable);

    /**
     * Find audit logs for a specific record
     */
    List<AuditLog> findByTableNameAndRecordIdOrderByCreatedAtDesc(String tableName, Long recordId);

    /**
     * Find audit logs by date range
     */
    @Query("SELECT al FROM AuditLog al WHERE al.createdAt BETWEEN :startDate AND :endDate ORDER BY al.createdAt DESC")
    List<AuditLog> findByDateRange(@Param("startDate") LocalDateTime startDate, 
                                   @Param("endDate") LocalDateTime endDate);

    /**
     * Find audit logs by date range with pagination
     */
    @Query("SELECT al FROM AuditLog al WHERE al.createdAt BETWEEN :startDate AND :endDate ORDER BY al.createdAt DESC")
    Page<AuditLog> findByDateRange(@Param("startDate") LocalDateTime startDate, 
                                   @Param("endDate") LocalDateTime endDate,
                                   Pageable pageable);

    /**
     * Find recent audit logs
     */
    @Query(value = "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT :limit", nativeQuery = true)
    List<AuditLog> findRecentLogs(@Param("limit") int limit);

    /**
     * Find audit logs by user and action
     */
    List<AuditLog> findByUserUserIdAndAction(Long userId, String action);

    /**
     * Find audit logs by IP address
     */
    List<AuditLog> findByIpAddress(String ipAddress);

    /**
     * Count logs by user
     */
    @Query("SELECT COUNT(al) FROM AuditLog al WHERE al.user.userId = :userId")
    Long countByUser(@Param("userId") Long userId);

    /**
     * Count logs by action
     */
    @Query("SELECT COUNT(al) FROM AuditLog al WHERE al.action = :action")
    Long countByAction(@Param("action") String action);

    /**
     * Get user activity summary
     */
    @Query("SELECT al.action, COUNT(al) FROM AuditLog al " +
           "WHERE al.user.userId = :userId " +
           "GROUP BY al.action")
    List<Object[]> getUserActivitySummary(@Param("userId") Long userId);

    /**
     * Get system activity summary
     */
    @Query("SELECT al.action, COUNT(al) FROM AuditLog al " +
           "WHERE al.createdAt >= :startDate " +
           "GROUP BY al.action " +
           "ORDER BY COUNT(al) DESC")
    List<Object[]> getSystemActivitySummary(@Param("startDate") LocalDateTime startDate);

    /**
     * Delete old audit logs (for maintenance)
     */
    void deleteByCreatedAtBefore(LocalDateTime date);
}