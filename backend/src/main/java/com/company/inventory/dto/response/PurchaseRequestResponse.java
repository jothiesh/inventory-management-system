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
public class PurchaseRequestResponse {

    private Long id;
    private String prCode;           // TT.PR-20260409143025
    private LocalDate prDate;
    private BigDecimal totalAmount;
    private String totalInWords;
    private String notes;
    private String createdBy;
    private LocalDateTime createdAt;
    private List<PurchaseRequestItemResponse> items;
}
