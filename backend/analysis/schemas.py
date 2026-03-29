from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


CANONICAL_TRANSACTION_COLUMNS = [
    "Timestamp",
    "From Bank",
    "Account",
    "To Bank",
    "Account.1",
    "Amount Received",
    "Receiving Currency",
    "Amount Paid",
    "Payment Currency",
    "Payment Format",
    "Is Laundering",
]


class ColumnMapping(BaseModel):
    fields: Dict[str, str] = Field(default_factory=dict)
    defaults: Dict[str, Any] = Field(default_factory=dict)
    delimiter: Optional[str] = None
    description: Optional[str] = None


class StandardizationMetadata(BaseModel):
    input_columns: List[str]
    standardized_columns: List[str]
    resolved_fields: Dict[str, str] = Field(default_factory=dict)
    applied_defaults: Dict[str, Any] = Field(default_factory=dict)
    unmapped_input_columns: List[str] = Field(default_factory=list)
    record_count: int
