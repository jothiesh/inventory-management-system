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
        log.info("REST Request received: GET /api/categories | Fetching entire core category definitions index map.");
        List<Category> categories = categoryService.getAllCategories();
        
        List<CategoryResponse> responses = categories.stream()
                .map(CategoryResponse::fromEntity)
                .collect(Collectors.toList());
                
        log.debug("Successfully serialized and mapped output list size: {}", responses.size());
        return ResponseEntity.ok(ApiResponse.success("Categories retrieved", responses));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getActiveCategories() {
        log.info("REST Request received: GET /api/categories/active | Querying un-archived category tracking records.");
        List<Category> categories = categoryService.getActiveCategories();
        
        List<CategoryResponse> responses = categories.stream()
                .map(CategoryResponse::fromEntity)
                .collect(Collectors.toList());
                
        log.debug("Successfully serialized and mapped active objects count: {}", responses.size());
        return ResponseEntity.ok(ApiResponse.success("Active categories retrieved", responses));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(@PathVariable Long id) {
        log.info("REST Request received: GET /api/categories/{} | Locating row definition node element.", id);
        Category category = categoryService.getCategoryById(id);
        return ResponseEntity.ok(ApiResponse.success("Category retrieved", CategoryResponse.fromEntity(category)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @RequestBody CategoryRequest request,
            @AuthenticationPrincipal User currentUser) {
        
        log.info("REST Request received: POST /api/categories | Registering a new category blueprint entry row. Designation: '{}', Identifier token: '{}'", 
                request.getCategoryName(), request.getCategoryCode());
                
        Category category = categoryService.createCategory(request, currentUser);
        log.info("Category successfully written to primary table schemas context blocks. Generated unique row reference key: {}", category.getCategoryId());
        return ResponseEntity.ok(ApiResponse.success("Category created", CategoryResponse.fromEntity(category)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable Long id,
            @RequestBody CategoryRequest request,
            @AuthenticationPrincipal User currentUser) {
        
        log.info("REST Request received: PUT /api/categories/{} | Injecting modification attributes layer parameter overrides.", id);
        Category category = categoryService.updateCategory(id, request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Category updated", CategoryResponse.fromEntity(category)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        log.warn("REST Request received: DELETE /api/categories/{} | Triggering database hard row removal execution chain block.", id);
        categoryService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success("Category deleted", null));
    }
}