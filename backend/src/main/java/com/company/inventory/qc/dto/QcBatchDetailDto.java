package com.company.inventory.qc.dto;

import com.company.inventory.qc.enums.QcStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Full detail for inspection screen.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QcBatchDetailDto {

    private Long batchId;
    private String batchRef;
    private String invoiceNo;
    private String supplierName;
    private LocalDate receivedDate;
    private QcStatus qcStatus;
    private String notes;
    private List<BatchLot> lots;
    private List<ChecklistTemplateDto> applicableTemplates;

    // ─── ★ ADDED FIELDS TO FIX COMPILATION + UI CARD HERO LABELS ★ ───
    private String categoryCode;
    private String categoryName;
    private BigDecimal totalQuantity;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchLot {
        private Long lotId;
        private String lotNumber;
        private Long productId;
        private String partNumber;
        private String description;
        private String categoryCode;        // STICKER / IC / PCB / ENCLOSURE
        private String categoryName;
        private BigDecimal qtyReceived;
        private BigDecimal purchasePrice;
        private String hsnCode;
        private String rackName;
        private String boxLabel;
    }
}