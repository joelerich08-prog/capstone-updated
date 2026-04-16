ALTER TABLE inventory_levels
    CHANGE COLUMN reorderLevel shelfRestockLevel INT NOT NULL DEFAULT 0,
    ADD COLUMN retailRestockLevel INT NOT NULL DEFAULT 0;
