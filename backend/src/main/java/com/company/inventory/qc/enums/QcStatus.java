package com.company.inventory.qc.enums;

/**
 * Lifecycle status of a StockInBatch with respect to QC.
 */
public enum QcStatus {
    PENDING_QC,          // freshly created, awaiting QC review
    QC_APPROVED,         // all lots accepted
    QC_REJECTED,         // all lots rejected
    QC_HOLD,             // held for further investigation
    PARTIAL_APPROVED     // some lots accepted, some rejected/held
}
