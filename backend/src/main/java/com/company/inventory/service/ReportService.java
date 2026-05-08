package com.company.inventory.service;

import com.company.inventory.entity.Category;
import com.company.inventory.entity.Lot;
import com.company.inventory.entity.Product;
import com.company.inventory.entity.Rack;
import com.company.inventory.repository.CategoryRepository;
import com.company.inventory.repository.LotRepository;
import com.company.inventory.repository.ProductRepository;
import com.company.inventory.repository.RackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ProductRepository productRepository;
    private final LotRepository lotRepository;
    private final CategoryRepository categoryRepository;
    private final RackRepository rackRepository;
    private final LotService lotService;
    private final PriceDifferenceService priceDifferenceService;

    // ----------------------------------------------------------------
    // STOCK SUMMARY
    // Frontend keys: totalProducts, inStock, lowStock, outOfStock, products[]
    // ----------------------------------------------------------------
    @Transactional(readOnly = true)
    public Map<String, Object> getStockSummaryReport() {
        List<Product> products = productRepository.findByIsActiveTrue();
        int inStock = 0, outOfStock = 0, lowStock = 0;
        List<Map<String, Object>> productList = new ArrayList<>();

        for (Product product : products) {
            BigDecimal currentStock = lotService.getTotalStockByProduct(product.getProductId());
            String status;
            if (currentStock.compareTo(BigDecimal.ZERO) <= 0) {
                outOfStock++;
                status = "Out of Stock";
            } else {
                inStock++;
                if (product.getMinStockLevel() != null &&
                        currentStock.compareTo(BigDecimal.valueOf(product.getMinStockLevel())) <= 0) {
                    lowStock++;
                    status = "Low Stock";
                } else {
                    status = "In Stock";
                }
            }

            Map<String, Object> p = new HashMap<>();
            p.put("partNumber",   product.getPartNumber());
            p.put("description",  product.getDescription());
            p.put("categoryName", product.getCategory() != null
                    ? product.getCategory().getCategoryName() : "Uncategorized");
            p.put("totalStock",   currentStock);
            p.put("status",       status);
            productList.add(p);
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalProducts", products.size());
        summary.put("inStock",       inStock);
        summary.put("outOfStock",    outOfStock);
        summary.put("lowStock",      lowStock);
        summary.put("products",      productList);
        return summary;
    }

    // ----------------------------------------------------------------
    // CATEGORY WISE
    // Frontend keys: categoryName, totalProducts, totalStock, totalValue
    // ----------------------------------------------------------------
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCategoryWiseStockReport() {
        List<Map<String, Object>> report = new ArrayList<>();
        for (Category category : categoryRepository.findByIsActiveTrue()) {
            List<Product> products = productRepository.findByCategoryCategoryId(category.getCategoryId());
            BigDecimal totalStock = BigDecimal.ZERO, totalValue = BigDecimal.ZERO;
            for (Product product : products) {
                totalStock = totalStock.add(lotService.getTotalStockByProduct(product.getProductId()));
                for (Lot lot : lotRepository.findActiveLotsByProductForFIFO(product.getProductId())) {
                    totalValue = totalValue.add(lot.getRemainingQuantity().multiply(lot.getPurchasePrice()));
                }
            }
            Map<String, Object> row = new HashMap<>();
            row.put("categoryName",  category.getCategoryName());
            row.put("totalProducts", products.size());
            row.put("totalStock",    totalStock);
            row.put("totalValue",    totalValue);
            report.add(row);
        }
        return report;
    }

    // ----------------------------------------------------------------
    // RACK WISE
    // Frontend keys: rackNumber, rackName, totalItems, totalStock, totalValue
    // ----------------------------------------------------------------
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRackWiseStockReport() {
        List<Map<String, Object>> report = new ArrayList<>();
        for (Rack rack : rackRepository.findByIsActiveTrue()) {
            List<Lot> lots = lotRepository.findAll().stream()
                    .filter(lot -> lot.getRack() != null
                            && lot.getRack().getRackId().equals(rack.getRackId())
                            && lot.getStatus() == Lot.LotStatus.Active)
                    .toList();
            BigDecimal totalStock = BigDecimal.ZERO, totalValue = BigDecimal.ZERO;
            for (Lot lot : lots) {
                totalStock = totalStock.add(lot.getRemainingQuantity());
                totalValue = totalValue.add(lot.getRemainingQuantity().multiply(lot.getPurchasePrice()));
            }
            Map<String, Object> row = new HashMap<>();
            row.put("rackNumber", rack.getRackNumber());
            row.put("rackName",   rack.getRackName());
            row.put("totalItems", lots.size());
            row.put("totalStock", totalStock);
            row.put("totalValue", totalValue);
            report.add(row);
        }
        return report;
    }

    // ----------------------------------------------------------------
    // PRICE DIFFERENCE — delegated to PriceDifferenceService
    // Case A: cross-supplier variance
    // Case B: same-supplier price change over time
    // ----------------------------------------------------------------
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPriceDifferenceReport() {
        return priceDifferenceService.getPriceDifferenceReport();
    }

    // ----------------------------------------------------------------
    // STOCK VALUE
    // Frontend keys: totalProducts, totalStockValue, totalQuantity,
    //                averagePrice, categoryBreakdown[]
    // ----------------------------------------------------------------
    @Transactional(readOnly = true)
    public Map<String, Object> getStockValueReport() {
        List<Lot> activeLots = lotRepository.findAll().stream()
                .filter(lot -> lot.getStatus() == Lot.LotStatus.Active
                        && lot.getRemainingQuantity().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        BigDecimal totalValue = BigDecimal.ZERO, totalQuantity = BigDecimal.ZERO;
        for (Lot lot : activeLots) {
            totalValue    = totalValue.add(lot.getRemainingQuantity().multiply(lot.getPurchasePrice()));
            totalQuantity = totalQuantity.add(lot.getRemainingQuantity());
        }
        BigDecimal averagePrice = totalQuantity.compareTo(BigDecimal.ZERO) > 0
                ? totalValue.divide(totalQuantity, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        List<Map<String, Object>> categoryBreakdown = new ArrayList<>();
        for (Category category : categoryRepository.findByIsActiveTrue()) {
            List<Product> catProducts = productRepository.findByCategoryCategoryId(category.getCategoryId());
            BigDecimal catValue = BigDecimal.ZERO, catQty = BigDecimal.ZERO;
            for (Product product : catProducts) {
                for (Lot lot : lotRepository.findActiveLotsByProductForFIFO(product.getProductId())) {
                    catQty   = catQty.add(lot.getRemainingQuantity());
                    catValue = catValue.add(lot.getRemainingQuantity().multiply(lot.getPurchasePrice()));
                }
            }
            String percentage = totalValue.compareTo(BigDecimal.ZERO) > 0
                    ? catValue.multiply(BigDecimal.valueOf(100))
                              .divide(totalValue, 1, RoundingMode.HALF_UP).toPlainString()
                    : "0";
            Map<String, Object> catRow = new HashMap<>();
            catRow.put("categoryName",  category.getCategoryName());
            catRow.put("productCount",  catProducts.size());
            catRow.put("totalQuantity", catQty);
            catRow.put("totalValue",    catValue);
            catRow.put("percentage",    percentage);
            categoryBreakdown.add(catRow);
        }

        Map<String, Object> report = new HashMap<>();
        report.put("totalProducts",    productRepository.findByIsActiveTrue().size());
        report.put("totalStockValue",  totalValue);
        report.put("totalQuantity",    totalQuantity);
        report.put("averagePrice",     averagePrice);
        report.put("categoryBreakdown",categoryBreakdown);
        return report;
    }
}