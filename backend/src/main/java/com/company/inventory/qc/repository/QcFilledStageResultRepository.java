package com.company.inventory.qc.repository;

import com.company.inventory.qc.entity.QcFilledStageResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QcFilledStageResultRepository extends JpaRepository<QcFilledStageResult, Long> {

    List<QcFilledStageResult> findByFilledChecklistId(Long filledChecklistId);

    void deleteByFilledChecklistId(Long filledChecklistId);
}
