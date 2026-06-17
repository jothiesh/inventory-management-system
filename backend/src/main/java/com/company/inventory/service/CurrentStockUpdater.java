package com.company.inventory.service;

/**
 * Bridge to the existing current_stock table updates.
 * On QC accept, accepted qty is added; held/rejected qty is NOT moved.
 */
public interface CurrentStockUpdater {

    void addToCurrentStock(Long productId, Integer qtyAccepted, Long inspectionId);
}
