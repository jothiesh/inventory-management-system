package com.company.inventory.qc.repository;

import com.company.inventory.qc.entity.StockInBatch;
import com.company.inventory.qc.enums.QcStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StockInBatchRepository extends JpaRepository<StockInBatch, Long> {

    // ─── Original v1 methods (String-based, kept for backward compat) ───

    List<StockInBatch> findByQcStatusOrderByCreatedAtDesc(String qcStatus);

    List<StockInBatch> findByQcStatus(String qcStatus);

    long countByQcStatus(String qcStatus);


    // ─── New v2 methods (use @Query to avoid name clashes) ───
    //
    // We CANNOT name them countByQcStatus(QcStatus) — Spring Data sees
    // two methods named countByQcStatus and gets confused.
    // Solution: use @Query with .name() to compare against the
    // String column value.

    /**
     * Count batches by QcStatus enum.
     * Used by QcDashboardService for the "Pending QC" KPI.
     */
    @Query("SELECT COUNT(b) FROM StockInBatch b WHERE b.qcStatus = :statusName")
    long countByQcStatusEnum(@Param("statusName") String statusName);

    /**
     * Find batches by QcStatus enum that were created before a cutoff.
     * Used by QcOverdueScheduler.
     */
    @Query("SELECT b FROM StockInBatch b WHERE b.qcStatus = :statusName " +
           "AND b.createdAt < :cutoff")
    List<StockInBatch> findByQcStatusEnumAndCreatedAtBefore(
            @Param("statusName") String statusName,
            @Param("cutoff") LocalDateTime cutoff);


    // ─── Convenience overloads (default methods, no Spring magic) ───
    //
    // These just call .name() on the enum and delegate to the queries
    // above. Keeps caller code clean.

    default long countByQcStatus(QcStatus status) {
        return countByQcStatusEnum(status.name());
    }

    default List<StockInBatch> findByQcStatusAndCreatedAtBefore(
            QcStatus status, LocalDateTime cutoff) {
        return findByQcStatusEnumAndCreatedAtBefore(status.name(), cutoff);
    }
    
    
    
    
 // Add inside the interface:
    List<StockInBatch> findByQcStatusInOrderByCreatedAtDesc(List<String> statuses);

    
}