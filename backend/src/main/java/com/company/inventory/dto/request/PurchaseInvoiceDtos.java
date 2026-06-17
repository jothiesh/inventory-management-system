package com.company.inventory.dto.request;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class PurchaseInvoiceDtos {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateInvoiceRequest {
        private String invoiceNo;
        private LocalDate invoiceDate;
        private Long supplierId;
        private String supplierName;
        private String supplierGstin;
        private String poNo;
        private BigDecimal invoiceTotal;
        private String currencyCode;
        private List<InvoiceItemRequest> items;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InvoiceItemRequest {
        private Integer slNo;
        private String partNo;
        private String description;
        private String hsnSac;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal lineTotal;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InvoiceSummaryDto {
        private Long id;
        private String invoiceNo;
        private LocalDate invoiceDate;
        private String supplierName;
        private String poNo;
        private BigDecimal invoiceTotal;
        private String currencyCode;
        private boolean hasFile;
        private String fileName;
        private Long stockInBatchId;
        private LocalDateTime uploadedAt;
        private Integer itemCount;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InvoiceDetailDto {
        private Long id;
        private String invoiceNo;
        private LocalDate invoiceDate;
        private Long supplierId;
        private String supplierName;
        private String supplierGstin;
        private String poNo;
        private BigDecimal invoiceTotal;
        private String currencyCode;
        private String fileName;
        private String fileMimeType;
        private Long fileSize;
        private Long stockInBatchId;
        private LocalDateTime uploadedAt;
        private List<InvoiceItemDto> items;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class InvoiceItemDto {
        private Long id;
        private Integer slNo;
        private String partNo;
        private String description;
        private String hsnSac;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal lineTotal;
        private Long matchedProductId;
    }
}
