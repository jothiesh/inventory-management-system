package com.company.inventory.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for editing an existing StockInBatch (PENDING_QC only).
 * All fields are optional — only non-null values are applied (patch semantics).
 */
@Data
public class StockInBatchEditRequest {

    /** Supplier to attach/change. Nullable — pass null to clear. */
    private Long supplierId;

    /** Invoice / reference number */
    private String invoiceNo;

    /** Date goods were physically received */
    private LocalDate receivedDate;

    /** Free-form QC / warehouse notes */
    private String notes;

    // ── Future-extensible fields ──────────────────────────────────
    // Add lotEdits, itemAdditions, etc. here later without breaking
    // the existing contract.
}