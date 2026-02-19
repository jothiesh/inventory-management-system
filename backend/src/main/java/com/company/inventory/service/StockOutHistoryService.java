package com.company.inventory.service;

import com.company.inventory.entity.StockMovement;
import com.company.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class StockOutHistoryService {

    private final StockMovementRepository movementRepository;

    /**
     * Get complete stock out history with lot details
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
            Map<String, Object> record = new HashMap<>();
            
            // Basic info
            record.put("movementId", movement.getMovementId());
            record.put("movementDate", movement.getCreatedAt());
            record.put("quantity", movement.getQuantity());
            record.put("reason", movement.getReason());
            record.put("reference", movement.getReference());
            
            // Product info
            Map<String, Object> productInfo = new HashMap<>();
            productInfo.put("productId", movement.getProduct().getProductId());
            productInfo.put("partNumber", movement.getProduct().getPartNumber());
            productInfo.put("description", movement.getProduct().getDescription());
            productInfo.put("categoryName", movement.getProduct().getCategory().getCategoryName());
            record.put("product", productInfo);
            
            // Lot info (purchase price at time of stock out)
            if (movement.getLot() != null) {
                Map<String, Object> lotInfo = new HashMap<>();
                lotInfo.put("lotNumber", movement.getLot().getLotNumber());
                lotInfo.put("purchasePrice", movement.getLot().getPurchasePrice());
                lotInfo.put("purchaseDate", movement.getLot().getPurchaseDate());
                lotInfo.put("supplierName", movement.getLot().getSupplier() != null ? 
                    movement.getLot().getSupplier().getSupplierName() : "N/A");
                record.put("lot", lotInfo);
                
                // Calculate value of this stock out
                record.put("stockOutValue", 
                    movement.getQuantity().multiply(movement.getLot().getPurchasePrice()));
            }
            
            // User who performed stock out
            if (movement.getCreatedBy() != null) {
                record.put("performedBy", movement.getCreatedBy().getUsername());
            }
            
            history.add(record);
        }
        
        return history;
    }

    /**
     * Get stock out history for specific product
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getProductStockOutHistory(Long productId) {
        List<Map<String, Object>> history = new ArrayList<>();
        
        List<StockMovement> movements = movementRepository
            .findByProductProductIdAndMovementTypeOrderByCreatedAtDesc(
                productId,
                StockMovement.MovementType.OUT
            );
        
        for (StockMovement movement : movements) {
            Map<String, Object> record = new HashMap<>();
            record.put("movementDate", movement.getCreatedAt());
            record.put("quantity", movement.getQuantity());
            record.put("reason", movement.getReason());
            record.put("reference", movement.getReference());
            
            if (movement.getLot() != null) {
                record.put("lotNumber", movement.getLot().getLotNumber());
                record.put("purchasePrice", movement.getLot().getPurchasePrice());
                record.put("stockOutValue", 
                    movement.getQuantity().multiply(movement.getLot().getPurchasePrice()));
            }
            
            history.add(record);
        }
        
        return history;
    }

    /**
     * Get stock out summary by date range
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getStockOutSummary(
            LocalDateTime startDate, 
            LocalDateTime endDate) {
        
        Map<String, Object> summary = new HashMap<>();
        
        List<Map<String, Object>> history = getStockOutHistory(startDate, endDate);
        
        // Calculate totals
        int totalTransactions = history.size();
        double totalQuantityOut = history.stream()
            .mapToDouble(h -> ((java.math.BigDecimal) h.get("quantity")).doubleValue())
            .sum();
        
        double totalValueOut = history.stream()
            .filter(h -> h.containsKey("stockOutValue"))
            .mapToDouble(h -> ((java.math.BigDecimal) h.get("stockOutValue")).doubleValue())
            .sum();
        
        // Count unique products
        Set<Long> uniqueProducts = new HashSet<>();
        for (Map<String, Object> h : history) {
            Map<String, Object> product = (Map<String, Object>) h.get("product");
            uniqueProducts.add((Long) product.get("productId"));
        }
        
        summary.put("totalTransactions", totalTransactions);
        summary.put("totalQuantityOut", totalQuantityOut);
        summary.put("totalValueOut", totalValueOut);
        summary.put("uniqueProductsAffected", uniqueProducts.size());
        summary.put("transactions", history);
        
        return summary;
    }
}