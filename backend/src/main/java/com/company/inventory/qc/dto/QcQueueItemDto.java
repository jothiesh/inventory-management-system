package com.company.inventory.qc.dto;

import com.company.inventory.qc.enums.QcStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * One row in the QC queue page.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QcQueueItemDto {

    private Long batchId;
    private String batchRef;
    private String invoiceNo;
    private String supplierName;
    private LocalDate receivedDate;
    private Integer itemCount;
    private BigDecimal totalQty;
   
    private QcStatus qcStatus;
    private LocalDateTime createdAt;
    private String createdBy;                    // username
    // ── Category fields — PRIMARY (used by QcQueue.jsx) ──────────
    /** The primary category code of this batch e.g. "STICKER", "IC", "PCB" */
    private String      categoryCode;
 
    /** Human-readable category name e.g. "Sticker", "Fuel Hose", "PCB" */
    private String      categoryName;
 
    // ── All categories present (for multi-category batches) ───────
    private List<String> categoriesPresent;
}
 