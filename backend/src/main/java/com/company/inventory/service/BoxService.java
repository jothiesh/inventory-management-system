package com.company.inventory.service;

import com.company.inventory.entity.Box;
import com.company.inventory.entity.Rack;
import com.company.inventory.entity.User;
import com.company.inventory.exception.DuplicateResourceException;
import com.company.inventory.exception.ResourceNotFoundException;
import com.company.inventory.repository.BoxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BoxService {

    private final BoxRepository boxRepository;
    private final RackService rackService;

    @Transactional(readOnly = true)
    public List<Box> getAllBoxes() {
        return boxRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Box> getActiveBoxes() {
        return boxRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public List<Box> getBoxesByRack(Long rackId) {
        return boxRepository.findByRackRackId(rackId);
    }

    @Transactional(readOnly = true)
    public Box getBoxById(Long id) {
        return boxRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Box not found with id: " + id));
    }

    // AUTO-GENERATE: next B<n> within the given rack. Scans all boxes of the
    // rack (incl. soft-deleted, since uniqueness check covers them) for
    // pattern B<n>, returns B<max+1>.
    private String generateNextBoxNumber(Long rackId) {
        int max = 0;
        for (Box b : boxRepository.findByRackRackId(rackId)) {
            String num = b.getBoxNumber();
            if (num != null && num.matches("B\\d+")) {
                max = Math.max(max, Integer.parseInt(num.substring(1)));
            }
        }
        return "B" + (max + 1);
    }

    @Transactional
    public Box createBox(Long rackId, String boxNumber, String boxLabel, User currentUser) {
        Rack rack = rackService.getRackById(rackId);

        // CHANGED: boxNumber is now optional — auto-generated per rack when blank
        if (boxNumber == null || boxNumber.isBlank()) {
            boxNumber = generateNextBoxNumber(rackId);
            log.info("Auto-generated box number: {} for rack {}", boxNumber, rackId);
        } else if (boxRepository.existsByRackRackIdAndBoxNumber(rackId, boxNumber)) {
            throw new DuplicateResourceException("Box number already exists in this rack: " + boxNumber);
        }

        Box box = new Box();
        box.setRack(rack);
        box.setBoxNumber(boxNumber);
        box.setBoxLabel(boxLabel);
        box.setIsActive(true);
        box.setCreatedBy(currentUser);

        return boxRepository.save(box);
    }

    @Transactional
    public Box updateBox(Long id, String boxNumber, String boxLabel) {
        Box box = getBoxById(id);

        // CHANGED: blank boxNumber on update = keep existing number
        if (boxNumber == null || boxNumber.isBlank()) {
            boxNumber = box.getBoxNumber();
        }

        if (!box.getBoxNumber().equals(boxNumber) &&
            boxRepository.existsByRackRackIdAndBoxNumber(box.getRack().getRackId(), boxNumber)) {
            throw new DuplicateResourceException("Box number already exists in this rack: " + boxNumber);
        }

        box.setBoxNumber(boxNumber);
        box.setBoxLabel(boxLabel);

        return boxRepository.save(box);
    }

    @Transactional
    public void deleteBox(Long id) {
        Box box = getBoxById(id);
        box.setIsActive(false);
        boxRepository.save(box);
    }

    @Transactional
    public void initializeDefaultBoxes(User systemUser) {
        List<Rack> racks = rackService.getActiveRacks();

        int initializedCount = 0;
        for (Rack rack : racks) {
            for (int i = 1; i <= 5; i++) {
                String boxNumber = "B" + i;
                if (!boxRepository.existsByRackRackIdAndBoxNumber(rack.getRackId(), boxNumber)) {
                    createBox(rack.getRackId(), boxNumber, rack.getRackName() + " - Box " + i, systemUser);
                    initializedCount++;
                }
            }
        }
        log.info("Default box seeding complete. Created: {}", initializedCount);
    }
}