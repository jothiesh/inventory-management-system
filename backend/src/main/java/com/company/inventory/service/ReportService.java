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
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ProductRepository productRepository;
    private final LotRepository lotRepository;
    private final CategoryRepository categoryRepository;
    private final RackRepository rackRepository;
    private final LotService lotService;

    @Transactional(readOnly = true)
    public Map<String, Object> getStockSummaryReport() {
        Map<String, Object> summary = new HashMap<>();
        
        List<Product> products = productRepository.findByIsActiveTrue();
        int totalProducts = products.size();
        int productsInStock = 0;
        int productsOutOfStock = 0;
        int lowStockProducts = 0;
        
        for (Product product : products) {
            BigDecimal currentStock = lotService.getTotalStockByProduct(product.getProductId());
            
            if (currentStock.compareTo(BigDecimal.ZERO) > 0) {
                productsInStock++;
                
                // FIXED: Changed getReorderLevel() to getMinStockLevel()
                if (product.getMinStockLevel() != null && 
                    currentStock.compareTo(BigDecimal.valueOf(product.getMinStockLevel())) <= 0) {
                    lowStockProducts++;
                }
            } else {
                productsOutOfStock++;
            }
        }
        
        summary.put("totalProducts", totalProducts);
        summary.put("productsInStock", productsInStock);
        summary.put("productsOutOfStock", productsOutOfStock);
        summary.put("lowStockProducts", lowStockProducts);
        
        return summary;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCategoryWiseStockReport() {
        List<Map<String, Object>> report = new ArrayList<>();
        List<Category> categories = categoryRepository.findByIsActiveTrue();
        
        for (Category category : categories) {
            List<Product> products = productRepository.findByCategoryCategoryId(category.getCategoryId());
            
            int totalProducts = products.size();
            BigDecimal totalStock = BigDecimal.ZERO;
            BigDecimal totalValue = BigDecimal.ZERO;
            
            for (Product product : products) {
                BigDecimal stock = lotService.getTotalStockByProduct(product.getProductId());
                totalStock = totalStock.add(stock);
                
                List<Lot> lots = lotRepository.findActiveLotsByProductForFIFO(product.getProductId());
                for (Lot lot : lots) {
                    BigDecimal lotValue = lot.getRemainingQuantity().multiply(lot.getPurchasePrice());
                    totalValue = totalValue.add(lotValue);
                }
            }
            
            Map<String, Object> categoryData = new HashMap<>();
            categoryData.put("category", category);
            categoryData.put("totalProducts", totalProducts);
            categoryData.put("totalStock", totalStock);
            categoryData.put("totalValue", totalValue);
            
            report.add(categoryData);
        }
        
        return report;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRackWiseStockReport() {
        List<Map<String, Object>> report = new ArrayList<>();
        List<Rack> racks = rackRepository.findByIsActiveTrue();
        
        for (Rack rack : racks) {
            List<Lot> lots = lotRepository.findAll().stream()
                    .filter(lot -> lot.getRack() != null && 
                                   lot.getRack().getRackId().equals(rack.getRackId()) &&
                                   lot.getStatus() == Lot.LotStatus.Active)
                    .toList();
            
            BigDecimal totalStock = BigDecimal.ZERO;
            BigDecimal totalValue = BigDecimal.ZERO;
            int totalItems = lots.size();
            
            for (Lot lot : lots) {
                totalStock = totalStock.add(lot.getRemainingQuantity());
                BigDecimal lotValue = lot.getRemainingQuantity().multiply(lot.getPurchasePrice());
                totalValue = totalValue.add(lotValue);
            }
            
            Map<String, Object> rackData = new HashMap<>();
            rackData.put("rack", rack);
            rackData.put("totalItems", totalItems);
            rackData.put("totalStock", totalStock);
            rackData.put("totalValue", totalValue);
            
            report.add(rackData);
        }
        
        return report;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPriceDifferenceReport() {
        List<Map<String, Object>> report = new ArrayList<>();
        List<Product> products = productRepository.findByIsActiveTrue();
        
        for (Product product : products) {
            List<BigDecimal> prices = lotRepository.findDistinctPricesByProduct(product.getProductId());
            
            if (prices.size() > 1) {
                List<Lot> lots = lotRepository.findActiveLotsByProductForFIFO(product.getProductId());
                
                Map<String, Object> productData = new HashMap<>();
                productData.put("product", product);
                productData.put("differentPrices", prices);
                productData.put("lots", lots);
                productData.put("priceCount", prices.size());
                
                report.add(productData);
            }
        }
        
        return report;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStockValueReport() {
        Map<String, Object> report = new HashMap<>();
        
        List<Lot> activeLots = lotRepository.findAll().stream()
                .filter(lot -> lot.getStatus() == Lot.LotStatus.Active)
                .toList();
        
        BigDecimal totalValue = BigDecimal.ZERO;
        int totalLots = activeLots.size();
        
        for (Lot lot : activeLots) {
            BigDecimal lotValue = lot.getRemainingQuantity().multiply(lot.getPurchasePrice());
            totalValue = totalValue.add(lotValue);
        }
        
        report.put("totalStockValue", totalValue);
        report.put("totalActiveLots", totalLots);
        
        return report;
    }
}