"""Parse the four footprint CSVs (data/templates/*.csv) into a Footprint."""

from __future__ import annotations

import csv
import io
from typing import Any

from pydantic import ValidationError

from .models import Footprint, Lane, Part, Site, Supplier

SUPPLIER_COLUMNS = ["id", "name", "country", "region", "tier", "category", "annual_spend", "single_source"]
PART_COLUMNS = ["id", "name", "hs_code", "supplier_ids", "origin_country", "annual_volume_value", "critical"]
LANE_COLUMNS = ["id", "origin_country", "destination_country", "mode", "via", "annual_shipments", "lead_time_days"]
SITE_COLUMNS = ["id", "name", "country", "type", "headcount"]

_TRUE = {"1", "true", "yes", "y", "t", "x"}
_FALSE = {"0", "false", "no", "n", "f", ""}


class CSVParseError(ValueError):
    """Raised when a CSV cannot be parsed into the footprint; carries row-level errors."""

    def __init__(self, errors: list[dict[str, Any]]):
        super().__init__("; ".join(f"{e['file']} row {e['row']}: {e['msg']}" for e in errors))
        self.errors = errors


def _text(value: str | bytes | None) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        value = value.decode("utf-8-sig", errors="replace")
    return value.lstrip("﻿")


def _rows(text: str) -> list[dict[str, str]]:
    text = _text(text)
    if not text.strip():
        return []
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
    except csv.Error:
        dialect = csv.excel  # type: ignore[assignment]
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    out: list[dict[str, str]] = []
    for row in reader:
        clean = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items() if k is not None}
        if not any(clean.values()):
            continue
        out.append(clean)
    return out


def _opt(row: dict[str, str], key: str) -> str | None:
    v = row.get(key, "")
    return v if v != "" else None


def _opt_number(row: dict[str, str], key: str) -> float | None:
    v = _opt(row, key)
    if v is None:
        return None
    v = v.replace(",", "").replace("_", "").replace(" ", "")
    return float(v)


def _opt_int(row: dict[str, str], key: str) -> int | None:
    v = _opt_number(row, key)
    return None if v is None else int(v)


def _opt_bool(row: dict[str, str], key: str) -> bool | None:
    v = row.get(key, "").strip().lower()
    if v == "":
        return None
    if v in _TRUE:
        return True
    if v in _FALSE:
        return False
    raise ValueError(f"{key}: expected true/false, got {v!r}")


def _list(row: dict[str, str], key: str) -> list[str]:
    v = _opt(row, key)
    if v is None:
        return []
    return [x.strip() for x in v.replace(";", "|").split("|") if x.strip()]


def _country(row: dict[str, str], key: str) -> str | None:
    v = _opt(row, key)
    return v.upper() if v else None


def parse_suppliers(text: str) -> tuple[list[Supplier], list[str], list[dict[str, Any]]]:
    rows = _rows(text)
    out, warnings, errors = [], [], []
    for i, row in enumerate(rows, start=2):
        try:
            tier_raw = _opt(row, "tier")
            if tier_raw is None:
                tier_raw = "1"
                warnings.append(f"suppliers row {i}: tier blank, defaulted to 1.")
            out.append(
                Supplier(
                    id=row.get("id", ""),
                    name=row.get("name", "") or row.get("id", ""),
                    country=_country(row, "country") or "",
                    region=_opt(row, "region"),
                    tier=int(float(tier_raw)),  # type: ignore[arg-type]
                    category=_opt(row, "category"),
                    annual_spend=_opt_number(row, "annual_spend"),
                    single_source=_opt_bool(row, "single_source"),
                )
            )
        except (ValidationError, ValueError) as exc:
            errors.append({"file": "suppliers", "row": i, "msg": _msg(exc)})
    return out, warnings, errors


def parse_parts(text: str) -> tuple[list[Part], list[str], list[dict[str, Any]]]:
    rows = _rows(text)
    out, warnings, errors = [], [], []
    for i, row in enumerate(rows, start=2):
        try:
            hs = _opt(row, "hs_code")
            if hs:
                hs = hs.replace(".", "").replace(" ", "")
            out.append(
                Part(
                    id=row.get("id", ""),
                    name=row.get("name", "") or row.get("id", ""),
                    hs_code=hs,
                    supplier_ids=_list(row, "supplier_ids"),
                    origin_country=_country(row, "origin_country"),
                    annual_volume_value=_opt_number(row, "annual_volume_value"),
                    critical=_opt_bool(row, "critical"),
                )
            )
        except (ValidationError, ValueError) as exc:
            errors.append({"file": "parts", "row": i, "msg": _msg(exc)})
    return out, warnings, errors


