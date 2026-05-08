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

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    // ─── User queries ─────────────────────────────────────────────────────────

    List<AuditLog> findByUserUserId(Long userId);

    Page<AuditLog> findByUserUserId(Long userId, Pageable pageable);

    List<AuditLog> findByUserUserIdAndAction(Long userId, String action);

    // ─── Table / record queries ───────────────────────────────────────────────

    List<AuditLog> findByTableName(String tableName);

    Page<AuditLog> findByTableName(String tableName, Pageable pageable);

    List<AuditLog> findByTableNameAndRecordIdOrderByCreatedAtDesc(String tableName, Long recordId);

    // ─── Action queries ───────────────────────────────────────────────────────

    List<AuditLog> findByAction(String action);

    Page<AuditLog> findByAction(String action, Pageable pageable);

    // ─── IP address ───────────────────────────────────────────────────────────

    List<AuditLog> findByIpAddress(String ipAddress);

    // ─── Date range ───────────────────────────────────────────────────────────

    @Query("SELECT al FROM AuditLog al " +
           "WHERE al.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY al.createdAt DESC")
    List<AuditLog> findByDateRange(@Param("startDate") LocalDateTime startDate,
                                   @Param("endDate") LocalDateTime endDate);

    @Query("SELECT al FROM AuditLog al " +
           "WHERE al.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY al.createdAt DESC")
    Page<AuditLog> findByDateRange(@Param("startDate") LocalDateTime startDate,
                                   @Param("endDate") LocalDateTime endDate,
                                   Pageable pageable);

    // ─── Recent logs ──────────────────────────────────────────────────────────

    /**
     * FIX: Native query LIMIT with named param fails in MySQL.
     * Use JPQL + Pageable instead — works on all databases.
     * Call with: PageRequest.of(0, limit)
     */
    @Query("SELECT al FROM AuditLog al ORDER BY al.createdAt DESC")
    List<AuditLog> findRecentLogs(Pageable pageable);

    // ─── Counts ───────────────────────────────────────────────────────────────

    @Query("SELECT COUNT(al) FROM AuditLog al WHERE al.user.userId = :userId")
    Long countByUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(al) FROM AuditLog al WHERE al.action = :action")
    Long countByAction(@Param("action") String action);

    // ─── Summaries ────────────────────────────────────────────────────────────

    @Query("SELECT al.action, COUNT(al) FROM AuditLog al " +
           "WHERE al.user.userId = :userId " +
           "GROUP BY al.action")
    List<Object[]> getUserActivitySummary(@Param("userId") Long userId);

    @Query("SELECT al.action, COUNT(al) FROM AuditLog al " +
           "WHERE al.createdAt >= :startDate " +
           "GROUP BY al.action " +
           "ORDER BY COUNT(al) DESC")
    List<Object[]> getSystemActivitySummary(@Param("startDate") LocalDateTime startDate);

    // ─── Maintenance ──────────────────────────────────────────────────────────

    void deleteByCreatedAtBefore(LocalDateTime date);
}