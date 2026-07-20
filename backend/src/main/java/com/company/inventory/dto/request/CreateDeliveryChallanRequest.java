package com.company.inventory.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class CreateDeliveryChallanRequest {

    /** optional — supplier record id; details below always win if given */
    private Long supplierId;

    private String supplierName;     // "To, M/s."
    private String supplierAddress;
    private String supplierGstin;    // TIN / GSTIN row on the challan

    private LocalDate dcDate;
    private String remarks;

    /** true → create and immediately mark SENT */
    private Boolean sendNow;

    private List<Item> items;

    @Data
    public static class Item {
        private Long productId;
        private String partNumber;    // optional — resolved from product if null
        private String description;   // optional — resolved from product if null
        private String categoryName;  // optional — resolved from product if null
        private BigDecimal qty;
        private BigDecimal rate;
        private String remarks;
    }
}
