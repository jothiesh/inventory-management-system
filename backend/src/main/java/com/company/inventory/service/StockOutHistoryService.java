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

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStockOutHistory(LocalDateTime startDate, LocalDateTime endDate) {
        log.info("Compiling Stock OUT history between '{}' and '{}'", startDate, endDate);
        List<Map<String, Object>> history = new ArrayList<>();

        List<StockMovement> outMovements = movementRepository
                .findByMovementTypeAndCreatedAtBetweenOrderByCreatedAtDesc(
                        StockMovement.MovementType.OUT,
                        startDate != null ? startDate : LocalDateTime.now().minusMonths(12),
                        endDate != null ? endDate : LocalDateTime.now()
                );
        log.debug("Found {} OUT movements.", outMovements.size());

        for (StockMovement movement : outMovements) {
            try {
                Map<String, Object> record = new HashMap<>();

                // ── core fields ──
                record.put("movementId",       movement.getMovementId());
                record.put("movementDate",     movement.getCreatedAt());
                record.put("quantity",         movement.getQuantity());
                record.put("transactionType",  movement.getTransactionType() != null ? movement.getTransactionType().name() : "");
                record.put("referenceNumber",  movement.getReferenceNumber() != null ? movement.getReferenceNumber() : "");
                record.put("notes",            movement.getNotes() != null ? movement.getNotes() : "");
                record.put("reason",           movement.getTransactionType() != null ? movement.getTransactionType().name() : "");
                record.put("reference",        movement.getReferenceNumber() != null ? movement.getReferenceNumber() : "");

                // ✅ NEW — fields the StockOutHistory.jsx Edit/Cancel buttons depend on
                record.put("transactionGroupId", movement.getTransactionGroupId());
                record.put("reversed",            movement.isReversed());

                // ── who issued ──
                record.put("performedBy", movement.getCreatedBy() != null ? movement.getCreatedBy().getFullName() : "System");
                record.put("createdBy",   movement.getCreatedBy() != null ? movement.getCreatedBy().getUsername() : "system");

                // ── product: nested object (existing) + flat fields (NEW for frontend) ──
                if (movement.getProduct() != null) {
                    Map<String, Object> productInfo = new HashMap<>();
                    productInfo.put("productId",    movement.getProduct().getProductId());
                    productInfo.put("partNumber",   movement.getProduct().getPartNumber());
                    productInfo.put("description",  movement.getProduct().getDescription());
                    productInfo.put("categoryName", movement.getProduct().getCategory() != null
                            ? movement.getProduct().getCategory().getCategoryName() : "Uncategorized");
                    record.put("product", productInfo);

                    // ✅ FLAT fields — used by StockOutHistory.jsx table
                    record.put("productId",    movement.getProduct().getProductId());   // ✅ NEW — needed for Edit re-issue
                    record.put("partNumber",   movement.getProduct().getPartNumber());
                    record.put("description",  movement.getProduct().getDescription());
                    record.put("categoryName", movement.getProduct().getCategory() != null
                            ? movement.getProduct().getCategory().getCategoryName() : "Uncategorized");
                } else {
                    record.put("productId",    null);
                    record.put("partNumber",   "");
                    record.put("description",  "");
                    record.put("categoryName", "Uncategorized");
                }

                // ── lot: nested object (existing) + flat rack/box fields (NEW for frontend) ──
                if (movement.getLot() != null) {
                    Lot lot = movement.getLot();
                    Map<String, Object> lotInfo = new HashMap<>();
                    lotInfo.put("lotId",        lot.getLotId());
                    lotInfo.put("lotNumber",    lot.getLotNumber());
                    lotInfo.put("purchasePrice",lot.getPurchasePrice());
                    lotInfo.put("purchaseDate", lot.getPurchaseDate());
                    lotInfo.put("supplierName", lot.getSupplier() != null ? lot.getSupplier().getSupplierName() : "");
                    record.put("lot", lotInfo);

                    BigDecimal stockOutValue = movement.getQuantity().multiply(
                            lot.getPurchasePrice() != null ? lot.getPurchasePrice() : BigDecimal.ZERO);
                    record.put("stockOutValue", stockOutValue);
                } else {
                    record.put("stockOutValue", BigDecimal.ZERO);
                }

                // ✅ FLAT rack/box fields — used by StockOutHistory.jsx location column
                record.put("rackName", movement.getFromRack() != null
                        ? movement.getFromRack().getRackName() : "");
                record.put("boxLabel", movement.getFromBox() != null
                        ? movement.getFromBox().getBoxLabel() : "");

                history.add(record);
            } catch (Exception e) {
                log.error("Error mapping movement {}: {}", movement.getMovementId(), e.getMessage());
            }
        }

        log.info("Stock OUT history complete. {} records returned.", history.size());
        return history;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getProductStockOutHistory(Long productId) {
        log.info("Fetching stock out history for product ID: {}", productId);
        List<Map<String, Object>> history = new ArrayList<>();

        List<StockMovement> outMovements = movementRepository
                .findByProductProductIdAndMovementTypeOrderByCreatedAtDesc(
                        productId, StockMovement.MovementType.OUT);

        for (StockMovement movement : outMovements) {
            try {
                Map<String, Object> record = new HashMap<>();
                record.put("movementId",      movement.getMovementId());
                record.put("movementDate",    movement.getCreatedAt());
                record.put("quantity",        movement.getQuantity());
                record.put("transactionType", movement.getTransactionType() != null ? movement.getTransactionType().name() : "");
                record.put("referenceNumber", movement.getReferenceNumber() != null ? movement.getReferenceNumber() : "");
                record.put("notes",           movement.getNotes() != null ? movement.getNotes() : "");
                record.put("reason",          movement.getTransactionType() != null ? movement.getTransactionType().name() : "");
                record.put("reference",       movement.getReferenceNumber() != null ? movement.getReferenceNumber() : "");
                record.put("performedBy",     movement.getCreatedBy() != null ? movement.getCreatedBy().getFullName() : "System");

                // ✅ NEW — group + reversed + productId for Edit/Cancel
                record.put("transactionGroupId", movement.getTransactionGroupId());
                record.put("reversed",            movement.isReversed());
                record.put("productId",           movement.getProduct() != null ? movement.getProduct().getProductId() : null);

                // flat fields
                record.put("partNumber",   movement.getProduct() != null ? movement.getProduct().getPartNumber() : "");
                record.put("description",  movement.getProduct() != null ? movement.getProduct().getDescription() : "");
                record.put("categoryName", movement.getProduct() != null && movement.getProduct().getCategory() != null
                        ? movement.getProduct().getCategory().getCategoryName() : "Uncategorized");
                record.put("rackName",     movement.getFromRack() != null ? movement.getFromRack().getRackName() : "");
                record.put("boxLabel",     movement.getFromBox() != null ? movement.getFromBox().getBoxLabel() : "");

                if (movement.getLot() != null) {
                    Lot lot = movement.getLot();
                    Map<String, Object> lotInfo = new HashMap<>();
                    lotInfo.put("lotNumber",    lot.getLotNumber());
                    lotInfo.put("purchasePrice",lot.getPurchasePrice());
                    record.put("lot", lotInfo);
                    record.put("stockOutValue", movement.getQuantity().multiply(
                            lot.getPurchasePrice() != null ? lot.getPurchasePrice() : BigDecimal.ZERO));
                } else {
                    record.put("stockOutValue", BigDecimal.ZERO);
                }

                history.add(record);
            } catch (Exception e) {
                log.error("Error mapping product movement: {}", e.getMessage());
            }
        }
        return history;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStockOutSummary(LocalDateTime startDate, LocalDateTime endDate) {
        log.info("Generating stock out summary analytics.");
        LocalDateTime start = startDate != null ? startDate : LocalDateTime.now().minusMonths(12);
        LocalDateTime end   = endDate   != null ? endDate   : LocalDateTime.now();

        List<StockMovement> outMovements = movementRepository
                .findByMovementTypeAndCreatedAtBetweenOrderByCreatedAtDesc(
                        StockMovement.MovementType.OUT, start, end);

        BigDecimal totalQuantity = BigDecimal.ZERO;
        BigDecimal totalValue    = BigDecimal.ZERO;

        Map<String, Long>       byTypeCount = new HashMap<>();
        Map<String, BigDecimal> byTypeQty   = new HashMap<>();

        long uniqueProducts = outMovements.stream()
                .filter(m -> m.getProduct() != null)
                .map(m -> m.getProduct().getProductId())
                .distinct().count();

        for (StockMovement movement : outMovements) {
            totalQuantity = totalQuantity.add(movement.getQuantity());
            if (movement.getLot() != null && movement.getLot().getPurchasePrice() != null) {
                totalValue = totalValue.add(
                        movement.getQuantity().multiply(movement.getLot().getPurchasePrice()));
            }

            String type = movement.getTransactionType() != null
                    ? movement.getTransactionType().name() : "Unknown";
            byTypeCount.merge(type, 1L, Long::sum);
            byTypeQty.merge(type, movement.getQuantity(), BigDecimal::add);
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalTransactions",     outMovements.size());
        summary.put("totalQuantityOut",       totalQuantity);
        summary.put("totalValueOut",          totalValue);
        summary.put("uniqueProductsAffected", uniqueProducts);
        summary.put("byType",                byTypeCount);
        summary.put("qtyByType",             byTypeQty);
        summary.put("startDate",             start);
        summary.put("endDate",               end);

        log.info("Summary complete. Total qty: {}, Total value: {}", totalQuantity, totalValue);
        return summary;
    }
}