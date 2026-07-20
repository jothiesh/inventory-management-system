package com.company.inventory.qc.service;

import com.company.inventory.qc.dto.QcAlertDto;
import com.company.inventory.qc.entity.QcAlert;
import com.company.inventory.qc.repository.QcAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Manages QC in-app alerts.
 *
 * ★ FIRE-ONCE. The backoff model (2d / 4d / 8d escalation) is removed.
 *
 * THE RULE
 * ────────
 *   1. An event happens          -> exactly ONE alert row.
 *   2. It never re-raises.       -> QcOverdueScheduler runs hourly and hits
 *                                   the exists-guard, so a batch that stays
 *                                   overdue for a week still has ONE alert.
 *   3. The condition clears      -> the row is DELETED (resolveForBatch),
 *                                   called from QcInspectionService when a
 *                                   batch leaves PENDING_QC.
 *   4. Anything left over        -> purged on a retention schedule
 *                                   (QcOverdueScheduler.purgeOldAlerts).
 *
 * Steps 3 and 4 are what stop the list growing to 27 stale rows. Step 2 alone
 * never did — nothing ever removed an alert once raised.
 *
 * IDENTITY. "The same event" is:
 *   · (batch_id, alert_type)       for NEW_BATCH / OVERDUE / HOLD_REMINDER
 *   · (inspection_id, alert_type)  for REJECTED
 *
 * REJECTED keys on the inspection deliberately. Keying it on the batch would
 * mean a replacement batch rejected a second time is silently swallowed —
 * every inspection is its own event and must alert.
 *
 * Retention, tunable without a redeploy:
 *      qc.alert.purge.read-after-days=30
 *      qc.alert.purge.any-after-days=90
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QcAlertService {

    private final QcAlertRepository repo;

    /** Read alerts older than this are deleted. */
    @Value("${qc.alert.purge.read-after-days:30}")
    private int purgeReadAfterDays;

    /** Hard ceiling — anything older goes, read or not. 0 disables. */
    @Value("${qc.alert.purge.any-after-days:90}")
    private int purgeAnyAfterDays;

    // ─── Create ─────────────────────────────────────────────────────

    @Transactional
    public QcAlert createAlert(String type, String severity, String title,
                               String message, Long batchId, Long inspectionId) {

        // ── Fire-once guard ──
        if (batchId != null && repo.existsByBatchIdAndAlertType(batchId, type)) {
            log.debug("Alert skipped — {} already raised for batch {}", type, batchId);
            return null;
        }
        if (inspectionId != null && repo.existsByInspectionIdAndAlertType(inspectionId, type)) {
            log.debug("Alert skipped — {} already raised for inspection {}", type, inspectionId);
            return null;
        }

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
        log.info("Alert raised. type={}, batch={}, inspection={}, id={}",
                type, batchId, inspectionId, saved.getAlertId());
        return saved;
    }

    // ─── Convenience wrappers ───────────────────────────────────────

    public QcAlert alertNewBatch(Long batchId, String batchRef, int itemCount, String category) {
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
        // inspection-scoped: a re-rejected replacement batch must alert again
        return createAlert(
                "REJECTED",
                "HIGH",
                "Batch rejected",
                String.format("Batch %s had %d rejected item(s). Reason: %s",
                        batchRef, rejectedItems, reason != null ? reason : "see inspection report"),
                null, inspectionId);
    }

    public QcAlert alertHoldReminder(Long batchId, String batchRef, int daysOnHold) {
        return createAlert(
                "HOLD_REMINDER",
                "MEDIUM",
                "Batch on hold",
                String.format("Batch %s has been on hold for %d days. Please review.",
                        batchRef, daysOnHold),
                batchId, null);
    }

    public QcAlert alertOverdue(Long batchId, String batchRef, int hoursOverdue) {
        String severity = hoursOverdue >= 72 ? "HIGH" : "MEDIUM";
        String age = hoursOverdue >= 48
                ? String.format("%d days", hoursOverdue / 24)
                : String.format("%d hours", hoursOverdue);

        return createAlert(
                "OVERDUE",
                severity,
                "Overdue inspection",
                String.format("Batch %s has been pending QC for %s.", batchRef, age),
                batchId, null);
    }

    // ─── Resolve ────────────────────────────────────────────────────

    /**
     * ★ The condition cleared — delete the alert.
     *
     * Called from QcInspectionService.finalizeBatch() when a batch leaves
     * PENDING_QC. Nothing used to do this: an alert raised the day a batch
     * arrived stayed in the list forever, which is most of why the page filled
     * with "pending QC for 24 hours" for batches inspected weeks ago.
     */
    @Transactional
    public int resolveForBatch(Long batchId, String... types) {
        if (batchId == null) return 0;
        List<QcAlert> open = (types == null || types.length == 0)
                ? repo.findByBatchId(batchId)
                : repo.findByBatchIdAndAlertTypeIn(batchId, List.of(types));

        if (open.isEmpty()) return 0;
        repo.deleteAll(open);
        log.info("Resolved {} alert(s) for batch {} — condition cleared.", open.size(), batchId);
        return open.size();
    }

    // ─── ★ Auto-delete (retention) ──────────────────────────────────

    /**
     * Called by QcOverdueScheduler once a day. Two tiers:
     *   · read alerts past read-after-days  — seen, no longer useful
     *   · anything past any-after-days      — hard ceiling, read or not
     */
    @Transactional
    public int purgeOldAlerts() {
        int total = 0;

        if (purgeReadAfterDays > 0) {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(purgeReadAfterDays);
            int n = repo.purgeReadOlderThan(cutoff);
            if (n > 0) log.info("Purged {} read alert(s) older than {} days.", n, purgeReadAfterDays);
            total += n;
        }

        if (purgeAnyAfterDays > 0) {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(purgeAnyAfterDays);
            int n = repo.purgeAnyOlderThan(cutoff);
            if (n > 0) log.info("Purged {} alert(s) past the {}-day ceiling.", n, purgeAnyAfterDays);
            total += n;
        }

        if (total == 0) log.debug("Alert purge ran — nothing old enough to delete.");
        return total;
    }

    // ─── Read ───────────────────────────────────────────────────────

    public List<QcAlertDto> getAll() {
        return repo.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    public List<QcAlertDto> getUnread() {
        return repo.findByIsReadFalseOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    public long getUnreadCount() {
        return repo.countByIsReadFalse();
    }

    // ─── Mark as read ───────────────────────────────────────────────

    @Transactional
    public boolean markAsRead(Long alertId) {
        return repo.markAsRead(alertId) > 0;
    }

    @Transactional
    public int markAllAsRead() {
        int updated = repo.markAllAsRead();
        log.info("Marked {} alert(s) as read.", updated);
        return updated;
    }

    // ─── Delete ─────────────────────────────────────────────────────

    @Transactional
    public boolean deleteAlert(Long alertId) {
        if (!repo.existsById(alertId)) return false;
        repo.deleteById(alertId);
        return true;
    }

    /** ★ One statement instead of a loop of deleteById. */
    @Transactional
    public int deleteAlerts(List<Long> alertIds) {
        if (alertIds == null || alertIds.isEmpty()) return 0;
        int deleted = repo.deleteByAlertIdIn(alertIds);
        log.info("Bulk deleted {} of {} requested alert(s).", deleted, alertIds.size());
        return deleted;
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