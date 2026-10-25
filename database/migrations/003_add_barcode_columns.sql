USE minimarket_pos;

-- 17. Add barcode metadata columns to products table
ALTER TABLE products
  ADD COLUMN barcode_type ENUM('ean13','ean8','upca','upce','code128') NULL AFTER barcode,
  ADD COLUMN barcode_source ENUM('manufacturer','internal') NULL AFTER barcode_type,
  ADD COLUMN barcode_generated_at DATETIME NULL AFTER barcode_source;
