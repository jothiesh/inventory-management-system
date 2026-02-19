package com.company.inventory.service;

import com.company.inventory.entity.CurrentStock;
import com.company.inventory.repository.CurrentStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CurrentStockService {

    private final CurrentStockRepository currentStockRepository;

    /**
     * Get all current stock for a product
     */
    @Transactional(readOnly = true)
    public List<CurrentStock> getStockByProduct(Long productId) {
        return currentStockRepository.findByProductProductId(productId);
    }

    /**
     * Get total stock quantity for a product
     */
    @Transactional(readOnly = true)
    public BigDecimal getTotalStockByProduct(Long productId) {
        return currentStockRepository.getTotalStockByProduct(productId);
    }

    /**
     * Update current stock after stock movement
     * This method should be called after every stock IN/OUT operation
     */
    @Transactional
    public void updateCurrentStock(Long lotId) {
        // Implementation depends on whether you use table or view
        // If using materialized view, refresh it
        // If using table, update the record
    }

    /**
     * Get stock by rack
     */
    @Transactional(readOnly = true)
    public List<CurrentStock> getStockByRack(Long rackId) {
        return currentStockRepository.findByRackRackId(rackId);
    }

    /**
     * Get stock by box
     */
    @Transactional(readOnly = true)
    public List<CurrentStock> getStockByBox(Long boxId) {
        return currentStockRepository.findByBoxBoxId(boxId);
    }

    /**
     * Get products below reorder level
     */
    @Transactional(readOnly = true)
    public List<CurrentStock> getProductsBelowReorderLevel() {
        return currentStockRepository.findProductsBelowReorderLevel();
    }

    /**
     * Get products with excess stock
     */
    @Transactional(readOnly = true)
    public List<CurrentStock> getProductsWithExcessStock() {
        return currentStockRepository.findProductsWithExcessStock();
    }
}