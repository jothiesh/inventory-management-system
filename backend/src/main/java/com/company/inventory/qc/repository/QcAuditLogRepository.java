package com.company.inventory.qc.repository;

import com.company.inventory.qc.entity.QcAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QcAuditLogRepository extends JpaRepository<QcAuditLog, Long> {

    List<QcAuditLog> findByBatchIdOrderByCreatedAtDesc(Long batchId);

    List<QcAuditLog> findByInspectionIdOrderByCreatedAtDesc(Long inspectionId);
}
