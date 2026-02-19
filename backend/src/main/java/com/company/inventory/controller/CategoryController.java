package com.company.inventory.controller;

import com.company.inventory.dto.request.CategoryRequest;
import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.dto.response.CategoryResponse;
import com.company.inventory.entity.Category;
import com.company.inventory.entity.User;
import com.company.inventory.service.CategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Slf4j
public class CategoryController {
    
    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        log.info("Getting all categories");
        List<Category> categories = categoryService.getAllCategories();
        List<CategoryResponse> responses = categories.stream()
                .map(CategoryResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Categories retrieved", responses));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getActiveCategories() {
        log.info("Getting active categories");
        List<Category> categories = categoryService.getActiveCategories();
        List<CategoryResponse> responses = categories.stream()
                .map(CategoryResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Active categories retrieved", responses));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(@PathVariable Long id) {
        log.info("Getting category by ID: {}", id);
        Category category = categoryService.getCategoryById(id);
        return ResponseEntity.ok(ApiResponse.success("Category retrieved", CategoryResponse.fromEntity(category)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @RequestBody CategoryRequest request,
            @AuthenticationPrincipal User currentUser) {
        
        log.info("Creating category: {}", request.getCategoryName());
        Category category = categoryService.createCategory(request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Category created", CategoryResponse.fromEntity(category)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable Long id,
            @RequestBody CategoryRequest request,
            @AuthenticationPrincipal User currentUser) {
        
        log.info("Updating category ID: {}", id);
        Category category = categoryService.updateCategory(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Category updated", CategoryResponse.fromEntity(category)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        log.info("Deleting category ID: {}", id);
        categoryService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success("Category deleted", null));
    }
}