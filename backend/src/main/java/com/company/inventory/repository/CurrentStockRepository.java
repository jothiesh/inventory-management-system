package com.company.inventory.repository;

import com.company.inventory.entity.CurrentStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface CurrentStockRepository extends JpaRepository<CurrentStock, Long> {
    
    /**
     * Find current stock by product
     */
    List<CurrentStock> findByProductProductId(Long productId);
    
    /**
     * Find current stock by lot
     */
    List<CurrentStock> findByLotLotId(Long lotId);
    
    /**
     * Find current stock by rack
     */
    List<CurrentStock> findByRackRackId(Long rackId);
    
    /**
     * Find current stock by box
     */
    List<CurrentStock> findByBoxBoxId(Long boxId);
    
    /**
     * Get total stock quantity for a product
     */
    @Query("SELECT COALESCE(SUM(cs.availableQuantity), 0) FROM CurrentStock cs " +
           "WHERE cs.product.productId = :productId")
    BigDecimal getTotalStockByProduct(@Param("productId") Long productId);
    
    /**
     * Find products with stock below minimum level
     * FIXED: Changed reorderLevel to minStockLevel
     */
    @Query("SELECT cs FROM CurrentStock cs " +
           "WHERE cs.product.minStockLevel IS NOT NULL " +
           "AND cs.availableQuantity <= cs.product.minStockLevel")
    List<CurrentStock> findProductsBelowMinStockLevel();
    
    /**
     * Find products with excess stock
     * REMOVED: Product entity doesn't have maxStockLevel field
     * If you need this, add maxStockLevel field to Product entity first
     */
    // @Query("SELECT cs FROM CurrentStock cs " +
    //        "WHERE cs.product.maxStockLevel IS NOT NULL " +
    //        "AND cs.availableQuantity >= cs.product.maxStockLevel")
    // List<CurrentStock> findProductsWithExcessStock();
    
    /**
     * Delete current stock by lot
     */
    void deleteByLotLotId(Long lotId);
    
    /**
     * Delete current stock by product
     */
    void deleteByProductProductId(Long productId);
}