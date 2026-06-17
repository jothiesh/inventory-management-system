package com.company.inventory.qc.repository;

import com.company.inventory.qc.entity.QcAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QcAlertRepository extends JpaRepository<QcAlert, Long> {

    List<QcAlert> findAllByOrderByCreatedAtDesc();

    List<QcAlert> findByIsReadFalseOrderByCreatedAtDesc();

    long countByIsReadFalse();

    @Modifying
    @Query("UPDATE QcAlert a SET a.isRead = true, a.readAt = CURRENT_TIMESTAMP WHERE a.alertId = :id AND a.isRead = false")
    int markAsRead(@Param("id") Long id);

    @Modifying
    @Query("UPDATE QcAlert a SET a.isRead = true, a.readAt = CURRENT_TIMESTAMP WHERE a.isRead = false")
    int markAllAsRead();

    // ★ KEY FIX: Check if alert already exists for this batch + type
    // Prevents duplicate alerts from being created
    boolean existsByBatchIdAndAlertType(Long batchId, String alertType);

    // Check if alert exists for inspection + type
    boolean existsByInspectionIdAndAlertType(Long inspectionId, String alertType);

    // For overdue — check if HIGH severity alert exists for this batch
    boolean existsByBatchIdAndAlertTypeAndSeverity(Long batchId, String alertType, String severity);
}