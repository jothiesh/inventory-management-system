package com.company.inventory.service;

import com.company.inventory.entity.Lot;
import com.company.inventory.entity.Product;
import com.company.inventory.repository.LotRepository;
import com.company.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceDifferenceService {

    private final ProductRepository productRepository;
    private final LotRepository lotRepository;

    /**
     * Price Difference Report — TWO CASES HANDLED:
     *
     * CASE A: Same product, DIFFERENT suppliers → different cost (cross-supplier variance)
     *   Example: Supplier A sells capacitor at ₹10, Supplier B sells same at ₹15
     *
     * CASE B: Same product, SAME supplier, different purchase dates → price fluctuation
     *   Example: Supplier A sold capacitor at ₹10 in Jan, ₹15 in Mar (price hike)
     *
     * Both cases are flagged in the report with their respective type labels.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPriceDifferenceReport() {
        List<Map<String, Object>> report = new ArrayList<>();
        List<Product> products = productRepository.findByIsActiveTrue();

        for (Product product : products) {
            try {
                List<Lot> activeLots = lotRepository.findActiveLotsByProductForFIFO(product.getProductId());
                if (activeLots.size() < 2) continue; // Need at least 2 lots to compare

                // ---- CASE A: Different suppliers, different prices ----
                Map<String, List<Lot>> bySupplier = activeLots.stream()
                        .collect(Collectors.groupingBy(lot ->
                                lot.getSupplier() != null
                                        ? lot.getSupplier().getSupplierName()
                                        : "Unknown"));

                // Collect all unique prices across ALL lots (any supplier)
                List<BigDecimal> allPrices = activeLots.stream()
                        .map(Lot::getPurchasePrice)
                        .distinct()
                        .sorted()
                        .collect(Collectors.toList());

                boolean hasCrossSupplierVariance = allPrices.size() > 1 && bySupplier.size() > 1;

                // ---- CASE B: Same supplier, price changed over time ----
                List<Map<String, Object>> sameSuppliervariations = new ArrayList<>();
                for (Map.Entry<String, List<Lot>> entry : bySupplier.entrySet()) {
                    String supplierName = entry.getKey();
                    List<Lot> supplierLots = entry.getValue();

                    List<BigDecimal> supplierPrices = supplierLots.stream()
                            .map(Lot::getPurchasePrice)
                            .distinct()
                            .sorted()
                            .collect(Collectors.toList());

                    if (supplierPrices.size() > 1) {
                        // Same supplier bought at different prices on different dates
                        BigDecimal minP = supplierPrices.get(0);
                        BigDecimal maxP = supplierPrices.get(supplierPrices.size() - 1);

                        // Find oldest and newest lot for this supplier
                        Lot oldestLot = supplierLots.stream()
                                .min(Comparator.comparing(Lot::getPurchaseDate))
                                .orElse(null);
                        Lot newestLot = supplierLots.stream()
                                .max(Comparator.comparing(Lot::getPurchaseDate))
                                .orElse(null);

                        Map<String, Object> variation = new HashMap<>();
                        variation.put("supplierName",   supplierName);
                        variation.put("minPrice",        minP);
                        variation.put("maxPrice",        maxP);
                        variation.put("difference",      maxP.subtract(minP));
                        variation.put("differencePercent", calcPercent(minP, maxP));
                        variation.put("lotCount",        supplierLots.size());
                        variation.put("oldestDate",      oldestLot != null ? oldestLot.getPurchaseDate() : null);
                        variation.put("newestDate",      newestLot != null ? newestLot.getPurchaseDate() : null);
                        variation.put("allPrices",       supplierPrices);

                        sameSuppliervariations.add(variation);
                    }
                }

                // Only add to report if there is ANY variance (Case A or Case B or both)
                boolean hasSameSupplierVariance = !sameSuppliervariations.isEmpty();
                if (!hasCrossSupplierVariance && !hasSameSupplierVariance) continue;

                // Overall min/max across ALL lots of this product
                BigDecimal overallMin = allPrices.get(0);
                BigDecimal overallMax = allPrices.get(allPrices.size() - 1);

                // Build lot detail rows for the expandable section
                List<Map<String, Object>> lotDetails = new ArrayList<>();
                for (Lot lot : activeLots) {
                    Map<String, Object> lotRow = new HashMap<>();
                    lotRow.put("lotNumber",      lot.getLotNumber());
                    lotRow.put("purchasePrice",  lot.getPurchasePrice());
                    lotRow.put("purchaseDate",   lot.getPurchaseDate());
                    lotRow.put("remainingQty",   lot.getRemainingQuantity());
                    lotRow.put("supplierName",   lot.getSupplier() != null
                            ? lot.getSupplier().getSupplierName() : "Unknown");
                    lotRow.put("rackNumber",     lot.getRack() != null
                            ? lot.getRack().getRackNumber() : "—");
                    lotDetails.add(lotRow);
                }

                // Determine variance type label
                String varianceType;
                if (hasCrossSupplierVariance && hasSameSupplierVariance) {
                    varianceType = "Both"; // cross-supplier AND same-supplier price change
                } else if (hasCrossSupplierVariance) {
                    varianceType = "Cross-Supplier";
                } else {
                    varianceType = "Same-Supplier Price Change";
                }

                Map<String, Object> productRow = new HashMap<>();
                // Flat product keys for frontend table
                productRow.put("partNumber",              product.getPartNumber());
                productRow.put("description",             product.getDescription());
                productRow.put("categoryName",            product.getCategory() != null
                        ? product.getCategory().getCategoryName() : "Uncategorized");
                productRow.put("overallMinPrice",         overallMin);
                productRow.put("overallMaxPrice",         overallMax);
                productRow.put("overallDifference",       overallMax.subtract(overallMin));
                productRow.put("overallDifferencePercent",calcPercent(overallMin, overallMax));
                productRow.put("varianceType",            varianceType);
                productRow.put("supplierCount",           bySupplier.size());
                productRow.put("totalLots",               activeLots.size());
                // Case B details — per-supplier price variations
                productRow.put("sameSupplierVariations",  sameSuppliervariations);
                // All lot rows
                productRow.put("lotDetails",              lotDetails);

                report.add(productRow);

            } catch (Exception e) {
                log.error("Price diff error for product {}: {}", product.getProductId(), e.getMessage());
            }
        }

        // Sort: highest overall difference % first
        report.sort((a, b) -> {
            BigDecimal pctA = (BigDecimal) a.get("overallDifferencePercent");
            BigDecimal pctB = (BigDecimal) b.get("overallDifferencePercent");
            return pctB.compareTo(pctA);
        });

        log.info("Price difference report: {} products with variance", report.size());
        return report;
    }

    /**
     * Check and alert if a new stock-in price differs from existing lots.
     * Called from StockService.stockIn() before saving.
     */
    @Transactional(readOnly = true)
    public void checkAndAlertPriceDifference(Product product, BigDecimal newPrice) {
        try {
            List<BigDecimal> existingPrices =
                    lotRepository.findDistinctPricesByProduct(product.getProductId());

            for (BigDecimal existingPrice : existingPrices) {
                if (existingPrice.compareTo(newPrice) != 0) {
                    BigDecimal diffPct = calcPercent(existingPrice, newPrice);
                    log.warn("Price difference alert — Product: {}, Existing: ₹{}, New: ₹{}, Diff: {}%",
                            product.getPartNumber(), existingPrice, newPrice, diffPct);
                    // TODO: plug into AlertService when alert entity supports price-diff type
                }
            }
        } catch (Exception e) {
            log.error("Price check error for product {}: {}", product.getProductId(), e.getMessage());
        }
    }

    // ---- Helper ----
    private BigDecimal calcPercent(BigDecimal base, BigDecimal target) {
        if (base == null || base.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return target.subtract(base)
                .multiply(BigDecimal.valueOf(100))
                .divide(base, 2, RoundingMode.HALF_UP);
    }
}