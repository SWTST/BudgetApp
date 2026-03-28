-- ============================================================
-- Migration: 002 - Seed Categories
-- Description: Inserts default parent and child categories
-- Author: Steven Wyatt
-- Date: 2026-03-28
-- Notes:
--   - Run after 001_initial_schema.sql
--   - DisplayOrder uses increments of 10 to leave room for reordering
--   - 'Uncategorised' under Other is the default for unmatched imports
--   - 'Account Transfers' under Other pairs with the IsTransfer flag
--     on Ledger.Transactions to exclude from spending calculations
-- ============================================================

BEGIN TRANSACTION;

BEGIN TRY

    -- --------------------------------------------------------
    -- Parent Categories
    -- --------------------------------------------------------

    INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
    VALUES
        ('Income',                  NULL, 10),
        ('Housing',                 NULL, 20),
        ('Food & Drink',            NULL, 30),
        ('Transport',               NULL, 40),
        ('Bills & Subscriptions',   NULL, 50),
        ('Personal',                NULL, 60),
        ('Lifestyle',               NULL, 70),
        ('Financial',               NULL, 80),
        ('Shopping',                NULL, 90),
        ('Pets',                    NULL, 100),
        ('Other',                   NULL, 110);


    -- --------------------------------------------------------
    -- Child Categories
    -- Parent IDs are looked up by name to avoid hardcoding
    -- identity values
    -- --------------------------------------------------------

    -- Income
    INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
    SELECT  child.Name,
            p.CategoryId,
            child.DisplayOrder
    FROM    (VALUES
                ('Salary',                  10),
                ('Freelance / Side Income', 20),
                ('Refunds',                 30),
                ('Other Income',            40)
            ) AS child (Name, DisplayOrder)
    CROSS JOIN (SELECT CategoryId FROM App.Categories WHERE Name = 'Income' AND ParentCategoryId IS NULL) AS p;

    -- Housing
    INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
    SELECT  child.Name,
            p.CategoryId,
            child.DisplayOrder
    FROM    (VALUES
                ('Rent / Mortgage',         10),
                ('Council Tax',             20),
                ('Utilities (Gas/Electric)',30),
                ('Water',                   40),
                ('Home Insurance',          50),
                ('Maintenance / Repairs',   60)
            ) AS child (Name, DisplayOrder)
    CROSS JOIN (SELECT CategoryId FROM App.Categories WHERE Name = 'Housing' AND ParentCategoryId IS NULL) AS p;

    -- Food & Drink
    INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
    SELECT  child.Name,
            p.CategoryId,
            child.DisplayOrder
    FROM    (VALUES
                ('Groceries',           10),
                ('Eating Out',          20),
                ('Takeaway / Delivery', 30),
                ('Coffee / Snacks',     40)
            ) AS child (Name, DisplayOrder)
    CROSS JOIN (SELECT CategoryId FROM App.Categories WHERE Name = 'Food & Drink' AND ParentCategoryId IS NULL) AS p;

    -- Transport
    INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
    SELECT  child.Name,
            p.CategoryId,
            child.DisplayOrder
    FROM    (VALUES
                ('Fuel',                10),
                ('Car Insurance',       20),
                ('Car Maintenance',     30),
                ('Public Transport',    40),
                ('Parking',             50),
                ('Taxi / Rideshare',    60)
            ) AS child (Name, DisplayOrder)
    CROSS JOIN (SELECT CategoryId FROM App.Categories WHERE Name = 'Transport' AND ParentCategoryId IS NULL) AS p;

    -- Bills & Subscriptions
    INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
    SELECT  child.Name,
            p.CategoryId,
            child.DisplayOrder
    FROM    (VALUES
                ('Mobile Phone',        10),
                ('Internet / Broadband',20),
                ('TV Streaming',        30),
                ('Music Streaming',     40),
                ('Software / Apps',     50),
                ('Gym',                 60)
            ) AS child (Name, DisplayOrder)
    CROSS JOIN (SELECT CategoryId FROM App.Categories WHERE Name = 'Bills & Subscriptions' AND ParentCategoryId IS NULL) AS p;

    -- Personal
    INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
    SELECT  child.Name,
            p.CategoryId,
            child.DisplayOrder
    FROM    (VALUES
                ('Clothing',            10),
                ('Haircare / Grooming', 20),
                ('Health / Medical',    30),
                ('Prescriptions',       40)
            ) AS child (Name, DisplayOrder)
    CROSS JOIN (SELECT CategoryId FROM App.Categories WHERE Name = 'Personal' AND ParentCategoryId IS NULL) AS p;

    -- Lifestyle
    INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
    SELECT  child.Name,
            p.CategoryId,
            child.DisplayOrder
    FROM    (VALUES
                ('Entertainment',       10),
                ('Hobbies',             20),
                ('Gifts',               30),
                ('Holidays / Travel',   40)
            ) AS child (Name, DisplayOrder)
    CROSS JOIN (SELECT CategoryId FROM App.Categories WHERE Name = 'Lifestyle' AND ParentCategoryId IS NULL) AS p;

    -- Financial
    INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
    SELECT  child.Name,
            p.CategoryId,
            child.DisplayOrder
    FROM    (VALUES
                ('Debt Repayment',      10),
                ('Savings',             20),
                ('Bank Fees / Charges', 30),
                ('Interest Paid',       40)
            ) AS child (Name, DisplayOrder)
    CROSS JOIN (SELECT CategoryId FROM App.Categories WHERE Name = 'Financial' AND ParentCategoryId IS NULL) AS p;

    -- Shopping
    INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
    SELECT  child.Name,
            p.CategoryId,
            child.DisplayOrder
    FROM    (VALUES
                ('Online (General)',    10),
                ('Household Items',     20),
                ('Electronics',         30)
            ) AS child (Name, DisplayOrder)
    CROSS JOIN (SELECT CategoryId FROM App.Categories WHERE Name = 'Shopping' AND ParentCategoryId IS NULL) AS p;
    
    -- Pets
        INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
        SELECT  child.Name,
                p.CategoryId,
                child.DisplayOrder
        FROM    (VALUES
                ('Food',                10),
                ('Vet / Medical',       20),
                ('Insurance',           30),
                ('Grooming',            40),
                ('Accessories / Toys',  50)
                ) AS child (Name, DisplayOrder)
        CROSS JOIN (SELECT CategoryId FROM App.Categories WHERE Name = 'Pets' AND ParentCategoryId IS NULL) AS p;

    -- Other
    INSERT INTO App.Categories (Name, ParentCategoryId, DisplayOrder)
    SELECT  child.Name,
            p.CategoryId,
            child.DisplayOrder
    FROM    (VALUES
                ('Uncategorised',       10),    -- default assignment for unmatched imports
                ('Cash Withdrawals',    20),
                ('Account Transfers',   30)     -- pair with IsTransfer flag on Ledger.Transactions
            ) AS child (Name, DisplayOrder)
    CROSS JOIN (SELECT CategoryId FROM App.Categories WHERE Name = 'Other' AND ParentCategoryId IS NULL) AS p;


    COMMIT TRANSACTION;

END TRY
BEGIN CATCH

    ROLLBACK TRANSACTION;

    THROW;

END CATCH;
