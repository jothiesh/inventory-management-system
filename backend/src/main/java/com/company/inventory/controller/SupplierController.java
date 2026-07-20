package com.company.inventory.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.dto.response.SupplierMovementDto;
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
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class SupplierController {

    private final SupplierService supplierService;
    private final AuthService authService;

    // ✅ Inner DTO — includes gstnNumber
    @Data
    static class SupplierRequest {
        private String supplierName;
        private String supplierCode;
        private String contactPerson;
        private String phone;
        private String email;
        private String address;
        private String gstnNumber;  // ✅ NEW
    }

    @GetMapping
    @Operation(summary = "Get all suppliers")
    public ResponseEntity<ApiResponse<List<Supplier>>> getAllSuppliers() {
        log.info("REST Request received: GET /api/suppliers | Pulling comprehensive business directory list profiles.");
        List<Supplier> suppliers = supplierService.getAllSuppliers();
        log.debug("Successfully loaded {} global merchant accounts profiles from schema data columns.", suppliers.size());
        return ResponseEntity.ok(ApiResponse.success("Suppliers retrieved successfully", suppliers));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active suppliers")
    public ResponseEntity<ApiResponse<List<Supplier>>> getActiveSuppliers() {
        log.info("REST Request received: GET /api/suppliers/active | Querying operational un-archived business accounts profiles.");
        List<Supplier> suppliers = supplierService.getActiveSuppliers();
        log.debug("Found {} active business partner configurations inside system directories.", suppliers.size());
        return ResponseEntity.ok(ApiResponse.success("Active suppliers retrieved successfully", suppliers));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get supplier by ID")
    public ResponseEntity<ApiResponse<Supplier>> getSupplierById(@PathVariable Long id) {
        log.info("REST Request received: GET /api/suppliers/{} | Locating singular corporate tracking profile data node.", id);
        Supplier supplier = supplierService.getSupplierById(id);
        return ResponseEntity.ok(ApiResponse.success("Supplier retrieved successfully", supplier));
    }

    @GetMapping("/{id}/product-summary")
    @Operation(summary = "Get product summary for a supplier")
    public ResponseEntity<ApiResponse<List<SupplierProductSummaryDto>>> getSupplierProductSummary(
            @PathVariable Long id) {
        log.info("REST Request received: GET /api/suppliers/{}/product-summary | Launching analytical procurement mapping aggregation compiler query loop algorithms over product ranges.", id);
        List<SupplierProductSummaryDto> summary = supplierService.getSupplierProductSummary(id);
        return ResponseEntity.ok(ApiResponse.success("Supplier product summary", summary));
    }

    @GetMapping("/{id}/purchase-details")
    @Operation(summary = "Get all purchase details for a supplier (latest first)")
    public ResponseEntity<ApiResponse<List<SupplierPurchaseDetailDto>>> getSupplierPurchaseDetails(
            @PathVariable Long id) {
        log.info("REST Request received: GET /api/suppliers/{}/purchase-details | Extracting chronological itemized ledger logs maps tracking acquisitions.", id);
        List<SupplierPurchaseDetailDto> details = supplierService.getSupplierPurchaseDetails(id);
        return ResponseEntity.ok(ApiResponse.success("Supplier purchase details", details));
    }

    @PostMapping
    @Operation(summary = "Create supplier")
    public ResponseEntity<ApiResponse<Supplier>> createSupplier(
            @RequestBody SupplierRequest request,
            Authentication authentication) {
        log.info("REST Request received: POST /api/suppliers | Writing fresh corporate partner profile map into storage grids. Name designation: '{}', GSTIN Reference parameters context: '{}'", 
                request.getSupplierName(), request.getGstnNumber());
                
        User currentUser = authService.getCurrentUser(authentication.getName());
        log.trace("Extracted operational tracking session principal context identifier username: '{}'", currentUser.getUsername());
        
        Supplier supplier = supplierService.createSupplier(
                request.getSupplierName(),
                request.getSupplierCode(),
                request.getContactPerson(),
                request.getPhone(),
                request.getEmail(),
                request.getAddress(),
                request.getGstnNumber(),  // ✅ NEW
                currentUser);
                
        log.info("Supplier profile successfully saved inside schema master indexes tables rows. Generated unique tracking key ID index: {}", supplier.getSupplierId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Supplier created successfully", supplier));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update supplier")
    public ResponseEntity<ApiResponse<Supplier>> updateSupplier(
            @PathVariable Long id,
            @RequestBody SupplierRequest request) {
        log.info("REST Request received: PUT /api/suppliers/{} | Injecting modification descriptors parameter overrides layer context mappings fields target data.", id);
        Supplier supplier = supplierService.updateSupplier(
                id,
                request.getSupplierName(),
                request.getSupplierCode(),
                request.getContactPerson(),
                request.getPhone(),
                request.getEmail(),
                request.getAddress(),
                request.getGstnNumber());  // ✅ NEW
                
        log.info("Supplier properties configuration modified successfully inside database layers for profile node reference tracking ID context: {}", id);
        return ResponseEntity.ok(ApiResponse.success("Supplier updated successfully", supplier));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete supplier")
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(@PathVariable Long id) {
        log.warn("REST Request received: DELETE /api/suppliers/{} | Launching soft account retirement decommission workflow pipelines procedures loops.", id);
        supplierService.deleteSupplier(id);
        log.info("Decommission process completed safely on target reference tracking context node index point ID: {}. [isActive=false]", id);
        return ResponseEntity.ok(ApiResponse.success("Supplier deleted successfully", null));
    }
    @GetMapping("/{id}/stock-movements")
    @Operation(summary = "Get all stock IN/OUT movements for a supplier's lots")
    public ResponseEntity<ApiResponse<List<SupplierMovementDto>>> getSupplierMovements(
            @PathVariable Long id) {
        log.info("GET /api/suppliers/{}/stock-movements", id);
        return ResponseEntity.ok(ApiResponse.success("Supplier movements retrieved",
                supplierService.getSupplierMovements(id)));
    }
}