package com.company.inventory.service;

import com.company.inventory.entity.Alert;
import com.company.inventory.entity.Category;
import com.company.inventory.entity.Product;
import com.company.inventory.entity.User;
import com.company.inventory.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;

    @Transactional(readOnly = true)
    public List<Alert> getAllAlerts() {
        return alertRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Alert> getUnreadAlerts() {
        return alertRepository.findByIsReadFalseOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Long getUnreadAlertsCount() {
        return alertRepository.countByIsReadFalse();
    }

    @Transactional(readOnly = true)
    public List<Alert> getAlertsByType(Alert.AlertType type) {
        return alertRepository.findByAlertTypeOrderByCreatedAtDesc(type);
    }

    // ✅ NEW: Generic save method
    @Transactional
    public Alert saveAlert(Alert alert) {
        return alertRepository.save(alert);
    }

    @Transactional
    public Alert createPriceDifferenceAlert(Product product, BigDecimal newPrice, List<BigDecimal> existingPrices) {
        String priceList = existingPrices.stream()
                .map(price -> String.format("₹%.2f", price))
                .collect(Collectors.joining(", "));
        
        String message = String.format(
                "Price difference detected for %s (%s). New Price: ₹%.2f, Existing Prices: %s",
                product.getPartNumber(),
                product.getDescription(),
                newPrice,
                priceList
        );

        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.PRICE_CHANGE);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.HIGH);
        alert.setMessage(message);
        alert.setIsRead(false);

        return alertRepository.save(alert);
    }

    @Transactional
    public Alert createLowStockAlert(Product product, BigDecimal currentStock) {
        String message = String.format(
                "Low stock alert for %s (%s). Current Stock: %s, Min Level: %s",
                product.getPartNumber(),
                product.getDescription(),
                currentStock,
                product.getMinStockLevel()
        );

        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.LOW_STOCK);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.MEDIUM);
        alert.setMessage(message);
        alert.setIsRead(false);

        return alertRepository.save(alert);
    }

    @Transactional
    public Alert createDeadStockAlert(Product product, int monthsNoMovement, BigDecimal blockedValue) {
        String message = String.format(
                "Dead stock detected for %s (%s). No movement for %d months. Value blocked: ₹%s",
                product.getPartNumber(),
                product.getDescription(),
                monthsNoMovement,
                blockedValue
        );

        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.DEAD_STOCK);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.HIGH);
        alert.setMessage(message);
        alert.setIsRead(false);

        return alertRepository.save(alert);
    }

    @Transactional
    public Alert createSlowMovingAlert(Product product, int monthsNoMovement) {
        String message = String.format(
                "Slow moving stock for %s (%s). No movement for %d months",
                product.getPartNumber(),
                product.getDescription(),
                monthsNoMovement
        );

        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.SLOW_MOVING);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.MEDIUM);
        alert.setMessage(message);
        alert.setIsRead(false);

        return alertRepository.save(alert);
    }
    
    @Transactional
    public Alert createExcessStockAlert(Product product, BigDecimal currentStock, BigDecimal maxStockLevel) {
        String message = String.format(
                "Excess stock alert for %s (%s). Current Stock: %s, Max Level: %s",
                product.getPartNumber(),
                product.getDescription(),
                currentStock,
                maxStockLevel != null ? maxStockLevel : "Not Set"
        );

        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.EXCESS_STOCK);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.LOW);
        alert.setMessage(message);
        alert.setIsRead(false);

        return alertRepository.save(alert);
    }

    // ✅ NEW: Create alert for new product
    @Transactional
    public Alert createNewProductAlert(Product product) {
        String message = String.format(
                "New product added: %s (%s) - Category: %s",
                product.getPartNumber(),
                product.getDescription(),
                product.getCategory() != null ? product.getCategory().getCategoryName() : "Uncategorized"
        );

        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.NEW_PRODUCT);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.LOW);
        alert.setMessage(message);
        alert.setIsRead(false);

        log.info("Creating NEW_PRODUCT alert for: {}", product.getPartNumber());
        return alertRepository.save(alert);
    }

    // ✅ NEW: Create alert for stock addition
    @Transactional
    public Alert createStockAddedAlert(Product product, BigDecimal quantity, BigDecimal totalStock) {
        String message = String.format(
                "Stock added: %s units of %s (%s). New total: %s",
                quantity,
                product.getPartNumber(),
                product.getDescription(),
                totalStock
        );

        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.STOCK_ADDED);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.LOW);
        alert.setMessage(message);
        alert.setIsRead(false);

        log.info("Creating STOCK_ADDED alert for: {}", product.getPartNumber());
        return alertRepository.save(alert);
    }

    // ✅ NEW: Create alert for new category
    @Transactional
    public Alert createCategoryAddedAlert(Category category) {
        String message = String.format(
                "New category created: %s (%s)",
                category.getCategoryName(),
                category.getCategoryCode()
        );

        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.CATEGORY_ADDED);
        alert.setCategory(category);
        alert.setSeverity(Alert.Severity.LOW);
        alert.setMessage(message);
        alert.setIsRead(false);

        log.info("Creating CATEGORY_ADDED alert for: {}", category.getCategoryName());
        return alertRepository.save(alert);
    }

    @Transactional
    public void markAsRead(Long alertId, User user) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        
        alert.setIsRead(true);
        alert.setAcknowledgedAt(LocalDateTime.now());
        alert.setAcknowledgedBy(user);
        
        alertRepository.save(alert);
    }

    @Transactional
    public void markAllAsRead(User user) {
        List<Alert> unreadAlerts = getUnreadAlerts();
        for (Alert alert : unreadAlerts) {
            alert.setIsRead(true);
            alert.setAcknowledgedAt(LocalDateTime.now());
            alert.setAcknowledgedBy(user);
        }
        alertRepository.saveAll(unreadAlerts);
    }
}