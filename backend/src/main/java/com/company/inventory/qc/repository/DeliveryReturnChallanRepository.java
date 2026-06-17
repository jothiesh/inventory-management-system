package com.company.inventory.qc.repository;

import com.company.inventory.qc.entity.DeliveryReturnChallan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryReturnChallanRepository extends JpaRepository<DeliveryReturnChallan, Long> {

    List<DeliveryReturnChallan> findAllByOrderByCreatedAtDesc();

    List<DeliveryReturnChallan> findByOriginalBatchIdOrderByCreatedAtDesc(Long batchId);

    List<DeliveryReturnChallan> findByStatus(String status);

    boolean existsByOriginalBatchIdAndStatus(Long batchId, String status);

    Optional<DeliveryReturnChallan> findByDcNumber(String dcNumber);

    @Query("SELECT COUNT(d) FROM DeliveryReturnChallan d WHERE d.status IN ('DRAFT','SENT')")
    long countPending();
}