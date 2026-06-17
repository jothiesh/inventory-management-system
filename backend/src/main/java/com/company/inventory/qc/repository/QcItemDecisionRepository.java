package com.company.inventory.qc.repository;

import com.company.inventory.qc.entity.QcItemDecision;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Repository for QcItemDecision.
 *
 * Uses 'd.inspection.id' (NOT 'inspectionId') because the QcInspection
 * entity's PK field is named 'id' in this codebase.
 */
@Repository
public interface QcItemDecisionRepository extends JpaRepository<QcItemDecision, Long> {

    // ─── Find by inspection ─────────────────────────────────────────

    @Query("SELECT d FROM QcItemDecision d WHERE d.inspection.id = :inspectionId")
    List<QcItemDecision> findByInspectionInspectionId(@Param("inspectionId") Long inspectionId);

    default List<QcItemDecision> findByInspectionId(Long inspectionId) {
        return findByInspectionInspectionId(inspectionId);
    }

    // ─── Find by lot ────────────────────────────────────────────────

    @Query("SELECT d FROM QcItemDecision d WHERE d.lot.id = :lotId")
    List<QcItemDecision> findByLotId(@Param("lotId") Long lotId);

    // ─── Find by product ───────────────────────────────────────────

    @Query("SELECT d FROM QcItemDecision d WHERE d.product.id = :productId")
    List<QcItemDecision> findByProductId(@Param("productId") Long productId);

    // ─── Find by decision string ───────────────────────────────────

    @Query("SELECT d FROM QcItemDecision d " +
           "WHERE d.inspection.id = :inspectionId " +
           "AND d.decision = :decision")
    List<QcItemDecision> findByInspectionAndDecision(
            @Param("inspectionId") Long inspectionId,
            @Param("decision") String decision);

    @Query("SELECT d FROM QcItemDecision d WHERE d.decision = 'REJECTED'")
    List<QcItemDecision> findAllRejected();

    // ─── Counts ────────────────────────────────────────────────────

    @Query("SELECT COUNT(d) FROM QcItemDecision d WHERE d.decision = :decision")
    long countByDecision(@Param("decision") String decision);

    @Query("SELECT COUNT(d) FROM QcItemDecision d WHERE d.inspection.id = :inspectionId")
    long countByInspectionId(@Param("inspectionId") Long inspectionId);

    // ─── Cleanup ────────────────────────────────────────────────────

    @Modifying
    @Transactional
    @Query("DELETE FROM QcItemDecision d WHERE d.inspection.id = :inspectionId")
    int deleteByInspectionId(@Param("inspectionId") Long inspectionId);
}