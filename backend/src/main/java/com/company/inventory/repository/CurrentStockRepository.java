package com.company.inventory.repository;

import com.company.inventory.entity.CurrentStock;
import com.company.inventory.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface CurrentStockRepository extends JpaRepository<CurrentStock, Long> {

    List<CurrentStock> findByProductProductId(Long productId);
    List<CurrentStock> findByLotLotId(Long lotId);
    List<CurrentStock> findByRackRackId(Long rackId);
    List<CurrentStock> findByBoxBoxId(Long boxId);

    @Query("SELECT COALESCE(SUM(cs.availableQuantity), 0) FROM CurrentStock cs " +
            "WHERE cs.product.productId = :productId")
    BigDecimal getTotalStockByProduct(@Param("productId") Long productId);

    @Query("SELECT cs FROM CurrentStock cs " +
            "WHERE cs.product.minStockLevel IS NOT NULL " +
            "AND cs.availableQuantity <= cs.product.minStockLevel")
    List<CurrentStock> findProductsBelowMinStockLevel();

    void deleteByLotLotId(Long lotId);
    void deleteByProductProductId(Long productId);

    // ✅ NEW — get distinct products that have stock > 0
    @Query("SELECT DISTINCT cs.product FROM CurrentStock cs " +
            "WHERE cs.availableQuantity > 0")
    List<Product> findProductsWithStock();

    // ✅ NEW — get total stock per product (for display)
    @Query("SELECT cs.product.productId, COALESCE(SUM(cs.availableQuantity), 0) " +
            "FROM CurrentStock cs " +
            "GROUP BY cs.product.productId " +
            "HAVING SUM(cs.availableQuantity) > 0")
    List<Object[]> findProductIdAndTotalStock();
}