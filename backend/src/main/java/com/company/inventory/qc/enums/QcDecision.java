package com.company.inventory.qc.enums;

/**
 * Decision recorded against a single lot during inspection.
 */
public enum QcDecision {
    ACCEPTED,   // qty passes QC and moves to current_stock
    REJECTED,   // qty fails QC, lot is cancelled
    HOLD,       // qty held for further check, not moved
    PARTIAL     // mixed result (some accepted, some rejected/held)
}
