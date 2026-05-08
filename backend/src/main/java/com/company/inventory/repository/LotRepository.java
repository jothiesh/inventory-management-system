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

    // ─── FIFO / stock-out ────────────────────────────────────────────────────

    /**
     * Active lots with remaining quantity, oldest-first (FIFO).
     * Filters by status=Active AND remainingQuantity > 0.
     * CRITICAL: used for Stock OUT operations.
     */
    @Query("SELECT l FROM Lot l " +
           "WHERE l.product.productId = :productId " +
           "AND l.status = 'Active' " +
           "AND l.remainingQuantity > 0 " +
           "ORDER BY l.purchaseDate ASC, l.createdAt ASC")
    List<Lot> findActiveLotsByProductForFIFO(@Param("productId") Long productId);

    /**
     * Lots with remaining quantity > 0, oldest-first (FIFO).
     * Does NOT filter by status — use when exhausted lots should still appear.
     */
    @Query("SELECT l FROM Lot l " +
           "WHERE l.product.productId = :productId " +
           "AND l.remainingQuantity > 0 " +
           "ORDER BY l.purchaseDate ASC")
    List<Lot> findLotsWithRemainingQuantityForFIFO(@Param("productId") Long productId);

    // ─── Product queries ─────────────────────────────────────────────────────

    /** All lots for a product, unordered. */
    List<Lot> findByProductProductId(Long productId);

    /** All lots for a product, newest first (price history). */
    @Query("SELECT l FROM Lot l " +
           "WHERE l.product.productId = :productId " +
           "ORDER BY l.purchaseDate DESC, l.createdAt DESC")
    List<Lot> findByProductProductIdOrderByPurchaseDateDesc(@Param("productId") Long productId);

    /** FIFO-ordered lots by product and status. */
    List<Lot> findByProductProductIdAndStatusOrderByPurchaseDateAsc(
            Long productId, Lot.LotStatus status);

    /** Distinct active purchase prices for a product (price-difference detection). */
    @Query("SELECT DISTINCT l.purchasePrice FROM Lot l " +
           "WHERE l.product.productId = :productId AND l.status = 'Active'")
    List<BigDecimal> findDistinctPricesByProduct(@Param("productId") Long productId);

    // ─── Stock / value calculations ──────────────────────────────────────────

    /** Total remaining stock across all active lots for a product. */
    @Query("SELECT COALESCE(SUM(l.remainingQuantity), 0) FROM Lot l " +
           "WHERE l.product.productId = :productId AND l.status = 'Active'")
    BigDecimal getTotalStockByProduct(@Param("productId") Long productId);

    /** Inventory value for a single product (active lots only). */
    @Query("SELECT COALESCE(SUM(l.remainingQuantity * l.purchasePrice), 0) FROM Lot l " +
           "WHERE l.product.productId = :productId AND l.status = 'Active'")
    BigDecimal calculateInventoryValueByProduct(@Param("productId") Long productId);

    /** Total inventory value across all active lots. */
    @Query("SELECT COALESCE(SUM(l.remainingQuantity * l.purchasePrice), 0) FROM Lot l " +
           "WHERE l.status = 'Active'")
    BigDecimal calculateTotalInventoryValue();

    /** Count of all active lots. */
    @Query("SELECT COUNT(l) FROM Lot l WHERE l.status = 'Active'")
    Long countActiveLots();

    // ─── Lookup by identifiers ───────────────────────────────────────────────

    Boolean existsByLotNumber(String lotNumber);

    Optional<Lot> findByLotNumber(String lotNumber);

    // ─── Location / supplier filters ─────────────────────────────────────────

    /** All lots for a supplier (derived query, lazy fetch). */
    List<Lot> findBySupplierSupplierId(Long supplierId);

    List<Lot> findByRackRackId(Long rackId);

    List<Lot> findByBoxBoxId(Long boxId);

    List<Lot> findByStatus(Lot.LotStatus status);
    Optional<Lot> findTopByProductProductIdOrderByCreatedAtDesc(Long productId);

    /**
     * All lots for a supplier, newest first.
     * Eagerly fetches product/category/rack/box to avoid N+1 in
     * SupplierService.getSupplierProductSummary / getSupplierPurchaseDetails.
     */
    @Query("SELECT l FROM Lot l " +
           "LEFT JOIN FETCH l.product p " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH l.rack " +
           "LEFT JOIN FETCH l.box " +
           "WHERE l.supplier.supplierId = :supplierId " +
           "ORDER BY l.purchaseDate DESC")
    List<Lot> findBySupplierSupplierIdWithFetch(@Param("supplierId") Long supplierId);
}