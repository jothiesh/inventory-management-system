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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Slf4j
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getAllProducts() {
        log.info("Getting all products");
        List<Product> products = productService.getAllProducts();
        List<ProductResponse> responses = products.stream()
                .map(ProductResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Products retrieved", responses));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getActiveProducts() {
        log.info("Getting active products");
        List<Product> products = productService.getActiveProducts();
        List<ProductResponse> responses = products.stream()
                .map(ProductResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Active products retrieved", responses));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable Long id) {
        log.info("Getting product by ID: {}", id);
        Product product = productService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.success("Product retrieved", ProductResponse.fromEntity(product)));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getProductsByCategory(@PathVariable Long categoryId) {
        log.info("Getting products by category: {}", categoryId);
        List<Product> products = productService.getProductsByCategory(categoryId);
        List<ProductResponse> responses = products.stream()
                .map(ProductResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Products retrieved", responses));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> searchProducts(@RequestParam String keyword) {
        log.info("Searching products with keyword: {}", keyword);
        List<Product> products = productService.searchProducts(keyword);
        List<ProductResponse> responses = products.stream()
                .map(ProductResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Search results", responses));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @RequestBody ProductRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Creating product: {}", request.getPartNumber());

        // ✅ Only category is required — partNumber and description are optional
        if (request.getCategoryId() == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Category is required"));
        }

        Product product = productService.createProduct(request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Product created successfully", ProductResponse.fromEntity(product)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable Long id,
            @RequestBody ProductRequest request,
            @AuthenticationPrincipal User currentUser) {

        log.info("Updating product ID: {}", id);

        if (request.getCategoryId() == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Category is required"));
        }

        Product product = productService.updateProduct(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Product updated successfully", ProductResponse.fromEntity(product)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        log.info("Deleting product ID: {}", id);
        productService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product deleted successfully", null));
    }
}