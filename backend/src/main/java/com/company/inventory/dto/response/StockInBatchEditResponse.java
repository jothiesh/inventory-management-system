package com.company.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Flat response returned after a batch edit — safe to serialize,
 * no lazy-proxy fields, no circular refs.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockInBatchEditResponse {

    private Long   id;
    private String batchRef;
    private String invoiceNo;

    private Long   supplierId;
    private String supplierName;

    private LocalDate     receivedDate;
    private BigDecimal    totalQty;
    private Integer       itemCount;
    private String        qcStatus;
    private String        notes;

    private LocalDateTime updatedAt;
}