package com.company.inventory.repository;

import com.company.inventory.entity.DeliveryChallanEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeliveryChallanEventRepository extends JpaRepository<DeliveryChallanEvent, Long> {

    List<DeliveryChallanEvent> findByDcIdOrderByHappenedAtAsc(Long dcId);
}