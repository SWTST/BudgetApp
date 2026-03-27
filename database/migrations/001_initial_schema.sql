-- ============================================================
-- Migration: 001 - Initial Schema
-- Description: Creates schemas and all core tables
-- Author: Steven Wyatt
-- Date: 2026-03-27
-- ============================================================

-- ============================================================
-- Schemas
-- ============================================================

CREATE SCHEMA App;
GO

CREATE SCHEMA Mapping;
GO

CREATE SCHEMA Ledger;
GO


-- ============================================================
-- App Schema
-- User-managed configuration: categories and monthly budgets
-- ============================================================

CREATE TABLE App.Categories (
    CategoryId          INT             IDENTITY(1,1)   NOT NULL,
    ParentCategoryId    INT                             NULL,           -- NULL = top-level parent
    Name                NVARCHAR(100)                   NOT NULL,
    DisplayOrder        INT                             NOT NULL    CONSTRAINT DF_Categories_DisplayOrder   DEFAULT 0,
    IsActive            BIT                             NOT NULL    CONSTRAINT DF_Categories_IsActive       DEFAULT 1,
    CreatedAt           DATETIME2(0)                    NOT NULL    CONSTRAINT DF_Categories_CreatedAt      DEFAULT GETUTCDATE(),

    CONSTRAINT PK_Categories            PRIMARY KEY (CategoryId),
    CONSTRAINT FK_Categories_Parent     FOREIGN KEY (ParentCategoryId) REFERENCES App.Categories (CategoryId),
    CONSTRAINT UQ_Categories_Name       UNIQUE (ParentCategoryId, Name)
    -- Note: SQL Server treats NULLs as distinct in UNIQUE constraints, so multiple top-level
    -- categories with the same name are theoretically possible. Acceptable for this use case.
);
GO


CREATE TABLE App.Budgets (
    BudgetId        INT             IDENTITY(1,1)   NOT NULL,
    CategoryId      INT                             NOT NULL,
    BudgetYear      SMALLINT                        NOT NULL,
    BudgetMonth     TINYINT                         NOT NULL,
    AmountPence     INT                             NOT NULL,
    CreatedAt       DATETIME2(0)                    NOT NULL    CONSTRAINT DF_Budgets_CreatedAt     DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2(0)                    NOT NULL    CONSTRAINT DF_Budgets_UpdatedAt     DEFAULT GETUTCDATE(),

    CONSTRAINT PK_Budgets               PRIMARY KEY (BudgetId),
    CONSTRAINT FK_Budgets_Category      FOREIGN KEY (CategoryId) REFERENCES App.Categories (CategoryId),
    CONSTRAINT UQ_Budgets_Period        UNIQUE (CategoryId, BudgetYear, BudgetMonth),
    CONSTRAINT CK_Budgets_Month         CHECK (BudgetMonth BETWEEN 1 AND 12),
    CONSTRAINT CK_Budgets_Year          CHECK (BudgetYear BETWEEN 2000 AND 2100),
    CONSTRAINT CK_Budgets_Amount        CHECK (AmountPence >= 0)
);
GO


-- ============================================================
-- Mapping Schema
-- Auto-categorisation rules: maps merchant patterns to categories
-- ============================================================

CREATE TABLE Mapping.MerchantRules (
    RuleId          INT             IDENTITY(1,1)   NOT NULL,
    Pattern         NVARCHAR(200)                   NOT NULL,       -- e.g. 'TESCO%', 'UBER *EATS%'
    CategoryId      INT                             NOT NULL,
    Priority        INT                             NOT NULL    CONSTRAINT DF_MerchantRules_Priority    DEFAULT 0,
    IsActive        BIT                             NOT NULL    CONSTRAINT DF_MerchantRules_IsActive    DEFAULT 1,
    CreatedAt       DATETIME2(0)                    NOT NULL    CONSTRAINT DF_MerchantRules_CreatedAt   DEFAULT GETUTCDATE(),

    CONSTRAINT PK_MerchantRules             PRIMARY KEY (RuleId),
    CONSTRAINT FK_MerchantRules_Category    FOREIGN KEY (CategoryId) REFERENCES App.Categories (CategoryId)
);
GO


-- ============================================================
-- Ledger Schema
-- Financial records: accounts, import audit trail, transactions
-- ============================================================

