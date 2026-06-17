package com.company.inventory.repository;

import com.company.inventory.entity.Product;
import com.company.inventory.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findByProductProductIdOrderByCreatedAtDesc(Long productId);

    List<StockMovement> findByLotLotIdOrderByCreatedAtDesc(Long lotId);

    List<StockMovement> findByMovementTypeAndCreatedAtBetweenOrderByCreatedAtDesc(
            StockMovement.MovementType movementType,
            LocalDateTime startDate,
            LocalDateTime endDate
    );

    List<StockMovement> findByProductProductIdAndMovementTypeOrderByCreatedAtDesc(
            Long productId,
            StockMovement.MovementType movementType
    );

    Optional<StockMovement> findTopByLotLotIdOrderByCreatedAtDesc(Long lotId);

    Optional<StockMovement> findTopByProductProductIdOrderByCreatedAtDesc(Long productId);

    long countByProductProductIdAndMovementType(Long productId, StockMovement.MovementType type);

    List<StockMovement> findTop10ByOrderByCreatedAtDesc();

    List<StockMovement> findTop10ByMovementTypeOrderByCreatedAtDesc(
            StockMovement.MovementType movementType);

    // ✅ NEW — distinct products that have at least one OUT movement
    @Query("SELECT DISTINCT sm.product FROM StockMovement sm " +
           "WHERE sm.movementType = 'OUT'")
    List<Product> findProductsWithStockOut();

    // ✅ NEW — total qty issued OUT per product
    @Query("SELECT sm.product.productId, COALESCE(SUM(sm.quantity), 0) " +
           "FROM StockMovement sm " +
           "WHERE sm.movementType = 'OUT' " +
           "GROUP BY sm.product.productId")
    List<Object[]> findProductIdAndTotalStockOut();
    
    List<StockMovement> findByTransactionGroupIdOrderByCreatedAtAsc(String transactionGroupId);
    
}