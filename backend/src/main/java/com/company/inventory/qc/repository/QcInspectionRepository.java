package com.company.inventory.qc.repository;

import com.company.inventory.qc.entity.QcInspection;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface QcInspectionRepository extends JpaRepository<QcInspection, Long> {

    // ── Original methods ──────────────────────────────────────
    List<QcInspection> findByBatchIdOrderByInspectedAtDesc(Long batchId);
    boolean existsByBatchId(Long batchId);

    // ── Counts ─────────────────────────────────────────────────
    long countByOverallDecisionAndCreatedAtBetween(
        String decision, LocalDateTime from, LocalDateTime to);

    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    long countByOverallDecision(String decision);

    // ── Lists ─────────────────────────────────────────────────
    List<QcInspection> findByOverallDecisionOrderByCreatedAtDesc(
        String decision, Pageable pageable);

    List<QcInspection> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<QcInspection> findByCreatedAtBetweenOrderByCreatedAtDesc(
        LocalDateTime from, LocalDateTime to);

    List<QcInspection> findByOverallDecisionAndCreatedAtBetweenOrderByCreatedAtDesc(
        String decision, LocalDateTime from, LocalDateTime to);

    // ── Native queries — using ACTUAL columns from your schema ──

    @Query(value =
        "SELECT DATE(i.created_at), i.overall_decision, COUNT(*) " +
        "FROM qc_inspection i " +
        "WHERE i.created_at >= :fromDate " +
        "GROUP BY DATE(i.created_at), i.overall_decision " +
        "ORDER BY DATE(i.created_at) ASC",
        nativeQuery = true)
    List<Object[]> findDailyCounts(@Param("fromDate") LocalDateTime fromDate);

    /**
     * "Category breakdown" — using supplier_name instead of category_code
     * (stock_in_batch has no category — categories belong to lots).
     */
    @Query(value =
        "SELECT COALESCE(i.supplier_name, 'Unknown') AS supplier, " +
        "       i.overall_decision, COUNT(*) " +
        "FROM qc_inspection i " +
        "WHERE i.created_at >= :fromDate " +
        "GROUP BY COALESCE(i.supplier_name, 'Unknown'), i.overall_decision",
        nativeQuery = true)
    List<Object[]> findCategoryBreakdown(@Param("fromDate") LocalDateTime fromDate);

    @Query(value =
        "SELECT DAYOFWEEK(i.created_at), HOUR(i.created_at), COUNT(*) " +
        "FROM qc_inspection i " +
        "WHERE i.created_at >= :fromDate " +
        "GROUP BY DAYOFWEEK(i.created_at), HOUR(i.created_at)",
        nativeQuery = true)
    List<Object[]> findActivityHeatmap(@Param("fromDate") LocalDateTime fromDate);

    /**
     * "Top rejected categories" — using supplier_name as the grouping key.
     */
    @Query(value =
        "SELECT COALESCE(i.supplier_name, 'Unknown') AS supplier, COUNT(*) " +
        "FROM qc_inspection i " +
        "WHERE i.overall_decision IN ('REJECTED', 'PARTIAL') " +
        "AND i.created_at >= :fromDate " +
        "GROUP BY COALESCE(i.supplier_name, 'Unknown') " +
        "ORDER BY COUNT(*) DESC " +
        "LIMIT 5",
        nativeQuery = true)
    List<Object[]> findTopRejectedCategories(@Param("fromDate") LocalDateTime fromDate);

    @Query(value =
        "SELECT i.supplier_name, COUNT(*), " +
        "SUM(CASE WHEN i.overall_decision IN ('REJECTED','PARTIAL') THEN 1 ELSE 0 END) " +
        "FROM qc_inspection i " +
        "WHERE i.created_at >= :fromDate " +
        "AND i.supplier_name IS NOT NULL " +
        "GROUP BY i.supplier_name " +
        "HAVING SUM(CASE WHEN i.overall_decision IN ('REJECTED','PARTIAL') THEN 1 ELSE 0 END) > 0 " +
        "ORDER BY SUM(CASE WHEN i.overall_decision IN ('REJECTED','PARTIAL') THEN 1 ELSE 0 END) DESC " +
        "LIMIT 5",
        nativeQuery = true)
    List<Object[]> findWorstSuppliers(@Param("fromDate") LocalDateTime fromDate);

    @Query(value =
        "SELECT AVG(TIMESTAMPDIFF(SECOND, b.created_at, i.created_at) / 3600.0) " +
        "FROM qc_inspection i " +
        "JOIN stock_in_batch b ON i.stock_in_batch_id = b.id " +
        "WHERE i.created_at >= :fromDate",
        nativeQuery = true)
    Double findAvgTurnaroundHours(@Param("fromDate") LocalDateTime fromDate);
}