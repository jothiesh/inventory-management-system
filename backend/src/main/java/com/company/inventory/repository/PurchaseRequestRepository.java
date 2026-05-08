package com.company.inventory.repository;

import com.company.inventory.entity.PurchaseRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseRequestRepository extends JpaRepository<PurchaseRequest, Long> {

    Optional<PurchaseRequest> findByPrCode(String prCode);

    List<PurchaseRequest> findAllByOrderByCreatedAtDesc();

    // Used for sequential fallback — not needed for timestamp code
    // but kept for safety
    @Query("SELECT COALESCE(MAX(p.id), 0) FROM PurchaseRequest p")
    Long findMaxId();
}
