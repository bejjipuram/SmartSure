-- Add InsuredDeclaredValue to Policies table
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Policies' AND COLUMN_NAME = 'InsuredDeclaredValue'
)
BEGIN
    ALTER TABLE Policies ADD InsuredDeclaredValue decimal(18,2) NOT NULL DEFAULT 0;
    PRINT 'Added InsuredDeclaredValue to Policies';
END
ELSE
    PRINT 'InsuredDeclaredValue already exists';

-- Add ListedPrice to VehicleDetails table
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'VehicleDetails' AND COLUMN_NAME = 'ListedPrice'
)
BEGIN
    ALTER TABLE VehicleDetails ADD ListedPrice decimal(18,2) NOT NULL DEFAULT 0;
    PRINT 'Added ListedPrice to VehicleDetails';
END
ELSE
    PRINT 'ListedPrice already exists';
