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
        log.debug("Querying data schema table structures to list all existing box records.");
        return boxRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Box> getActiveBoxes() {
        log.debug("Filtering database elements mapping exclusively active physical warehouse box units.");
        return boxRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public List<Box> getBoxesByRack(Long rackId) {
        log.debug("Filtering box tracking configurations for foreign key Rack constraint ID: {}", rackId);
        return boxRepository.findByRackRackId(rackId);
    }

    @Transactional(readOnly = true)
    public Box getBoxById(Long id) {
        log.debug("Looking up target profile definitions for physical location Box unit node ID: {}", id);
        return boxRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Box resource indexing lookup fault matching target identification tag: {}", id);
                    return new ResourceNotFoundException("Box not found with id: " + id);
                });
    }

    @Transactional
    public Box createBox(Long rackId, String boxNumber, String boxLabel, User currentUser) {
        log.info("Attempting allocation registration for new Box compartment. Target Rack ID: {}, Box Number: '{}', Label: '{}'", 
                rackId, boxNumber, boxLabel);
        
        Rack rack = rackService.getRackById(rackId);

        if (boxRepository.existsByRackRackIdAndBoxNumber(rackId, boxNumber)) {
            log.error("Aborting storage creation: Box identification reference code '{}' already exists inside destination Rack location context ID: {}", 
                    boxNumber, rackId);
            throw new DuplicateResourceException("Box number already exists in this rack: " + boxNumber);
        }

        Box box = new Box();
        box.setRack(rack);
        box.setBoxNumber(boxNumber);
        box.setBoxLabel(boxLabel);
        box.setIsActive(true);
        box.setCreatedBy(currentUser);

        Box savedBox = boxRepository.save(box);
        log.info("New physical subline box compartment registered inside master schemas database. Auto ID assigned: {}", savedBox.getBoxId());
        return savedBox;
    }

    @Transactional
    public Box updateBox(Long id, String boxNumber, String boxLabel) {
        log.info("Processing proposed mutation data updates overlay against layout container target tracking reference Box ID: {}", id);
        Box box = getBoxById(id);

        if (!box.getBoxNumber().equals(boxNumber) &&
            boxRepository.existsByRackRackIdAndBoxNumber(box.getRack().getRackId(), boxNumber)) {
            log.error("Aborting storage modification pipeline: Box number substitution update configuration '{}' overlaps another data item inside parent Rack ID: {}", 
                    boxNumber, box.getRack().getRackId());
            throw new DuplicateResourceException("Box number already exists in this rack: " + boxNumber);
        }

        log.debug("Applying mutation properties changes to Box record ID: {}", id);
        box.setBoxNumber(boxNumber);
        box.setBoxLabel(boxLabel);

        Box updatedBox = boxRepository.save(box);
        log.info("Properties mutation parameters updated successfully against schema indices configuration tracker Box node ID: {}", id);
        return updatedBox;
    }

    @Transactional
    public void deleteBox(Long id) {
        log.warn("Triggering storage soft-decommissioning flag logic operations against bucket profile item node ID: {}", id);
        Box box = getBoxById(id);
        box.setIsActive(false);
        boxRepository.save(box);
        log.info("Soft-decommission process status update flag handled successfully on target node index context: {}. [isActive=false]", id);
    }

    @Transactional
    public void initializeDefaultBoxes(User systemUser) {
        log.info("Evaluating warehouse configuration setup profiles layer verification checkpoint: Checking baseline subline storage boxes matrices.");
        List<Rack> racks = rackService.getActiveRacks();
        log.debug("Retrieved {} active framework rack structures to establish default box indices against.", racks.size());

        int initializedCount = 0;
        for (Rack rack : racks) {
            for (int i = 1; i <= 5; i++) {
                String boxNumber = "B" + i;
                if (!boxRepository.existsByRackRackIdAndBoxNumber(rack.getRackId(), boxNumber)) {
                    log.trace("Seeding data row allocation placeholder inside database layers index configuration mapping for: Rack '{}' -> Box '{}'", rack.getRackNumber(), boxNumber);
                    createBox(rack.getRackId(), boxNumber, rack.getRackName() + " - Box " + i, systemUser);
                    initializedCount++;
                }
            }
        }
        log.info("Operational box layout space seeding evaluation process complete. Fresh seed containers deployed into context thread loops: {}", initializedCount);
    }
}