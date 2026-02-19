package com.company.inventory.repository;

import com.company.inventory.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    
    // Find by category code
    Optional<Category> findByCategoryCode(String categoryCode);
    
    // Check if category code exists
    boolean existsByCategoryCode(String categoryCode);
    
    // Find active categories
    List<Category> findByIsActiveTrue();
    
    // Find by category name
    Optional<Category> findByCategoryName(String categoryName);
}