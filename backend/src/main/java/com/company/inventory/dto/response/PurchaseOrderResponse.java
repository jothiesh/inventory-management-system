package com.company.inventory.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderResponse {

    private Long id;
    private String poCode;        // TT.PO-066
    private LocalDate poDate;
    private BigDecimal totalAmount;
    private String totalInWords;
    private LocalDate deliveryFrom;
    private LocalDate deliveryTo;
    private String paymentTerms;
    private String notes;
    private String createdBy;
    private LocalDateTime createdAt;
    private List<PurchaseOrderItemResponse> items;
}