def parse_lanes(text: str) -> tuple[list[Lane], list[str], list[dict[str, Any]]]:
    rows = _rows(text)
    out, warnings, errors = [], [], []
    for i, row in enumerate(rows, start=2):
        try:
            out.append(
                Lane(
                    id=row.get("id", ""),
                    origin_country=_country(row, "origin_country") or "",
                    destination_country=_country(row, "destination_country") or "",
                    mode=(row.get("mode", "") or "road").lower(),  # type: ignore[arg-type]
                    via=_list(row, "via") or None,
                    annual_shipments=_opt_number(row, "annual_shipments"),
                    lead_time_days=_opt_number(row, "lead_time_days"),
                )
            )
        except (ValidationError, ValueError) as exc:
            errors.append({"file": "lanes", "row": i, "msg": _msg(exc)})
    return out, warnings, errors


def parse_sites(text: str) -> tuple[list[Site], list[str], list[dict[str, Any]]]:
    rows = _rows(text)
    out, warnings, errors = [], [], []
    for i, row in enumerate(rows, start=2):
        try:
            out.append(
                Site(
                    id=row.get("id", ""),
                    name=row.get("name", "") or row.get("id", ""),
                    country=_country(row, "country") or "",
                    type=(row.get("type", "") or "plant").lower(),  # type: ignore[arg-type]
                    headcount=_opt_int(row, "headcount"),
                )
            )
        except (ValidationError, ValueError) as exc:
            errors.append({"file": "sites", "row": i, "msg": _msg(exc)})
    return out, warnings, errors


def _msg(exc: Exception) -> str:
    if isinstance(exc, ValidationError):
        return "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors())
    return str(exc)


def parse_footprint(
    *,
    company_name: str,
    currency: str,
    home_country: str,
    suppliers_csv: str | bytes,
    parts_csv: str | bytes | None = None,
    lanes_csv: str | bytes | None = None,
    sites_csv: str | bytes | None = None,
    sales_markets: list[str] | None = None,
) -> tuple[Footprint, list[str]]:
    """Build a Footprint from CSV text. Raises CSVParseError on bad rows."""
    warnings: list[str] = []
    errors: list[dict[str, Any]] = []

    suppliers, w, e = parse_suppliers(_text(suppliers_csv))
    warnings += w
    errors += e
    if not suppliers and not errors:
        errors.append({"file": "suppliers", "row": 1, "msg": "no supplier rows found"})

    parts: list[Part] = []
    if parts_csv is not None and _text(parts_csv).strip():
        parts, w, e = parse_parts(_text(parts_csv))
        warnings += w
        errors += e
    lanes: list[Lane] = []
    if lanes_csv is not None and _text(lanes_csv).strip():
        lanes, w, e = parse_lanes(_text(lanes_csv))
        warnings += w
        errors += e
    sites: list[Site] = []
    if sites_csv is not None and _text(sites_csv).strip():
        sites, w, e = parse_sites(_text(sites_csv))
        warnings += w
        errors += e

    if errors:
        raise CSVParseError(errors)

    supplier_ids = {s.id for s in suppliers}
    for p in parts:
        unknown = [sid for sid in p.supplier_ids if sid not in supplier_ids]
        if unknown:
            warnings.append(f"parts: {p.id} references unknown supplier ids {', '.join(unknown)}.")

    try:
        fp = Footprint(
            company_name=company_name,
            currency=currency.upper().strip(),
            home_country=home_country.upper().strip(),
            sales_markets=[m.upper() for m in sales_markets] if sales_markets else None,
            suppliers=suppliers,
            parts=parts or None,
            lanes=lanes or None,
            sites=sites or None,
        )
    except ValidationError as exc:
        raise CSVParseError([{"file": "form", "row": 0, "msg": _msg(exc)}]) from exc
    return fp, warnings
