package com.company.inventory.qc.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * QC Email Notification Service
 * Email is temporarily DISABLED — all methods log and return early.
 * To re-enable: set qc.email.enabled=true in application.properties
 * and uncomment the JavaMailSender injection + mail logic.
 */
@Service
@Slf4j
public class QcEmailNotificationService {

    @Value("${qc.email.enabled:false}")
    private boolean emailEnabled;

    // ── NEW: Stock OUT alert email (Damage / Scrap) ──────────────
    public void sendStockOutAlert(String partNumber, String description,
                                   String qty, String transactionType,
                                   String referenceNumber, String issuedBy) {
        if (!emailEnabled) {
            log.debug("Email disabled — skipping sendStockOutAlert for {} {}", transactionType, partNumber);
            return;
        }
        // Uncomment when email is re-enabled:
        // try {
        //     List<String> recipients = getQcRecipientEmails();
        //     if (recipients.isEmpty()) return;
        //     SimpleMailMessage msg = new SimpleMailMessage();
        //     msg.setFrom(fromAddress);
        //     msg.setTo(recipients.toArray(new String[0]));
        //     msg.setSubject("[Thinture QC] " + transactionType + " stock out — " + partNumber);
        //     msg.setText(String.format(
        //         "Hello QC Team,%n%nA %s stock out requires review:%n%n" +
        //         "  Part Number : %s%n  Description : %s%n  Quantity    : %s%n" +
        //         "  Reference   : %s%n  Issued By   : %s%n%n" +
        //         "Review: https://thinture.example/qc/alerts%n%n— Thinture IMS",
        //         transactionType, partNumber, description, qty,
        //         referenceNumber != null ? referenceNumber : "—", issuedBy
        //     ));
        //     mailSender.send(msg);
        // } catch (Exception e) {
        //     log.warn("Failed to send stock out alert email", e);
        // }
    }

    // ── New batch email ──────────────────────────────────────────
    public void sendNewBatchEmail(String batchRef, String category,
                                   int itemCount, String supplier) {
        if (!emailEnabled) {
            log.debug("Email disabled — skipping sendNewBatchEmail for {}", batchRef);
            return;
        }
    }

    // ── Rejection email ──────────────────────────────────────────
    public void sendRejectionEmail(String batchRef, int rejectedItems,
                                    String reason, String inspectorName) {
        if (!emailEnabled) {
            log.debug("Email disabled — skipping sendRejectionEmail for {}", batchRef);
            return;
        }
    }

    // ── Overdue email ────────────────────────────────────────────
    public void sendOverdueEmail(String batchRef, int hoursOverdue) {
        if (!emailEnabled) {
            log.debug("Email disabled — skipping sendOverdueEmail for {}", batchRef);
            return;
        }
    }
}