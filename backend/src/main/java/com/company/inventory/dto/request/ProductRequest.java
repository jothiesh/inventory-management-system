package com.company.inventory.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class ProductRequest {
    
    @NotBlank(message = "Part number is required")
    private String partNumber;
    
    @NotBlank(message = "Description is required")
    private String description;
    
    private String packageType;
    private String specification;
    private String alternativeComponent;
    private String manufacturerPn;
    
    @NotNull(message = "Category is required")
    private Long categoryId;
    
    private Long supplierId;
    
    @Positive(message = "Unit price must be positive")
    private BigDecimal unitPrice;
    
    // ✅ ADD THIS: Initial quantity when creating product
    @Positive(message = "Initial quantity must be positive")
    private BigDecimal initialQuantity;
    
    private Integer minStockLevel;
    
    private Long rackId;
    private Long boxId;
    
    private String remarks;
}