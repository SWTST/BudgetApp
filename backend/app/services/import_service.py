import csv
import hashlib
import io
from datetime import date


def parse_lloyds_csv(content: bytes) -> list[dict]:
    """
    Parse a Lloyds bank CSV export and return a list of normalised transaction dicts.

    Expected columns (confirmed against Feb 2026 export):
        Transaction Date, Transaction Type, Sort Code, Account Number,
        Transaction Description, Debit Amount, Credit Amount, Balance
    """
    # Decode, handling the UTF-8 BOM that some exports include
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    transactions = []
    for row in reader:
        # Strip leading apostrophe Lloyds adds to prevent Excel formula interpretation
        sort_code = row["Sort Code"].strip().lstrip("'")
        account_number = row["Account Number"].strip()

        # Parse DD/MM/YYYY date — never trust locale
        raw_date = row["Transaction Date"].strip()
        day, month, year = raw_date.split("/")
        tx_date = date(int(year), int(month), int(day))

        # One of credit/debit is populated; derive a signed pence integer
        credit_str = row["Credit Amount"].strip()
        debit_str = row["Debit Amount"].strip()
        if credit_str:
            amount_pence = round(float(credit_str) * 100)
        else:
            amount_pence = round(float(debit_str) * 100) * -1

        description = row["Transaction Description"].strip()
        tx_type = row["Transaction Type"].strip()

        # Deduplication hash: SHA256 of account + date + description + amount
        hash_input = f"{account_number}{tx_date.isoformat()}{description}{amount_pence}"
        import_hash = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()

        transactions.append(
            {
                "sort_code": sort_code,
                "account_number": account_number,
                "transaction_date": tx_date,
                "description": description,
                "amount_pence": amount_pence,
                "transaction_type": tx_type,
                "import_hash": import_hash,
            }
        )

    return transactions


def match_merchant_rules(description: str, rules: list[tuple]):
    """
    Apply merchant rules (ordered by priority DESC) to a description.

    rules: list of (Pattern, CategoryId) tuples.
    Patterns use SQL LIKE syntax — only % wildcard is supported.
    Returns the first matching CategoryId, or None.
    """
    desc_upper = description.upper()
    for pattern, category_id in rules:
        pat = pattern.upper()
        if pat.endswith("%"):
            prefix = pat[:-1]
            if desc_upper.startswith(prefix):
                return category_id
        elif pat.startswith("%") and pat.endswith("%"):
            needle = pat[1:-1]
            if needle in desc_upper:
                return category_id
        else:
            if desc_upper == pat:
                return category_id
    return None
