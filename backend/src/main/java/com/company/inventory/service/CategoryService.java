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
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
    }

    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Category> getActiveCategories() {
        return categoryRepository.findByIsActiveTrue();
    }

    @Transactional
    public Category createCategory(CategoryRequest request, User currentUser) {
        log.info("Creating category: {}", request.getCategoryName());
        
        // Check if category code already exists
        if (categoryRepository.existsByCategoryCode(request.getCategoryCode())) {
            throw new RuntimeException("Category code already exists: " + request.getCategoryCode());
        }
        
        Category category = new Category();
        category.setCategoryCode(request.getCategoryCode());
        category.setCategoryName(request.getCategoryName());
        category.setDescription(request.getDescription());
        category.setIsActive(true);
        category.setCreatedBy(currentUser);
        
        return categoryRepository.save(category);
    }

    @Transactional
    public Category updateCategory(Long id, CategoryRequest request, User currentUser) {
        Category category = getCategoryById(id);
        
        // Check if category code is being changed and if it already exists
        if (!category.getCategoryCode().equals(request.getCategoryCode()) && 
            categoryRepository.existsByCategoryCode(request.getCategoryCode())) {
            throw new RuntimeException("Category code already exists: " + request.getCategoryCode());
        }
        
        category.setCategoryCode(request.getCategoryCode());
        category.setCategoryName(request.getCategoryName());
        category.setDescription(request.getDescription());
        category.setUpdatedBy(currentUser);  // ✅ Fixed: setUpdatedBy, not setUpdatedAt
        
        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category category = getCategoryById(id);
        categoryRepository.delete(category);
        log.info("Category deleted: {}", category.getCategoryName());
    }
}