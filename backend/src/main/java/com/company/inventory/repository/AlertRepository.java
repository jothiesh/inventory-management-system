package com.company.inventory.repository;

import com.company.inventory.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByIsReadFalseOrderByCreatedAtDesc();
    List<Alert> findByAlertTypeOrderByCreatedAtDesc(Alert.AlertType alertType);
    Long countByIsReadFalse();
}