package com.company.inventory.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Flat DTO — no lazy proxies leak to JSON. */
@Data
public class DeliveryChallanResponse {

    private Long id;
    private String dcNumber;

    private Long supplierId;
    private String supplierName;
    private String supplierAddress;
    private String supplierGstin;

    private LocalDate dcDate;
    private String status;
    private String purpose;
    private String remarks;

    private String txnGroupId;
    private Long assemblyBatchId;
    private String assemblyBatchRef;

    private Integer itemCount;
    private BigDecimal totalQty;

    private LocalDateTime sentAt;
    private LocalDateTime assemblyReceivedAt;
    private LocalDateTime closedAt;

    private String createdByName;
    private LocalDateTime createdAt;

    private List<ItemDto> items;

    @Data
    public static class ItemDto {
        private Long id;
        private Long productId;
        private String partNumber;
        private String description;
        private String categoryName;
        private BigDecimal qty;
        private BigDecimal rate;
        private String remarks;
    }
}
