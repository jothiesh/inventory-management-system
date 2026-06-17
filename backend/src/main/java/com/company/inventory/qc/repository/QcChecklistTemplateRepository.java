package com.company.inventory.qc.repository;

import com.company.inventory.qc.entity.QcChecklistTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QcChecklistTemplateRepository extends JpaRepository<QcChecklistTemplate, Long> {

    List<QcChecklistTemplate> findByActiveTrueOrderByCategoryCodeAsc();

    Optional<QcChecklistTemplate> findByCategoryCode(String categoryCode);
}
