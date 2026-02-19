package com.company.inventory.service;

import com.company.inventory.entity.Lot;
import com.company.inventory.entity.Product;
import com.company.inventory.entity.StockMovement;
import com.company.inventory.repository.LotRepository;
import com.company.inventory.repository.ProductRepository;
import com.company.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DeadStockService {

    private final ProductRepository productRepository;
    private final LotRepository lotRepository;
    private final StockMovementRepository movementRepository;
    private final AlertService alertService;

    /**
     * ✅ ENHANCED: Lot-wise Dead Stock Analysis
     * Example: LED bought 100qty (Lot1), then 200qty (Lot2), then 300qty (Lot3)
     * Used 200 from Lot1, 300 from Lot2, 100 from Lot3
     * Remaining: Lot1=0, Lot2=100 (DEAD if 12+ months), Lot3=200 (active)
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDeadStockReport() {
        List<Map<String, Object>> deadStockItems = new ArrayList<>();
        LocalDate twelveMonthsAgo = LocalDate.now().minusMonths(12);

        // Analyze each active lot individually
        List<Lot> activeLots = lotRepository.findAll().stream()
                .filter(lot -> lot.getStatus() == Lot.LotStatus.Active &&
                              lot.getRemainingQuantity().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        for (Lot lot : activeLots) {
            // Get last movement for THIS specific lot
            LocalDateTime lastLotMovement = getLastLotMovementDate(lot.getLotId());
            
            // If no movement for this lot, use purchase date
            LocalDateTime referenceDate = lastLotMovement != null ? 
                lastLotMovement : lot.getPurchaseDate();
            
            // Check if THIS lot hasn't moved in 12+ months
            if (referenceDate.toLocalDate().isBefore(twelveMonthsAgo)) {
                BigDecimal blockedValue = lot.getRemainingQuantity()
                    .multiply(lot.getPurchasePrice());
                
                Map<String, Object> item = new HashMap<>();
                item.put("product", lot.getProduct());
                item.put("lot", lot);
                item.put("lotNumber", lot.getLotNumber());
                item.put("remainingQuantity", lot.getRemainingQuantity());
                item.put("purchasePrice", lot.getPurchasePrice());
                item.put("purchaseDate", lot.getPurchaseDate());
                item.put("lastMovementDate", referenceDate);
                item.put("blockedValue", blockedValue);
                item.put("monthsNoMovement", getMonthsDifference(
                    referenceDate.toLocalDate(), LocalDate.now()));
                item.put("supplierName", lot.getSupplier() != null ? 
                    lot.getSupplier().getSupplierName() : "N/A");
                
                deadStockItems.add(item);
            }
        }

        return deadStockItems;
    }

    /**
     * ✅ ENHANCED: Lot-wise Slow Moving Analysis (6+ months)
     * Tracks each purchase lot separately
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSlowMovingStockReport() {
        List<Map<String, Object>> slowMovingItems = new ArrayList<>();
        LocalDate sixMonthsAgo = LocalDate.now().minusMonths(6);

        // Analyze each active lot
        List<Lot> activeLots = lotRepository.findAll().stream()
                .filter(lot -> lot.getStatus() == Lot.LotStatus.Active &&
                              lot.getRemainingQuantity().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        for (Lot lot : activeLots) {
            LocalDateTime lastLotMovement = getLastLotMovementDate(lot.getLotId());
            LocalDateTime referenceDate = lastLotMovement != null ? 
                lastLotMovement : lot.getPurchaseDate();
            
            // Check if this lot hasn't moved in 6+ months
            if (referenceDate.toLocalDate().isBefore(sixMonthsAgo)) {
                Map<String, Object> item = new HashMap<>();
                item.put("product", lot.getProduct());
                item.put("lot", lot);
                item.put("lotNumber", lot.getLotNumber());
                item.put("remainingQuantity", lot.getRemainingQuantity());
                item.put("purchasePrice", lot.getPurchasePrice());
                item.put("purchaseDate", lot.getPurchaseDate());
                item.put("lastMovementDate", referenceDate);
                item.put("monthsNoMovement", getMonthsDifference(
                    referenceDate.toLocalDate(), LocalDate.now()));
                item.put("noMovementHistory", lastLotMovement == null);
                item.put("supplierName", lot.getSupplier() != null ? 
                    lot.getSupplier().getSupplierName() : "N/A");
                
                slowMovingItems.add(item);
            }
        }

        return slowMovingItems;
    }

    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void detectAndAlertDeadStock() {
        System.out.println("Running lot-wise dead stock detection...");

        List<Map<String, Object>> deadStockItems = getDeadStockReport();
        for (Map<String, Object> item : deadStockItems) {
            Product product = (Product) item.get("product");
            int months = (int) item.get("monthsNoMovement");
            BigDecimal blockedValue = (BigDecimal) item.get("blockedValue");
            
            alertService.createDeadStockAlert(product, months, blockedValue);
        }

        List<Map<String, Object>> slowMovingItems = getSlowMovingStockReport();
        for (Map<String, Object> item : slowMovingItems) {
            Product product = (Product) item.get("product");
            int months = (int) item.get("monthsNoMovement");
            
            alertService.createSlowMovingAlert(product, months);
        }

        System.out.println("Lot-wise analysis completed. Dead: " + deadStockItems.size() + 
                           ", Slow Moving: " + slowMovingItems.size());
    }

    /**
     * Get last movement date for a SPECIFIC lot (not product)
     */
    private LocalDateTime getLastLotMovementDate(Long lotId) {
        List<StockMovement> movements = movementRepository.findLastMovementByLot(lotId);
        return movements.isEmpty() ? null : movements.get(0).getCreatedAt();
    }

    /**
     * Get last movement date for a product (any lot)
     */
    private LocalDateTime getLastProductMovementDate(Long productId) {
        List<StockMovement> movements = movementRepository
            .findLastMovementByProduct(productId);
        return movements.isEmpty() ? null : movements.get(0).getCreatedAt();
    }

    /**
     * Calculate months between dates
     */
    private int getMonthsDifference(LocalDate from, LocalDate to) {
        return (to.getYear() - from.getYear()) * 12 + 
               (to.getMonthValue() - from.getMonthValue());
    }
}