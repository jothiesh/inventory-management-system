package com.company.inventory.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.Supplier;
import com.company.inventory.entity.User;
import com.company.inventory.service.AuthService;
import com.company.inventory.service.SupplierService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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

    @GetMapping
    @Operation(summary = "Get all suppliers", description = "Retrieve all suppliers")
    public ResponseEntity<ApiResponse<List<Supplier>>> getAllSuppliers() {
        List<Supplier> suppliers = supplierService.getAllSuppliers();
        return ResponseEntity.ok(ApiResponse.success("Suppliers retrieved successfully", suppliers));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active suppliers", description = "Retrieve only active suppliers")
    public ResponseEntity<ApiResponse<List<Supplier>>> getActiveSuppliers() {
        List<Supplier> suppliers = supplierService.getActiveSuppliers();
        return ResponseEntity.ok(ApiResponse.success("Active suppliers retrieved successfully", suppliers));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get supplier by ID", description = "Retrieve a specific supplier by ID")
    public ResponseEntity<ApiResponse<Supplier>> getSupplierById(@PathVariable Long id) {
        Supplier supplier = supplierService.getSupplierById(id);
        return ResponseEntity.ok(ApiResponse.success("Supplier retrieved successfully", supplier));
    }

    @PostMapping
    @Operation(summary = "Create supplier", description = "Create a new supplier")
    public ResponseEntity<ApiResponse<Supplier>> createSupplier(
            @RequestParam String supplierName,
            @RequestParam(required = false) String supplierCode,
            @RequestParam(required = false) String contactPerson,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String address,
            Authentication authentication) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        Supplier supplier = supplierService.createSupplier(
                supplierName, supplierCode, contactPerson, phone, email, address, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Supplier created successfully", supplier));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update supplier", description = "Update an existing supplier")
    public ResponseEntity<ApiResponse<Supplier>> updateSupplier(
            @PathVariable Long id,
            @RequestParam String supplierName,
            @RequestParam(required = false) String supplierCode,
            @RequestParam(required = false) String contactPerson,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String address) {
        Supplier supplier = supplierService.updateSupplier(
                id, supplierName, supplierCode, contactPerson, phone, email, address);
        return ResponseEntity.ok(ApiResponse.success("Supplier updated successfully", supplier));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete supplier", description = "Soft delete a supplier")
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(@PathVariable Long id) {
        supplierService.deleteSupplier(id);
        return ResponseEntity.ok(ApiResponse.success("Supplier deleted successfully", null));
    }
}