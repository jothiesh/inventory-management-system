package com.company.inventory.service;

import com.company.inventory.entity.Lot;
import com.company.inventory.entity.Product;
import com.company.inventory.repository.LotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PriceDifferenceService {

    private final LotRepository lotRepository;
    private final AlertService alertService;

    /**
     * Check if new purchase price differs from existing prices
     * Creates alert if difference is detected
     */
    @Transactional(readOnly = true)
    public boolean checkAndAlertPriceDifference(Product product, BigDecimal newPrice) {
        // Get all distinct prices for this product
        List<BigDecimal> existingPrices = lotRepository.findDistinctPricesByProduct(product.getProductId());
        
        if (existingPrices.isEmpty()) {
            // First purchase of this product
            return false;
        }
        
        // Check if new price is different from any existing price
        boolean isDifferent = existingPrices.stream()
                .noneMatch(price -> price.compareTo(newPrice) == 0);
        
        if (isDifferent) {
            // Create alert for price difference
            alertService.createPriceDifferenceAlert(product, newPrice, existingPrices);
            return true;
        }
        
        return false;
    }

    /**
     * Get all products with multiple purchase prices
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getProductsWithPriceDifferences() {
        List<Map<String, Object>> result = new ArrayList<>();
        
        // Get all active lots
        List<Lot> allLots = lotRepository.findAll().stream()
                .filter(lot -> lot.getStatus() == Lot.LotStatus.Active)
                .collect(Collectors.toList());
        
        // Group by product
        Map<Long, List<Lot>> lotsByProduct = allLots.stream()
                .collect(Collectors.groupingBy(lot -> lot.getProduct().getProductId()));
        
        // Find products with different prices
        for (Map.Entry<Long, List<Lot>> entry : lotsByProduct.entrySet()) {
            List<Lot> productLots = entry.getValue();
            
            // Get distinct prices
            Set<BigDecimal> distinctPrices = productLots.stream()
                    .map(Lot::getPurchasePrice)
                    .collect(Collectors.toSet());
            
            if (distinctPrices.size() > 1) {
                // This product has multiple prices
                Product product = productLots.get(0).getProduct();
                
                Map<String, Object> item = new HashMap<>();
                item.put("product", product);
                item.put("differentPrices", new ArrayList<>(distinctPrices));
                item.put("lots", productLots);
                item.put("priceCount", distinctPrices.size());
                item.put("minPrice", distinctPrices.stream().min(BigDecimal::compareTo).orElse(BigDecimal.ZERO));
                item.put("maxPrice", distinctPrices.stream().max(BigDecimal::compareTo).orElse(BigDecimal.ZERO));
                
                // Calculate average price
                BigDecimal avgPrice = distinctPrices.stream()
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .divide(BigDecimal.valueOf(distinctPrices.size()), 2, BigDecimal.ROUND_HALF_UP);
                item.put("avgPrice", avgPrice);
                
                result.add(item);
            }
        }
        
        // Sort by number of different prices (descending)
        result.sort((a, b) -> {
            Integer countA = (Integer) a.get("priceCount");
            Integer countB = (Integer) b.get("priceCount");
            return countB.compareTo(countA);
        });
        
        return result;
    }

    /**
     * Get price history for a specific product
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getPriceHistory(Long productId) {
        List<Lot> lots = lotRepository.findByProductProductIdOrderByPurchaseDateDesc(productId);
        
        Map<String, Object> history = new HashMap<>();
        history.put("productId", productId);
        history.put("totalLots", lots.size());
        
        // Extract price timeline
        List<Map<String, Object>> timeline = lots.stream()
                .map(lot -> {
                    Map<String, Object> entry = new HashMap<>();
                    entry.put("date", lot.getPurchaseDate());
                    entry.put("price", lot.getPurchasePrice());
                    entry.put("quantity", lot.getPurchaseQuantity());
                    entry.put("lotNumber", lot.getLotNumber());
                    entry.put("supplier", lot.getSupplier() != null ? 
                             lot.getSupplier().getSupplierName() : "Unknown");
                    return entry;
                })
                .collect(Collectors.toList());
        
        history.put("timeline", timeline);
        
        // Calculate statistics
        List<BigDecimal> prices = lots.stream()
                .map(Lot::getPurchasePrice)
                .collect(Collectors.toList());
        
        if (!prices.isEmpty()) {
            history.put("minPrice", prices.stream().min(BigDecimal::compareTo).get());
            history.put("maxPrice", prices.stream().max(BigDecimal::compareTo).get());
            history.put("avgPrice", prices.stream()
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(prices.size()), 2, BigDecimal.ROUND_HALF_UP));
        }
        
        return history;
    }

    /**
     * Format list of prices for display
     */
    private String formatPriceList(List<BigDecimal> prices) {
        return prices.stream()
                .map(price -> String.format("₹%.2f", price))
                .collect(Collectors.joining(", "));
    }

    /**
     * Calculate price variance percentage
     */
    public BigDecimal calculatePriceVariance(List<BigDecimal> prices) {
        if (prices.size() < 2) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal min = prices.stream().min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal max = prices.stream().max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        
        if (min.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        
        // Variance = ((max - min) / min) * 100
        return max.subtract(min)
                .divide(min, 4, BigDecimal.ROUND_HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }
}