package com.company.inventory.repository;

import com.company.inventory.entity.Lot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface LotRepository extends JpaRepository<Lot, Long> {
    
    /**
     * Find lots by product and status, ordered by purchase date (FIFO)
     */
    List<Lot> findByProductProductIdAndStatusOrderByPurchaseDateAsc(
            Long productId, 
            Lot.LotStatus status
    );
    
    /**
     * Find all lots for a product
     */
    List<Lot> findByProductProductId(Long productId);
    
    /**
     * Find lots by product ordered by date (newest first)
     * Used for price history
     */
    @Query("SELECT l FROM Lot l " +
           "WHERE l.product.productId = :productId " +
           "ORDER BY l.purchaseDate DESC, l.createdAt DESC")
    List<Lot> findByProductProductIdOrderByPurchaseDateDesc(@Param("productId") Long productId);
    
    /**
     * Find active lots with remaining quantity for FIFO processing
     * CRITICAL: Used for Stock OUT operations
     */
    @Query("SELECT l FROM Lot l " +
           "WHERE l.product.productId = :productId " +
           "AND l.status = 'Active' " +
           "AND l.remainingQuantity > 0 " +
           "ORDER BY l.purchaseDate ASC, l.createdAt ASC")
    List<Lot> findActiveLotsByProductForFIFO(@Param("productId") Long productId);
    
    /**
     * Find distinct purchase prices for a product
     * Used for price difference detection
     */
    @Query("SELECT DISTINCT l.purchasePrice " +
           "FROM Lot l " +
           "WHERE l.product.productId = :productId " +
           "AND l.status = 'Active'")
    List<BigDecimal> findDistinctPricesByProduct(@Param("productId") Long productId);
    
    /**
     * Check if lot number exists
     */
    Boolean existsByLotNumber(String lotNumber);
    
    /**
     * Find lot by lot number
     */
    Optional<Lot> findByLotNumber(String lotNumber);
    
    // ============================================
    // ADDED: GET TOTAL STOCK BY PRODUCT
    // ============================================
    
    /**
     * Get total available stock for a product (sum of all active lots)
     * THIS IS THE MISSING METHOD
     */
    @Query("SELECT COALESCE(SUM(l.remainingQuantity), 0) " +
           "FROM Lot l " +
           "WHERE l.product.productId = :productId " +
           "AND l.status = 'Active'")
    BigDecimal getTotalStockByProduct(@Param("productId") Long productId);
    
    // ============================================
    // ADDITIONAL USEFUL METHODS
    // ============================================
    
    /**
     * Find lots by supplier
     */
    List<Lot> findBySupplierSupplierId(Long supplierId);
    
    /**
     * Find lots by rack
     */
    List<Lot> findByRackRackId(Long rackId);
    
    /**
     * Find lots by box
     */
    List<Lot> findByBoxBoxId(Long boxId);
    
    /**
     * Find lots by status
     */
    List<Lot> findByStatus(Lot.LotStatus status);
    
    /**
     * Count active lots
     */
    @Query("SELECT COUNT(l) FROM Lot l WHERE l.status = 'Active'")
    Long countActiveLots();
    
    /**
     * Calculate total inventory value
     */
    @Query("SELECT COALESCE(SUM(l.remainingQuantity * l.purchasePrice), 0) " +
           "FROM Lot l " +
           "WHERE l.status = 'Active'")
    BigDecimal calculateTotalInventoryValue();
    
    /**
     * Calculate inventory value by product
     */
    @Query("SELECT COALESCE(SUM(l.remainingQuantity * l.purchasePrice), 0) " +
           "FROM Lot l " +
           "WHERE l.product.productId = :productId " +
           "AND l.status = 'Active'")
    BigDecimal calculateInventoryValueByProduct(@Param("productId") Long productId);
}