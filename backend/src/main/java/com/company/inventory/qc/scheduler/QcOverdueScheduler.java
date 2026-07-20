package com.company.inventory.qc.scheduler;

import com.company.inventory.qc.entity.StockInBatch;
import com.company.inventory.qc.enums.QcStatus;
import com.company.inventory.qc.repository.StockInBatchRepository;
import com.company.inventory.qc.service.QcAlertService;
import com.company.inventory.qc.service.QcEmailNotificationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Scheduled job:
 *    1. Find batches in PENDING_QC longer than threshold (default 24h)
 *    2. Create OVERDUE alert + send email
 *
 * Runs every hour by default. Configure via:
 *    qc.overdue.threshold-hours=24
 *    qc.overdue.cron=0 0 * * * *
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class QcOverdueScheduler {

    private final StockInBatchRepository batchRepo;
    private final QcAlertService alertService;
    private final QcEmailNotificationService emailService;

    @Value("${qc.overdue.threshold-hours:24}")
    private int thresholdHours;

    @Scheduled(cron = "${qc.overdue.cron:0 0 * * * *}")
    public void checkOverdueBatches() {
        log.debug("Waking up cron execution thread context to run periodic QC overdue checks loop.");
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusHours(thresholdHours);
            log.trace("Evaluating batch records against cutoff criteria boundary timestamp: {}", cutoff);
            
            List<StockInBatch> overdue = batchRepo.findByQcStatusAndCreatedAtBefore(
                    QcStatus.PENDING_QC, cutoff);

            if (overdue.isEmpty()) {
                log.debug("QC overdue checkpoint scan complete. Zero outstanding batches found matching violation filters.");
                return;
            }

            log.info("Discovered {} overdue QC batch(es) that have breached the maximum holding threshold parameters (> {} hours)",
                     overdue.size(), thresholdHours);

            for (StockInBatch batch : overdue) {
                try {
                    long hours = ChronoUnit.HOURS.between(batch.getCreatedAt(), LocalDateTime.now());
                    Long batchId = batch.getId();   // ★ was a 3-way reflective lookup — see below
                    
                    log.warn("Batch reference token '{}' is flagged as overdue! Elapsed downtime: {} hours. Primary storage structural lookup identifier: {}", 
                            batch.getBatchRef(), hours, batchId);

                    log.debug("Dispatching prioritized escalation notification records to system alerts dashboard engine.");
                    alertService.alertOverdue(
                            batchId,
                            batch.getBatchRef(),
                            (int) hours);

                    log.debug("Streaming out asynchronous escalation notification emails straight to QC supervisors distribution channels.");
                    emailService.sendOverdueEmail(batch.getBatchRef(), (int) hours);
                    
                    log.trace("Successfully executed complete alert routing loops for overdue batch code token: '{}'", batch.getBatchRef());
                } catch (Exception itemEx) {
                    log.error("Internal loop processing block fault occurred while parsing specific batch sequence reference token '{}': {}", 
                            batch.getBatchRef(), itemEx.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Global core engine runtime error collapsed the scheduled background QC overdue processing thread: ", e);
        }
        log.debug("QC overdue scheduler periodic run lifecycle block finished clean execution parameters.");
    }

    /**
     * ★ AUTO-DELETE — daily at 03:00.
     *
     * This method existed but did nothing: the body was a comment saying
     * "wire to QcAlertRepository.purgeOlderThan90Days() if desired". Nothing
     * was ever wired, so no alert was ever deleted by anything. Combined with
     * alerts never being resolved on inspection, the table only ever grew.
     *
     * Retention is configured on QcAlertService:
     *      qc.alert.purge.read-after-days=30
     *      qc.alert.purge.any-after-days=90
     */
    @Scheduled(cron = "${qc.alert.purge.cron:0 0 3 * * *}")
    public void purgeOldAlerts() {
        try {
            int deleted = alertService.purgeOldAlerts();
            log.info("QC alert retention purge finished. {} row(s) deleted.", deleted);
        } catch (Exception e) {
            log.error("QC alert retention purge failed: {}", e.getMessage(), e);
        }
    }

    // ★ REMOVED: getBatchId(StockInBatch) — a reflective probe trying
    //   getBatchId() / getId() / getStockInBatchId() in turn. StockInBatch has
    //   exactly one id accessor, getId(), and it is compile-time visible right
    //   here. The reflection could only ever return what batch.getId() returns,
    //   while costing a Method lookup per batch per hour and turning a
    //   rename into a silent runtime null instead of a build error.
}