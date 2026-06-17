package com.company.inventory.controller;

import com.company.inventory.dto.request.ProductRequest;
import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.dto.response.ProductResponse;
import com.company.inventory.entity.Product;
import com.company.inventory.entity.User;
import com.company.inventory.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Slf4j
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getAllProducts() {
        log.info("REST Request received: GET /api/products");
        List<ProductResponse> responses = productService.getAllProducts().stream()
                .map(ProductResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Products retrieved", responses));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getActiveProducts() {
        log.info("REST Request received: GET /api/products/active");
        List<ProductResponse> responses = productService.getActiveProducts().stream()
                .map(ProductResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Active products retrieved", responses));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Long id) {
        log.info("REST Request received: GET /api/products/{}", id);
        Product product = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success("Product retrieved", ProductResponse.fromEntity(product)));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProductsByCategory(@PathVariable Long categoryId) {
        log.info("REST Request received: GET /api/products/category/{}", categoryId);
        List<ProductResponse> responses = productService.getProductsByCategory(categoryId).stream()
                .map(ProductResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Products retrieved", responses));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> searchProducts(@RequestParam String keyword) {
        log.info("REST Request received: GET /api/products/search?keyword={}", keyword);
        List<ProductResponse> responses = productService.searchProducts(keyword).stream()
                .map(ProductResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Search results", responses));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @RequestBody ProductRequest request,
            @AuthenticationPrincipal User currentUser) {
        log.info("REST Request received: POST /api/products | Part Number: '{}'", request.getPartNumber());
        if (request.getCategoryId() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Category is required"));
        }
        Product product = productService.createProduct(request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Product created successfully", ProductResponse.fromEntity(product)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @RequestBody ProductRequest request,
            @AuthenticationPrincipal User currentUser) {
        log.info("REST Request received: PUT /api/products/{}", id);
        if (request.getCategoryId() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Category is required"));
        }
        Product product = productService.updateProduct(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Product updated successfully", ProductResponse.fromEntity(product)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        log.warn("REST Request received: DELETE /api/products/{}", id);
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product deleted successfully", null));
    }

    // ── PATCH: update min stock level inline (from CurrentStock page) ─────────
    @PatchMapping("/{id}/min-stock-level")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','ADMIN','SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<ProductResponse>> updateMinStockLevel(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        Object raw = body.get("minLevel");
        BigDecimal minLevel = raw != null ? new BigDecimal(raw.toString()) : BigDecimal.ZERO;

        Product product = productService.getProductById(id);
        product.setMinStockLevel(
            minLevel.compareTo(BigDecimal.ZERO) > 0 ? minLevel.intValue() : null
        );
        Product saved = productService.saveProduct(product);

        log.info("PATCH /api/products/{}/min-stock-level → {}", id, minLevel);
        return ResponseEntity.ok(ApiResponse.success("Min stock level updated", ProductResponse.fromEntity(saved)));
    }
}