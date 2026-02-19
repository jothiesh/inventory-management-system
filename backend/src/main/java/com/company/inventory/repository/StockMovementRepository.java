package com.company.inventory.repository;

import com.company.inventory.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    
    // Existing methods
    List<StockMovement> findByProductProductIdOrderByCreatedAtDesc(Long productId);
    
    List<StockMovement> findByLotLotIdOrderByCreatedAtDesc(Long lotId);
    
    @Query("SELECT sm FROM StockMovement sm WHERE sm.product.productId = :productId " +
           "AND sm.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY sm.createdAt DESC")
    List<StockMovement> findMovementsByProductAndDateRange(
        @Param("productId") Long productId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
    
    // ============================================
    // NEW: Stock Out History Queries
    // ============================================
    
    /**
     * Find stock OUT movements by date range
     */
    List<StockMovement> findByMovementTypeAndCreatedAtBetweenOrderByCreatedAtDesc(
        StockMovement.MovementType movementType,
        LocalDateTime startDate,
        LocalDateTime endDate
    );
    
    /**
     * Find stock movements by product and type
     */
    List<StockMovement> findByProductProductIdAndMovementTypeOrderByCreatedAtDesc(
        Long productId,
        StockMovement.MovementType movementType
    );
    
    /**
     * Find last movement for a product
     */
    @Query("SELECT sm FROM StockMovement sm " +
           "WHERE sm.product.productId = :productId " +
           "ORDER BY sm.createdAt DESC")
    List<StockMovement> findLastMovementByProduct(@Param("productId") Long productId);
    
    /**
     * Find last movement for a specific lot
     */
    @Query("SELECT sm FROM StockMovement sm " +
           "WHERE sm.lot.lotId = :lotId " +
           "ORDER BY sm.createdAt DESC")
    List<StockMovement> findLastMovementByLot(@Param("lotId") Long lotId);
    
    /**
     * Count movements by type for a product
     */
    @Query("SELECT COUNT(sm) FROM StockMovement sm " +
           "WHERE sm.product.productId = :productId " +
           "AND sm.movementType = :movementType")
    Long countMovementsByProductAndType(
        @Param("productId") Long productId,
        @Param("movementType") StockMovement.MovementType movementType
    );
    
    /**
     * Get total quantity OUT for a product
     */
    @Query("SELECT COALESCE(SUM(sm.quantity), 0) FROM StockMovement sm " +
           "WHERE sm.product.productId = :productId " +
           "AND sm.movementType = 'OUT'")
    java.math.BigDecimal getTotalQuantityOutByProduct(@Param("productId") Long productId);
    
    /**
     * Get total quantity IN for a product
     */
    @Query("SELECT COALESCE(SUM(sm.quantity), 0) FROM StockMovement sm " +
           "WHERE sm.product.productId = :productId " +
           "AND sm.movementType = 'IN'")
    java.math.BigDecimal getTotalQuantityInByProduct(@Param("productId") Long productId);
}