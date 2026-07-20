package com.company.inventory.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class AssemblyReceivedRequest {

    /** optional — blank falls back to the DC number */
    private String invoiceNo;

    private LocalDate receivedDate;

    private String remarks;

    /**
     * The finished assembly product(s) received back.
     * Optional — empty list still creates the PENDING_QC batch shell
     * (stock the lots later via normal Stock IN if preferred).
     */
    private List<AssemblyItem> assemblyItems;

    @Data
    public static class AssemblyItem {
        private Long productId;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
    }
}
