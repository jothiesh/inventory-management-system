package com.company.inventory.repository;

import com.company.inventory.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Find by part number
    Optional<Product> findByPartNumber(String partNumber);

    // Check if part number exists
    boolean existsByPartNumber(String partNumber);

    // Find by category
    List<Product> findByCategoryCategoryId(Long categoryId);

    // Find active products
    List<Product> findByIsActiveTrue();

    // Search products - FIXED field names (+ make)
    @Query("SELECT p FROM Product p WHERE " +
           "LOWER(p.partNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.manufacturerPn) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.make) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.packageType) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Product> searchProducts(@Param("keyword") String keyword);

    // Find by supplier
    List<Product> findBySupplierSupplierId(Long supplierId);

    // Find by rack
    List<Product> findByRackRackId(Long rackId);
}