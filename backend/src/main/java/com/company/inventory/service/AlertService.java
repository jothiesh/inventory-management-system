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

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;

    // ========== QUERY METHODS ==========

    @Transactional(readOnly = true)
    public List<Alert> getAllAlerts() {
        return alertRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Alert> getUnreadAlerts() {
        return alertRepository.findByIsReadFalseOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Long getUnreadCount() {
        return alertRepository.countByIsReadFalse();
    }

    @Transactional(readOnly = true)
    public List<Alert> getAlertsByType(Alert.AlertType alertType) {
        return alertRepository.findByAlertTypeOrderByCreatedAtDesc(alertType);
    }

    // ── NEW: get only STOCK_OUT alerts (for Owner + Manager page) ──
    @Transactional(readOnly = true)
    public List<Alert> getStockOutAlerts() {
        return alertRepository.findByAlertTypeOrderByCreatedAtDesc(Alert.AlertType.STOCK_OUT);
    }

    // ========== MARK AS READ ==========

    @Transactional
    public void markAsRead(Long alertId, User user) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found with id: " + alertId));
        alert.setIsRead(true);
        alert.setAcknowledgedAt(LocalDateTime.now());
        alert.setAcknowledgedBy(user);
        alertRepository.save(alert);
        log.info("Alert {} marked as read by {}", alertId,
                user != null ? user.getUsername() : "unknown");
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
        log.info("Marked {} alerts as read by {}", unreadAlerts.size(),
                user != null ? user.getUsername() : "unknown");
    }

    // ── NEW: mark all stock-out alerts as read ──
    @Transactional
    public void markAllStockOutAsRead(User user) {
        List<Alert> stockOutAlerts = alertRepository
                .findByAlertTypeOrderByCreatedAtDesc(Alert.AlertType.STOCK_OUT)
                .stream().filter(a -> !a.getIsRead()).toList();
        for (Alert alert : stockOutAlerts) {
            alert.setIsRead(true);
            alert.setAcknowledgedAt(LocalDateTime.now());
            alert.setAcknowledgedBy(user);
        }
        alertRepository.saveAll(stockOutAlerts);
        log.info("Marked {} stock-out alerts as read by {}", stockOutAlerts.size(),
                user != null ? user.getUsername() : "unknown");
    }

    // ========== CREATE ALERTS ==========

    @Transactional
    public Alert createLowStockAlert(Product product, BigDecimal currentStock) {
        String message = String.format(
                "Low stock alert for %s (%s). Current Stock: %s, Min Level: %s",
                product.getPartNumber(), product.getDescription(),
                currentStock,
                product.getMinStockLevel() != null ? product.getMinStockLevel() : "Not Set"
        );
        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.LOW_STOCK);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.HIGH);
        alert.setMessage(message);
        alert.setIsRead(false);
        return alertRepository.save(alert);
    }

    @Transactional
    public Alert createPriceDifferenceAlert(Product product, BigDecimal oldPrice,
                                            BigDecimal newPrice, BigDecimal diffPercentage) {
        String direction = newPrice.compareTo(oldPrice) > 0 ? "increased" : "decreased";
        String message = String.format(
                "Price %s by %.2f%% for %s (%s): Old: ₹%s, New: ₹%s",
                direction, diffPercentage,
                product.getPartNumber(), product.getDescription(),
                oldPrice, newPrice
        );
        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.PRICE_CHANGE);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.MEDIUM);
        alert.setMessage(message);
        alert.setIsRead(false);
        return alertRepository.save(alert);
    }

    @Transactional
    public Alert createDeadStockAlert(Product product, long monthsNoMovement) {
        String message = String.format(
                "Dead stock detected: %s (%s) - No movement for %d months",
                product.getPartNumber(), product.getDescription(), monthsNoMovement
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
    public Alert createSlowMovingAlert(Product product, long monthsNoMovement) {
        String message = String.format(
                "Slow moving stock: %s (%s) - No movement for %d months",
                product.getPartNumber(), product.getDescription(), monthsNoMovement
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
    public Alert createExcessStockAlert(Product product, BigDecimal currentStock,
                                        BigDecimal maxStockLevel) {
        String message = String.format(
                "Excess stock alert for %s (%s). Current Stock: %s, Max Level: %s",
                product.getPartNumber(), product.getDescription(),
                currentStock, maxStockLevel != null ? maxStockLevel : "Not Set"
        );
        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.EXCESS_STOCK);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.LOW);
        alert.setMessage(message);
        alert.setIsRead(false);
        return alertRepository.save(alert);
    }

    @Transactional
    public Alert createNewProductAlert(Product product) {
        String message = String.format("New product added: %s (%s)",
                product.getPartNumber(), product.getDescription());
        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.NEW_PRODUCT);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.LOW);
        alert.setMessage(message);
        alert.setIsRead(false);
        return alertRepository.save(alert);
    }

    @Transactional
    public Alert createStockAddedAlert(Product product, BigDecimal quantity, BigDecimal newTotal) {
        String message = String.format(
                "Stock added: %s units of %s (%s). New total: %s",
                quantity, product.getPartNumber(), product.getDescription(), newTotal
        );
        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.STOCK_ADDED);
        alert.setProduct(product);
        alert.setSeverity(Alert.Severity.LOW);
        alert.setMessage(message);
        alert.setIsRead(false);
        return alertRepository.save(alert);
    }

    @Transactional
    public Alert createCategoryAddedAlert(Category category) {
        String message = String.format("New category created: %s (%s)",
                category.getCategoryName(), category.getCategoryCode());
        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.CATEGORY_ADDED);
        alert.setSeverity(Alert.Severity.LOW);
        alert.setMessage(message);
        alert.setIsRead(false);
        return alertRepository.save(alert);
    }

    // ── NEW: Stock OUT alert — fires for ALL transaction types ──
    @Transactional
    public Alert createStockOutAlert(Product product, BigDecimal quantity,
                                     String transactionType, String referenceNumber,
                                     String issuedBy) {
        String message = String.format(
                "Stock OUT: %s units of %s (%s) | Type: %s | Ref: %s | By: %s",
                quantity.toPlainString(),
                product.getPartNumber(),
                product.getDescription(),
                transactionType,
                referenceNumber != null ? referenceNumber : "—",
                issuedBy
        );

        Alert.Severity severity = switch (transactionType) {
            case "Scrap"  -> Alert.Severity.HIGH;
            case "Damage" -> Alert.Severity.MEDIUM;
            default       -> Alert.Severity.LOW;
        };

        Alert alert = new Alert();
        alert.setAlertType(Alert.AlertType.STOCK_OUT);
        alert.setProduct(product);
        alert.setSeverity(severity);
        alert.setMessage(message);
        alert.setIsRead(false);

        Alert saved = alertRepository.save(alert);
        log.info("StockOutAlert created. ID: {}, Type: {}, Product: {}",
                saved.getAlertId(), transactionType, product.getPartNumber());
        return saved;
    }

    // ========== CLEAR ALERTS ==========

    @Transactional
    public void clearLowStockAlert(Product product) {
        try {
            List<Alert> alerts = alertRepository.findByAlertTypeOrderByCreatedAtDesc(
                    Alert.AlertType.LOW_STOCK);
            alerts.stream()
                    .filter(a -> a.getProduct() != null
                            && a.getProduct().getProductId().equals(product.getProductId())
                            && !a.getIsRead())
                    .forEach(a -> {
                        a.setIsRead(true);
                        a.setAcknowledgedAt(LocalDateTime.now());
                        alertRepository.save(a);
                    });
        } catch (Exception e) {
            log.error("Error clearing low stock alert for product {}: {}",
                    product.getPartNumber(), e.getMessage());
        }
    }
}