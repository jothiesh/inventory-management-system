package com.company.inventory.dto.response;

import com.company.inventory.entity.Product;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    
    private Long productId;
    private String partNumber;
    private String description;
    private String packageType;
    private String specification;
    private String alternativeComponent;
    private String manufacturerPn;
    private BigDecimal unitPrice;

    // ── NEW: HSN / GST ────────────────────────────────────────────
    private String hsnCode;
    private BigDecimal gstPercent;
    // ─────────────────────────────────────────────────────────────

    private Integer minStockLevel;
    private String remarks;
    private Boolean isActive;
    
    private CategoryInfo category;
    private SupplierInfo supplier;
    private RackInfo rack;
    private BoxInfo box;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CategoryInfo {
        private Long categoryId;
        private String categoryCode;
        private String categoryName;
        private String description;
    }
    
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SupplierInfo {
        private Long supplierId;
        private String supplierCode;
        private String supplierName;
        private String contactPerson;
        private String email;
        private String phone;
    }
    
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class RackInfo {
        private Long rackId;
        private String rackCode;
        private String rackNumber;
        private String rackName;
        private String location;
    }
    
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BoxInfo {
        private Long boxId;
        private String boxLabel;
        private String boxNumber;
    }
    
    public static ProductResponse fromEntity(Product product) {
        if (product == null) return null;
        
        ProductResponseBuilder builder = ProductResponse.builder()
                .productId(product.getProductId())
                .partNumber(product.getPartNumber())
                .description(product.getDescription())
                .packageType(product.getPackageType())
                .specification(product.getSpecification())
                .alternativeComponent(product.getAlternativeComponent())
                .manufacturerPn(product.getManufacturerPn())
                .unitPrice(product.getUnitPrice())
                // ── NEW: HSN / GST ─────────────────────────────────
                .hsnCode(product.getHsnCode())
                .gstPercent(product.getGstPercent())
                // ────────────────────────────────────────────────────
                .minStockLevel(product.getMinStockLevel())
                .remarks(product.getRemarks())
                .isActive(product.getIsActive())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt());
        
        if (product.getCategory() != null) {
            builder.category(CategoryInfo.builder()
                    .categoryId(product.getCategory().getCategoryId())
                    .categoryCode(product.getCategory().getCategoryCode())
                    .categoryName(product.getCategory().getCategoryName())
                    .description(product.getCategory().getDescription())
                    .build());
        }
        if (product.getSupplier() != null) {
            builder.supplier(SupplierInfo.builder()
                    .supplierId(product.getSupplier().getSupplierId())
                    .supplierCode(product.getSupplier().getSupplierCode())
                    .supplierName(product.getSupplier().getSupplierName())
                    .contactPerson(product.getSupplier().getContactPerson())
                    .email(product.getSupplier().getEmail())
                    .phone(product.getSupplier().getPhone())
                    .build());
        }
        if (product.getRack() != null) {
            builder.rack(RackInfo.builder()
                    .rackId(product.getRack().getRackId())
                    .rackCode(product.getRack().getRackCode() != null ?
                             product.getRack().getRackCode() : product.getRack().getRackNumber())
                    .rackNumber(product.getRack().getRackNumber())
                    .rackName(product.getRack().getRackName())
                    .location(product.getRack().getLocation())
                    .build());
        }
        if (product.getBox() != null) {
            builder.box(BoxInfo.builder()
                    .boxId(product.getBox().getBoxId())
                    .boxLabel(product.getBox().getBoxLabel())
                    .boxNumber(product.getBox().getBoxNumber())
                    .build());
        }

        return builder.build();
    }
}