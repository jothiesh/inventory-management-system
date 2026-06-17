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
        log.info("Processing compilation log request for combined active balance metrics details maps on Product ID: {}", productId);
        Map<String, Object> stockInfo = new HashMap<>();

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> {
                    log.error("Stock evaluation failed: Core item definitions row missing for target index tag ID: {}", productId);
                    return new RuntimeException("Product not found: " + productId);
                });

        BigDecimal totalStock = currentStockRepository.getTotalStockByProduct(productId);
        List<CurrentStock> lotStocks = currentStockRepository.findByProductProductId(productId);
        log.debug("Discovered {} active lot tracking row vectors mapping balance records under index target: {}", lotStocks.size(), productId);

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
            log.warn("System catalog warning alert flag: Part profile configuration tracker item '{}' is entirely out of physical stock.", product.getPartNumber());
        } else if (product.getMinStockLevel() != null
                && totalStock.compareTo(BigDecimal.valueOf(product.getMinStockLevel())) <= 0) {
            status = "Low Stock";
            log.warn("System catalog threshold notification alert: Part profile '{}' dropped below minimum designated level requirements. [Current: {}, Limit threshold: {}]", 
                    product.getPartNumber(), totalStock, product.getMinStockLevel());
        }
        stockInfo.put("status", status);

        return stockInfo;
    }

    /**
     * Get products with low stock (below minStockLevel)
     */
    @Transactional(readOnly = true)
    public List<CurrentStock> getProductsBelowMinStock() {
        log.debug("Invoking batch repository lookup scanner filter layer queries to discover items beneath floor replenishment levels.");
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
        log.info("Executing comprehensive status aggregation analytics overview against active product catalog layout matrices.");
        Map<String, Object> summary = new HashMap<>();

        List<Product> allProducts = productRepository.findByIsActiveTrue();
        long inStock = 0;
        long outOfStock = 0;
        long lowStock = 0;

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

        log.info("Catalog matrix analysis overview calculated successfully. Summary stats fields: Total lines: {}, Safe: {}, Beneath boundary values: {}, Empty: {}", 
                allProducts.size(), inStock, lowStock, outOfStock);
        return summary;
    }
}