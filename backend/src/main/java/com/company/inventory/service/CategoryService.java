package com.company.inventory.service;

import com.company.inventory.dto.request.CategoryRequest;
import com.company.inventory.entity.Category;
import com.company.inventory.entity.User;
import com.company.inventory.exception.ResourceNotFoundException;
import com.company.inventory.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public Category getCategoryById(Long id) {
        log.debug("Querying repository layer for Category instance matching target ID: {}", id);
        return categoryRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Category lookup failed. No entity record matches database key identifier: {}", id);
                    return new ResourceNotFoundException("Category", "id", id);
                });
    }

    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        log.debug("Request received to fetch all category records from data storage rows.");
        List<Category> categories = categoryRepository.findAll();
        log.info("Fetched {} total categories from the database architecture.", categories.size());
        return categories;
    }

    @Transactional(readOnly = true)
    public List<Category> getActiveCategories() {
        log.debug("Filtering database elements mapping exclusively active inventory categories.");
        List<Category> activeCategories = categoryRepository.findByIsActiveTrue();
        log.info("Extracted {} active operational categories from master schema tables.", activeCategories.size());
        return activeCategories;
    }

    @Transactional
    public Category createCategory(CategoryRequest request, User currentUser) {
        log.info("Initiating Category profile creation sequence. Proposed Name: '{}', Proposed Code: '{}', Operator User ID: {}", 
                request.getCategoryName(), request.getCategoryCode(), currentUser != null ? currentUser.getUserId() : "SYSTEM");
        
        // Check if category code already exists
        if (categoryRepository.existsByCategoryCode(request.getCategoryCode())) {
            log.error("Category creation aborted: Core uniqueness constraints violated. Category code '{}' already exists in the system.", request.getCategoryCode());
            throw new RuntimeException("Category code already exists: " + request.getCategoryCode());
        }
        
        Category category = new Category();
        category.setCategoryCode(request.getCategoryCode());
        category.setCategoryName(request.getCategoryName());
        category.setDescription(request.getDescription());
        category.setIsActive(true);
        category.setCreatedBy(currentUser);
        
        Category savedCategory = categoryRepository.save(category);
        log.info("New inventory Category record successfully persisted. Allocated unique ID index: {}", savedCategory.getCategoryId());
        return savedCategory;
    }

    @Transactional
    public Category updateCategory(Long id, CategoryRequest request, User currentUser) {
        log.info("Processing proposed mutation update profile parameters on Category ID: {}", id);
        Category category = getCategoryById(id);
        
        // Check if category code is being changed and if it already exists
        if (!category.getCategoryCode().equals(request.getCategoryCode()) && 
                categoryRepository.existsByCategoryCode(request.getCategoryCode())) {
            log.error("Category update aborted: Code mutation to '{}' rejected due to a conflict with an existing category record.", request.getCategoryCode());
            throw new RuntimeException("Category code already exists: " + request.getCategoryCode());
        }
        
        log.debug("Applying properties vector mutations against Target Category record ID: {}", id);
        category.setCategoryCode(request.getCategoryCode());
        category.setCategoryName(request.getCategoryName());
        category.setDescription(request.getDescription());
        category.setUpdatedBy(currentUser);  // ✅ Fixed: setUpdatedBy, not setUpdatedAt
        
        Category updatedCategory = categoryRepository.save(category);
        log.info("Category details successfully modified and rewritten for ID: {}", id);
        return updatedCategory;
    }

    @Transactional
    public void deleteCategory(Long id) {
        log.warn("Triggering hard database row purge execution sequence against structural Category target ID: {}", id);
        Category category = getCategoryById(id);
        categoryRepository.delete(category);
        log.info("Category entity successfully erased from repository table columns matrix space. Original Name: '{}'", category.getCategoryName());
    }
}