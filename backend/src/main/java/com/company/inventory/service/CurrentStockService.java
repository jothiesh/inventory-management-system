package com.company.inventory.service;

import com.company.inventory.entity.CurrentStock;
import com.company.inventory.entity.Product;
import com.company.inventory.repository.CurrentStockRepository;
import com.company.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CurrentStockService {

    private final CurrentStockRepository currentStockRepository;
    private final ProductRepository productRepository;

    /**
     * Get current stock details for a product (all lots combined)
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getProductStock(Long productId) {
        Map<String, Object> stockInfo = new HashMap<>();

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        BigDecimal totalStock = currentStockRepository.getTotalStockByProduct(productId);
        List<CurrentStock> lotStocks = currentStockRepository.findByProductProductId(productId);

        stockInfo.put("productId", productId);
        stockInfo.put("partNumber", product.getPartNumber());
        stockInfo.put("description", product.getDescription());
        stockInfo.put("totalStock", totalStock);
        stockInfo.put("minStockLevel", product.getMinStockLevel());
        stockInfo.put("lots", lotStocks);

        // Determine stock status
        String status = "In Stock";
        if (totalStock.compareTo(BigDecimal.ZERO) == 0) {
            status = "Out of Stock";
        } else if (product.getMinStockLevel() != null
                && totalStock.compareTo(BigDecimal.valueOf(product.getMinStockLevel())) <= 0) {
            status = "Low Stock";
        }
        stockInfo.put("status", status);

        return stockInfo;
    }

    /**
     * Get products with low stock (below minStockLevel)
     */
    @Transactional(readOnly = true)
    public List<CurrentStock> getProductsBelowMinStock() {
        return currentStockRepository.findProductsBelowMinStockLevel();
    }

    /**
     * ✅ FIX: Removed getProductsWithExcessStock() method
     * The repository method findProductsWithExcessStock() is commented out because
     * Product entity does not have a maxStockLevel field.
     *
     * To re-enable:
     * 1. Add maxStockLevel field to Product entity
     * 2. Uncomment findProductsWithExcessStock() in CurrentStockRepository
     * 3. Uncomment this method
     */
    // @Transactional(readOnly = true)
    // public List<CurrentStock> getProductsWithExcessStock() {
    //     return currentStockRepository.findProductsWithExcessStock();
    // }

    /**
     * Get stock summary for all products
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getStockSummary() {
        Map<String, Object> summary = new HashMap<>();

        List<Product> allProducts = productRepository.findByIsActiveTrue();
        long inStock = 0;
        long outOfStock = 0;
        long lowStock = 0;
        BigDecimal totalValue = BigDecimal.ZERO;

        for (Product product : allProducts) {
            BigDecimal stock = currentStockRepository.getTotalStockByProduct(product.getProductId());

            if (stock.compareTo(BigDecimal.ZERO) == 0) {
                outOfStock++;
            } else if (product.getMinStockLevel() != null
                    && stock.compareTo(BigDecimal.valueOf(product.getMinStockLevel())) <= 0) {
                lowStock++;
            } else {
                inStock++;
            }
        }

        summary.put("totalProducts", allProducts.size());
        summary.put("inStock", inStock);
        summary.put("outOfStock", outOfStock);
        summary.put("lowStock", lowStock);

        return summary;
    }
}
