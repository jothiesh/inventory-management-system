package com.company.inventory.service;

import com.company.inventory.entity.Lot;
import com.company.inventory.entity.StockMovement;
import com.company.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockOutHistoryService {

    private final StockMovementRepository movementRepository;

    /**
     * Get complete stock out history with lot details
     *
     * ✅ FIX: Uses correct StockMovement field names:
     *   - transactionType (was: getReason() which doesn't exist)
     *   - referenceNumber  (was: getReference() which doesn't exist)
     *   - notes            (additional info field)
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStockOutHistory(
            LocalDateTime startDate,
            LocalDateTime endDate) {

        List<Map<String, Object>> history = new ArrayList<>();

        // Get all OUT movements in date range
        List<StockMovement> outMovements = movementRepository
                .findByMovementTypeAndCreatedAtBetweenOrderByCreatedAtDesc(
                        StockMovement.MovementType.OUT,
                        startDate != null ? startDate : LocalDateTime.now().minusMonths(12),
                        endDate != null ? endDate : LocalDateTime.now()
                );

        for (StockMovement movement : outMovements) {
            try {
                Map<String, Object> record = new HashMap<>();

                // Basic info
                record.put("movementId", movement.getMovementId());
                record.put("movementDate", movement.getCreatedAt());
                record.put("quantity", movement.getQuantity());

                // ✅ FIX: Use correct field names from StockMovement entity
                record.put("transactionType", movement.getTransactionType() != null
                        ? movement.getTransactionType().name() : "");
                record.put("referenceNumber", movement.getReferenceNumber() != null
                        ? movement.getReferenceNumber() : "");
                record.put("notes", movement.getNotes() != null
                        ? movement.getNotes() : "");

                // ✅ Also provide "reason" and "reference" keys for frontend compatibility
                record.put("reason", movement.getTransactionType() != null
                        ? movement.getTransactionType().name() : "");
                record.put("reference", movement.getReferenceNumber() != null
                        ? movement.getReferenceNumber() : "");

                // Performed by
                record.put("performedBy", movement.getCreatedBy() != null
                        ? movement.getCreatedBy().getFullName() : "System");
                record.put("createdBy", movement.getCreatedBy() != null
                        ? movement.getCreatedBy().getUsername() : "system");

                // Product info
                if (movement.getProduct() != null) {
                    Map<String, Object> productInfo = new HashMap<>();
                    productInfo.put("productId", movement.getProduct().getProductId());
                    productInfo.put("partNumber", movement.getProduct().getPartNumber());
                    productInfo.put("description", movement.getProduct().getDescription());

                    if (movement.getProduct().getCategory() != null) {
                        productInfo.put("categoryName",
                                movement.getProduct().getCategory().getCategoryName());
                    } else {
                        productInfo.put("categoryName", "Uncategorized");
                    }

                    record.put("product", productInfo);
                }

                // Lot info (purchase price at time of stock out)
                if (movement.getLot() != null) {
                    Lot lot = movement.getLot();
                    Map<String, Object> lotInfo = new HashMap<>();
                    lotInfo.put("lotId", lot.getLotId());
                    lotInfo.put("lotNumber", lot.getLotNumber());
                    lotInfo.put("purchasePrice", lot.getPurchasePrice());
                    lotInfo.put("purchaseDate", lot.getPurchaseDate());
                    lotInfo.put("supplierName", lot.getSupplier() != null
                            ? lot.getSupplier().getSupplierName() : "");

                    record.put("lot", lotInfo);

                    // Calculate stock out value
                    BigDecimal stockOutValue = movement.getQuantity()
                            .multiply(lot.getPurchasePrice());
                    record.put("stockOutValue", stockOutValue);
                } else {
                    record.put("stockOutValue", BigDecimal.ZERO);
                }

                history.add(record);

            } catch (Exception e) {
                log.error("Error processing movement {}: {}",
                        movement.getMovementId(), e.getMessage());
                // Skip this record but continue processing others
            }
        }

        return history;
    }

    /**
     * Get stock out history for a specific product
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getProductStockOutHistory(Long productId) {
        List<Map<String, Object>> history = new ArrayList<>();

        List<StockMovement> outMovements = movementRepository
                .findByProductProductIdAndMovementTypeOrderByCreatedAtDesc(
                        productId, StockMovement.MovementType.OUT);

        for (StockMovement movement : outMovements) {
            try {
                Map<String, Object> record = new HashMap<>();
                record.put("movementId", movement.getMovementId());
                record.put("movementDate", movement.getCreatedAt());
                record.put("quantity", movement.getQuantity());

                // ✅ FIX: Use correct field names
                record.put("transactionType", movement.getTransactionType() != null
                        ? movement.getTransactionType().name() : "");
                record.put("referenceNumber", movement.getReferenceNumber() != null
                        ? movement.getReferenceNumber() : "");
                record.put("notes", movement.getNotes() != null
                        ? movement.getNotes() : "");
                record.put("reason", movement.getTransactionType() != null
                        ? movement.getTransactionType().name() : "");
                record.put("reference", movement.getReferenceNumber() != null
                        ? movement.getReferenceNumber() : "");
                record.put("performedBy", movement.getCreatedBy() != null
                        ? movement.getCreatedBy().getFullName() : "System");

                if (movement.getLot() != null) {
                    Lot lot = movement.getLot();
                    Map<String, Object> lotInfo = new HashMap<>();
                    lotInfo.put("lotNumber", lot.getLotNumber());
                    lotInfo.put("purchasePrice", lot.getPurchasePrice());
                    record.put("lot", lotInfo);

                    record.put("stockOutValue",
                            movement.getQuantity().multiply(lot.getPurchasePrice()));
                }

                history.add(record);

            } catch (Exception e) {
                log.error("Error processing movement: {}", e.getMessage());
            }
        }

        return history;
    }

    /**
     * Get stock out summary for a date range
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getStockOutSummary(
            LocalDateTime startDate, LocalDateTime endDate) {

        LocalDateTime start = startDate != null ? startDate : LocalDateTime.now().minusMonths(12);
        LocalDateTime end = endDate != null ? endDate : LocalDateTime.now();

        List<StockMovement> outMovements = movementRepository
                .findByMovementTypeAndCreatedAtBetweenOrderByCreatedAtDesc(
                        StockMovement.MovementType.OUT, start, end);

        BigDecimal totalQuantity = BigDecimal.ZERO;
        BigDecimal totalValue = BigDecimal.ZERO;
        long uniqueProducts = outMovements.stream()
                .filter(m -> m.getProduct() != null)
                .map(m -> m.getProduct().getProductId())
                .distinct()
                .count();

        for (StockMovement movement : outMovements) {
            totalQuantity = totalQuantity.add(movement.getQuantity());

            if (movement.getLot() != null && movement.getLot().getPurchasePrice() != null) {
                totalValue = totalValue.add(
                        movement.getQuantity().multiply(movement.getLot().getPurchasePrice()));
            }
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalTransactions", outMovements.size());
        summary.put("totalQuantityOut", totalQuantity);
        summary.put("totalValueOut", totalValue);
        summary.put("uniqueProductsAffected", uniqueProducts);
        summary.put("startDate", start);
        summary.put("endDate", end);

        return summary;
    }
}
