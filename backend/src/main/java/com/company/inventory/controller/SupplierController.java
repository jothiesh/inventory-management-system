package com.company.inventory.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.dto.response.SupplierProductSummaryDto;
import com.company.inventory.dto.response.SupplierPurchaseDetailDto;
import com.company.inventory.entity.Supplier;
import com.company.inventory.entity.User;
import com.company.inventory.service.AuthService;
import com.company.inventory.service.SupplierService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Suppliers", description = "Supplier management APIs")
public class SupplierController {

    private final SupplierService supplierService;
    private final AuthService authService;

    // ✅ Inner DTO class for request body
    @Data
    static class SupplierRequest {
        private String supplierName;
        private String supplierCode;
        private String contactPerson;
        private String phone;
        private String email;
        private String address;
    }

    @GetMapping
    @Operation(summary = "Get all suppliers")
    public ResponseEntity<ApiResponse<List<Supplier>>> getAllSuppliers() {
        List<Supplier> suppliers = supplierService.getAllSuppliers();
        return ResponseEntity.ok(ApiResponse.success("Suppliers retrieved successfully", suppliers));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active suppliers")
    public ResponseEntity<ApiResponse<List<Supplier>>> getActiveSuppliers() {
        List<Supplier> suppliers = supplierService.getActiveSuppliers();
        return ResponseEntity.ok(ApiResponse.success("Active suppliers retrieved successfully", suppliers));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get supplier by ID")
    public ResponseEntity<ApiResponse<Supplier>> getSupplierById(@PathVariable Long id) {
        Supplier supplier = supplierService.getSupplierById(id);
        return ResponseEntity.ok(ApiResponse.success("Supplier retrieved successfully", supplier));
    }

    
    
    
    
    
    
    
    
 // ── ADD these 2 endpoints to your existing SupplierController.java ──────────
 // Add these imports:
 // import com.company.inventory.dto.response.SupplierProductSummaryDto;
 // import com.company.inventory.dto.response.SupplierPurchaseDetailDto;

     @GetMapping("/{id}/product-summary")
     @Operation(summary = "Get product summary for a supplier")
     public ResponseEntity<ApiResponse<List<SupplierProductSummaryDto>>> getSupplierProductSummary(
             @PathVariable Long id) {
         List<SupplierProductSummaryDto> summary = supplierService.getSupplierProductSummary(id);
         return ResponseEntity.ok(ApiResponse.success("Supplier product summary", summary));
     }

     @GetMapping("/{id}/purchase-details")
     @Operation(summary = "Get all purchase details for a supplier (latest first)")
     public ResponseEntity<ApiResponse<List<SupplierPurchaseDetailDto>>> getSupplierPurchaseDetails(
             @PathVariable Long id) {
         List<SupplierPurchaseDetailDto> details = supplierService.getSupplierPurchaseDetails(id);
         return ResponseEntity.ok(ApiResponse.success("Supplier purchase details", details));
     }
    
    
    @PostMapping
    @Operation(summary = "Create supplier")
    public ResponseEntity<ApiResponse<Supplier>> createSupplier(
            @RequestBody SupplierRequest request,  // ✅ FIX: JSON body instead of @RequestParam
            Authentication authentication) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        Supplier supplier = supplierService.createSupplier(
                request.getSupplierName(),
                request.getSupplierCode(),
                request.getContactPerson(),
                request.getPhone(),
                request.getEmail(),
                request.getAddress(),
                currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Supplier created successfully", supplier));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update supplier")
    public ResponseEntity<ApiResponse<Supplier>> updateSupplier(
            @PathVariable Long id,
            @RequestBody SupplierRequest request) {  // ✅ FIX: JSON body instead of @RequestParam
        Supplier supplier = supplierService.updateSupplier(
                id,
                request.getSupplierName(),
                request.getSupplierCode(),
                request.getContactPerson(),
                request.getPhone(),
                request.getEmail(),
                request.getAddress());
        return ResponseEntity.ok(ApiResponse.success("Supplier updated successfully", supplier));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete supplier")
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(@PathVariable Long id) {
        supplierService.deleteSupplier(id);
        return ResponseEntity.ok(ApiResponse.success("Supplier deleted successfully", null));
    }
}