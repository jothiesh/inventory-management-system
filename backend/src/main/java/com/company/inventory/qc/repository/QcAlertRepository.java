package com.company.inventory.qc.repository;

import com.company.inventory.qc.entity.QcAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ★ REVERTED to fire-once + added purge.
 *
 * The backoff lookups (findTopBy...OrderByLastOccurredAtDesc) and the
 * lastOccurredAt ordering are gone. Back to exists-checks and createdAt.
 */
@Repository
public interface QcAlertRepository extends JpaRepository<QcAlert, Long> {

    // ── Fire-once guards ─────────────────────────────────────
    boolean existsByBatchIdAndAlertType(Long batchId, String alertType);

    boolean existsByInspectionIdAndAlertType(Long inspectionId, String alertType);

    // ── Lists ────────────────────────────────────────────────
    List<QcAlert> findAllByOrderByCreatedAtDesc();

    List<QcAlert> findByIsReadFalseOrderByCreatedAtDesc();

    long countByIsReadFalse();

    // ── Resolve (condition cleared) ──────────────────────────
    List<QcAlert> findByBatchId(Long batchId);

    List<QcAlert> findByBatchIdAndAlertTypeIn(Long batchId, List<String> alertTypes);

    // ── Mutations ────────────────────────────────────────────
    @Modifying(clearAutomatically = true)
    @Query("update QcAlert a set a.isRead = true, a.readAt = CURRENT_TIMESTAMP "
         + "where a.alertId = :alertId and a.isRead = false")
    int markAsRead(@Param("alertId") Long alertId);

    @Modifying(clearAutomatically = true)
    @Query("update QcAlert a set a.isRead = true, a.readAt = CURRENT_TIMESTAMP "
         + "where a.isRead = false")
    int markAllAsRead();

    /** ★ One statement instead of N deleteById calls. */
    @Modifying(clearAutomatically = true)
    @Query("delete from QcAlert a where a.alertId in :ids")
    int deleteByAlertIdIn(@Param("ids") List<Long> ids);

    // ── ★ AUTO-DELETE (retention) ────────────────────────────

    /** Read alerts older than the cutoff — they have been seen, they can go. */
    @Modifying(clearAutomatically = true)
    @Query("delete from QcAlert a where a.isRead = true and a.createdAt < :cutoff")
    int purgeReadOlderThan(@Param("cutoff") LocalDateTime cutoff);

    /** Hard ceiling: anything past this goes, read or not. */
    @Modifying(clearAutomatically = true)
    @Query("delete from QcAlert a where a.createdAt < :cutoff")
    int purgeAnyOlderThan(@Param("cutoff") LocalDateTime cutoff);
}