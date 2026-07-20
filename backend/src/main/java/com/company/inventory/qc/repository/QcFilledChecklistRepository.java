package com.company.inventory.qc.repository;

import com.company.inventory.qc.entity.QcFilledChecklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QcFilledChecklistRepository extends JpaRepository<QcFilledChecklist, Long> {

    /** Committed record for a finished inspection. */
    @Query("""
           select distinct c from QcFilledChecklist c
             left join fetch c.results r
             left join fetch r.stage
             left join fetch c.template
           where c.inspection.id = :inspectionId
           """)
    Optional<QcFilledChecklist> findByInspectionId(@Param("inspectionId") Long inspectionId);

    /** Download-time draft for a batch that has not been decided yet. */
    @Query("""
           select distinct c from QcFilledChecklist c
             left join fetch c.results r
             left join fetch r.stage
             left join fetch c.template
           where c.batchId = :batchId and c.inspection is null
           """)
    Optional<QcFilledChecklist> findDraftByBatchId(@Param("batchId") Long batchId);

    /** All drafts for a batch — normally 0 or 1; used to clean up duplicates. */
    List<QcFilledChecklist> findByBatchIdAndInspectionIsNull(Long batchId);

    boolean existsByInspectionId(Long inspectionId);
}
