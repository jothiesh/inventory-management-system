package com.company.inventory.qc.repository;

import com.company.inventory.qc.entity.BatchTimelineEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BatchTimelineRepository extends JpaRepository<BatchTimelineEvent, Long> {

    List<BatchTimelineEvent> findByBatchIdOrderByHappenedAtAsc(Long batchId);

    /** All events for original batch AND all its replacement batches */
    List<BatchTimelineEvent> findByBatchIdInOrderByHappenedAtAsc(List<Long> batchIds);
}