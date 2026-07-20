package com.company.inventory.repository;

import com.company.inventory.entity.DeliveryChallan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryChallanRepository extends JpaRepository<DeliveryChallan, Long> {

    boolean existsByDcNumber(String dcNumber);

    long countByDcNumberStartingWith(String prefix);

    List<DeliveryChallan> findAllByOrderByCreatedAtDesc();

    List<DeliveryChallan> findByStatusOrderByCreatedAtDesc(String status);

    long countByStatus(String status);

    @Query("SELECT c FROM DeliveryChallan c LEFT JOIN FETCH c.items WHERE c.id = :id")
    Optional<DeliveryChallan> findByIdWithItems(@Param("id") Long id);
}
