package com.company.inventory.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CategoryRequest {
    
    @NotBlank(message = "Category code is required")
    private String categoryCode;
    
    @NotBlank(message = "Category name is required")
    private String categoryName;
    
    private String description;
}