CREATE TABLE Ledger.Accounts (
    AccountId       INT             IDENTITY(1,1)   NOT NULL,
    AccountName     NVARCHAR(100)                   NOT NULL,
    BankName        NVARCHAR(100)                   NOT NULL,
    AccountType     NVARCHAR(20)                    NOT NULL,
    IsActive        BIT                             NOT NULL    CONSTRAINT DF_Accounts_IsActive     DEFAULT 1,
    CreatedAt       DATETIME2(0)                    NOT NULL    CONSTRAINT DF_Accounts_CreatedAt    DEFAULT GETUTCDATE(),

    CONSTRAINT PK_Accounts          PRIMARY KEY (AccountId),
    CONSTRAINT CK_Accounts_Type     CHECK (AccountType IN ('Current', 'Savings', 'Credit', 'Cash'))
);
GO


CREATE TABLE Ledger.ImportBatches (
    BatchId         INT             IDENTITY(1,1)   NOT NULL,
    AccountId       INT                             NOT NULL,
    FileName        NVARCHAR(255)                   NOT NULL,
    ImportedAt      DATETIME2(0)                    NOT NULL    CONSTRAINT DF_ImportBatches_ImportedAt  DEFAULT GETUTCDATE(),
    RowCount        INT                             NOT NULL    CONSTRAINT DF_ImportBatches_RowCount    DEFAULT 0,
    Status          NVARCHAR(20)                    NOT NULL    CONSTRAINT DF_ImportBatches_Status      DEFAULT 'Pending',

    CONSTRAINT PK_ImportBatches             PRIMARY KEY (BatchId),
    CONSTRAINT FK_ImportBatches_Account     FOREIGN KEY (AccountId) REFERENCES Ledger.Accounts (AccountId),
    CONSTRAINT CK_ImportBatches_Status      CHECK (Status IN ('Pending', 'Complete', 'Failed'))
);
GO


CREATE TABLE Ledger.Transactions (
    TransactionId       INT             IDENTITY(1,1)   NOT NULL,
    AccountId           INT                             NOT NULL,
    BatchId             INT                             NOT NULL,
    TransactionDate     DATE                            NOT NULL,
    Description         NVARCHAR(500)                   NOT NULL,   -- raw text from bank, unmodified
    AmountPence         INT                             NOT NULL,   -- positive = credit, negative = debit
    TransactionType     NVARCHAR(10)                    NULL,       -- Lloyds codes: DD, FPO, DEB, CPT, TFR, etc.
    CategoryId          INT                             NULL,       -- NULL = uncategorised, pending manual review
    IsTransfer          BIT                             NOT NULL    CONSTRAINT DF_Transactions_IsTransfer   DEFAULT 0,
    ImportHash          CHAR(64)                        NOT NULL,   -- SHA256(AccountId + TransactionDate + Description + AmountPence)
    CreatedAt           DATETIME2(0)                    NOT NULL    CONSTRAINT DF_Transactions_CreatedAt    DEFAULT GETUTCDATE(),
    UpdatedAt           DATETIME2(0)                    NOT NULL    CONSTRAINT DF_Transactions_UpdatedAt    DEFAULT GETUTCDATE(),

    CONSTRAINT PK_Transactions              PRIMARY KEY (TransactionId),
    CONSTRAINT FK_Transactions_Account      FOREIGN KEY (AccountId)     REFERENCES Ledger.Accounts (AccountId),
    CONSTRAINT FK_Transactions_Batch        FOREIGN KEY (BatchId)       REFERENCES Ledger.ImportBatches (BatchId),
    CONSTRAINT FK_Transactions_Category     FOREIGN KEY (CategoryId)    REFERENCES App.Categories (CategoryId),
    CONSTRAINT UQ_Transactions_Hash         UNIQUE (ImportHash)
);
GO


-- ============================================================
-- Indexes
-- ============================================================

-- Monthly transaction queries: account + date range (most common read pattern)
CREATE NONCLUSTERED INDEX IX_Transactions_Account_Date
    ON Ledger.Transactions (AccountId, TransactionDate)
    INCLUDE (AmountPence, CategoryId, IsTransfer);
GO

-- Budget vs actual calculations: aggregate by category
CREATE NONCLUSTERED INDEX IX_Transactions_Category_Date
    ON Ledger.Transactions (CategoryId, TransactionDate)
    INCLUDE (AmountPence, IsTransfer);
GO

-- Rule matching on import: active rules ordered by priority
CREATE NONCLUSTERED INDEX IX_MerchantRules_Active_Priority
    ON Mapping.MerchantRules (IsActive, Priority)
    INCLUDE (Pattern, CategoryId);
GO
