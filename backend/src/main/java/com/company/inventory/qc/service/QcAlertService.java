package com.company.inventory.qc.service;

import com.company.inventory.qc.dto.QcAlertDto;
import com.company.inventory.qc.entity.QcAlert;
import com.company.inventory.qc.repository.QcAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Manages QC in-app alerts.
 *
 * Alerts are created at runtime by other QC services
 * (e.g. when a batch enters PENDING_QC or when items are rejected).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QcAlertService {

    private final QcAlertRepository repo;

    // ─── Create ─────────────────────────────────────────────────────

    @Transactional
    public QcAlert createAlert(String type, String severity, String title,
                               String message, Long batchId, Long inspectionId) {

        // ★ DEDUP CHECK — never create the same alert twice for same batch+type
        if (batchId != null && repo.existsByBatchIdAndAlertType(batchId, type)) {
            log.debug("Alert dedup: skipping duplicate {} alert for batch {}", type, batchId);
            return null; // already exists — skip silently
        }
        if (inspectionId != null && repo.existsByInspectionIdAndAlertType(inspectionId, type)) {
            log.debug("Alert dedup: skipping duplicate {} alert for inspection {}", type, inspectionId);
            return null;
        }

        log.info("Creating QC alert. Type: [{}], Severity: [{}], Batch: {}", type, severity, batchId);
        QcAlert alert = QcAlert.builder()
                .alertType(type)
                .severity(severity)
                .title(title)
                .message(message)
                .batchId(batchId)
                .inspectionId(inspectionId)
                .isRead(false)
                .build();

        QcAlert saved = repo.save(alert);
        log.info("Alert created. ID: {}, Batch: {}", saved.getAlertId(), batchId);
        return saved;
    }

    // ─── Convenience wrappers for common alert types ────────────────

    public QcAlert alertNewBatch(Long batchId, String batchRef, int itemCount, String category) {
        log.debug("Assembling 'NEW_BATCH' template wrappers context for SIB identifier: {}", batchRef);
        return createAlert(
                "NEW_BATCH",
                "MEDIUM",
                "New batch awaiting QC",
                String.format("Batch %s (%s, %d items) is pending inspection.",
                        batchRef, category, itemCount),
                batchId, null);
    }

    public QcAlert alertRejection(Long inspectionId, Long batchId, String batchRef,
                                  int rejectedItems, String reason) {
        log.warn("Assembling severe 'REJECTED' alert warning flags context for tracking identifier: {}", batchRef);
        return createAlert(
                "REJECTED",
                "HIGH",
                "Batch rejected",
                String.format("Batch %s had %d rejected item(s). Reason: %s",
                        batchRef, rejectedItems, reason != null ? reason : "see inspection report"),
                batchId, inspectionId);
    }

    public QcAlert alertHoldReminder(Long batchId, String batchRef, int daysOnHold) {
        log.debug("Assembling 'HOLD_REMINDER' timeline tracking alert block for code token: {}", batchRef);
        return createAlert(
                "HOLD_REMINDER",
                "MEDIUM",
                "Batch on hold reminder",
                String.format("Batch %s has been on hold for %d days. Please review.",
                        batchRef, daysOnHold),
                batchId, null);
    }

    public QcAlert alertOverdue(Long batchId, String batchRef, int hoursOverdue) {
        log.warn("Assembling severe temporal breach 'OVERDUE' alert block context for tracking token: {}", batchRef);
        return createAlert(
                "OVERDUE",
                "HIGH",
                "Overdue inspection",
                String.format("Batch %s has been pending QC for %d hours.",
                        batchRef, hoursOverdue),
                batchId, null);
    }

    // ─── Read ───────────────────────────────────────────────────────

    public List<QcAlertDto> getAll() {
        log.debug("Querying data repository layer to pull complete chronologically ordered historical alerts list.");
        return repo.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    public List<QcAlertDto> getUnread() {
        log.debug("Filtering schema index spaces to load all unresolved unread alert nodes.");
        return repo.findByIsReadFalseOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    public long getUnreadCount() {
        long count = repo.countByIsReadFalse();
        log.trace("Polled unread data boundaries balance index counters. Outstanding count: {}", count);
        return count;
    }

    // ─── Mark as read ───────────────────────────────────────────────

    @Transactional
    public boolean markAsRead(Long alertId) {
        log.info("Updating row state flag: Marking Alert context entity ID {} as READ.", alertId);
        int updatedRows = repo.markAsRead(alertId);
        log.debug("Acknowledge status commit completed. Rows modified: {}", updatedRows);
        return updatedRows > 0;
    }

    @Transactional
    public int markAllAsRead() {
        log.warn("Executing bulk modifications operation: Resetting all active unread alert visibility flags to READ.");
        int updatedRows = repo.markAllAsRead();
        log.info("Global notification queue flush completed. Total rows acknowledged: {}", updatedRows);
        return updatedRows;
    }

    // ─── Delete ─────────────────────────────────────────────────────

    @Transactional
    public boolean deleteAlert(Long alertId) {
        log.info("Deleting alert ID: {}", alertId);
        if (!repo.existsById(alertId)) return false;
        repo.deleteById(alertId);
        return true;
    }

    @Transactional
    public int deleteAlerts(java.util.List<Long> alertIds) {
        log.info("Bulk deleting {} alerts.", alertIds.size());
        int count = 0;
        for (Long id : alertIds) {
            if (repo.existsById(id)) { repo.deleteById(id); count++; }
        }
        return count;
    }

    // ─── Mapper ─────────────────────────────────────────────────────

    private QcAlertDto toDto(QcAlert a) {
        return QcAlertDto.builder()
                .alertId(a.getAlertId())
                .alertType(a.getAlertType())
                .severity(a.getSeverity())
                .title(a.getTitle())
                .message(a.getMessage())
                .batchId(a.getBatchId())
                .inspectionId(a.getInspectionId())
                .isRead(a.getIsRead())
                .createdAt(a.getCreatedAt())
                .readAt(a.getReadAt())
                .build();
    }
}