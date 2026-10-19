"""Pydantic v2 models for the engine API contract (docs/api-contract.md, v0)."""

from __future__ import annotations

import datetime as dt
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

# --- scalar aliases -----------------------------------------------------------

Country = Annotated[str, StringConstraints(pattern=r"^[A-Z]{2}$")]
Currency = Annotated[str, StringConstraints(pattern=r"^[A-Z]{3}$")]
HSCode = Annotated[str, StringConstraints(pattern=r"^[0-9]{4,10}$")]
ISODate = Annotated[str, StringConstraints(pattern=r"^\d{4}-\d{2}-\d{2}$")]

Department = Literal[
    "procurement",
    "logistics",
    "production",
    "finance",
    "compliance",
    "sustainability",
    "sales",
    "hr",
    "leadership",
]
DEPARTMENTS: tuple[Department, ...] = (
    "procurement",
    "logistics",
    "production",
    "finance",
    "compliance",
    "sustainability",
    "sales",
    "hr",
    "leadership",
)

ChangeType = Literal[
    "tariff",
    "sanction",
    "export_control",
    "regulation",
    "chokepoint",
    "strike",
    "unrest",
    "conflict",
    "energy_price",
    "fx",
    "sovereign_stress",
    "weather",
    "election",
]
CHANGE_TYPES: tuple[ChangeType, ...] = (
    "tariff",
    "sanction",
    "export_control",
    "regulation",
    "chokepoint",
    "strike",
    "unrest",
    "conflict",
    "energy_price",
    "fx",
    "sovereign_stress",
    "weather",
    "election",
)

ChangeStatus = Literal["scheduled", "proposed", "developing", "in_force"]
Confidence = Literal["low", "medium", "high"]
Severity = Literal[1, 2, 3, 4, 5]
Tier = Literal[1, 2, 3]
LaneMode = Literal["sea", "air", "road", "rail"]
SiteType = Literal["plant", "warehouse", "office"]
ItemType = Literal["supplier", "part", "lane", "site", "market"]


def _check_iso_date(value: str) -> str:
    """Reject strings that match the pattern but are not real calendar dates."""
    try:
        dt.date.fromisoformat(value)
    except ValueError as exc:  # pragma: no cover - message path
        raise ValueError(f"not a valid ISO date: {value!r}") from exc
    return value


class _Base(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


# --- footprint ----------------------------------------------------------------


class Supplier(_Base):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    country: Country
    region: str | None = None
    tier: Tier
    category: str | None = None
    annual_spend: float | None = Field(default=None, ge=0)
    single_source: bool | None = None


class Part(_Base):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    hs_code: HSCode | None = None
    supplier_ids: list[str] = Field(default_factory=list)
    origin_country: Country | None = None
    annual_volume_value: float | None = Field(default=None, ge=0)
    critical: bool | None = None


class Lane(_Base):
    id: str = Field(min_length=1)
    origin_country: Country
    destination_country: Country
    mode: LaneMode
    via: list[str] | None = None
    annual_shipments: float | None = Field(default=None, ge=0)
    lead_time_days: float | None = Field(default=None, ge=0)

    @field_validator("via")
    @classmethod
    def _upper_via(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        return [code.strip().upper() for code in v if code and code.strip()]


class Site(_Base):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    country: Country
    type: SiteType
    headcount: int | None = Field(default=None, ge=0)


class Footprint(_Base):
    company_name: str = Field(min_length=1)
    currency: Currency
    home_country: Country
    sales_markets: list[Country] | None = None
    suppliers: list[Supplier]
    parts: list[Part] | None = None
    lanes: list[Lane] | None = None
    sites: list[Site] | None = None


# --- changes ------------------------------------------------------------------


class Source(_Base):
    title: str
    url: str
    publisher: str | None = None
    accessed: ISODate

    _v_accessed = field_validator("accessed")(_check_iso_date)


class Change(_Base):
    id: str = Field(min_length=1)
    type: ChangeType
    title: str
    summary: str
    status: ChangeStatus
    effective_date: ISODate | None = None
    window_start: ISODate | None = None
    window_end: ISODate | None = None
    countries: list[Country]
    affected_countries: list[Country] | None = None
    hs_prefixes: list[str] | None = None
    chokepoints: list[str] | None = None
    sectors: list[str] | None = None
    severity: Severity
    confidence: Confidence
    departments: list[Department]
    what_to_do: list[str]
    sources: list[Source]
    dossier_slug: str | None = None

    @field_validator("effective_date", "window_start", "window_end")
    @classmethod
    def _v_dates(cls, v: str | None) -> str | None:
        return None if v is None else _check_iso_date(v)

    @field_validator("hs_prefixes")
    @classmethod
    def _v_hs_prefixes(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        for p in v:
            if not p.isdigit():
                raise ValueError(f"hs_prefix must be digits only: {p!r}")
        return v

    @property
    def all_countries(self) -> set[str]:
        return set(self.countries) | set(self.affected_countries or [])


# --- analysis -----------------------------------------------------------------


class Exposure(_Base):
    change_id: str
    item_type: ItemType
    item_id: str
    item_label: str
    reason: str
    score: float = Field(ge=0, le=100)
    value_at_risk: float | None = None
    days_until: int | None = None


class BriefItem(_Base):
    change_id: str
    headline: str = Field(max_length=90)
    what_changes: str
    your_exposure: str
    cost_if_unprepared: str
    next_action: str
    owner_role: str
    also_notify: list[Department]
    days_until: int | None = None
    confidence: Confidence
    score: float = Field(ge=0, le=100)
    sources: list[Source]


class DepartmentBrief(_Base):
    department: Department
    items: list[BriefItem] = Field(max_length=10)


class FootprintSummary(_Base):
    suppliers: int
    parts: int
    lanes: int
    sites: int
    countries: list[Country]
    total_spend: float | None = None


class CountryRollup(_Base):
    country: Country
    spend: float
    suppliers: int
    max_score: float


class ChangeRollup(_Base):
    change_id: str
    title: str
    type: ChangeType
    effective_date: ISODate | None = None
    days_until: int | None = None
    exposures: int
    value_at_risk: float
    max_score: float


class AnalysisResult(_Base):
    as_of: ISODate
    footprint: FootprintSummary
    exposures: list[Exposure]
    by_country: list[CountryRollup]
    by_change: list[ChangeRollup]
    briefs: list[DepartmentBrief]
    leadership_top5: list[BriefItem]


class AnalyzeRequest(_Base):
    footprint: Footprint
    as_of: ISODate | None = None
    horizon_days: int = Field(default=365, ge=0)

    _v_as_of = field_validator("as_of")(lambda v: None if v is None else _check_iso_date(v))


class ValidateResponse(_Base):
    ok: Literal[True] = True
    summary: FootprintSummary
    warnings: list[str]


class HealthResponse(_Base):
    status: Literal["ok"] = "ok"
    version: str
    changes: int


class ChangesResponse(_Base):
    changes: list[Change]


# --- helpers shared by modules ------------------------------------------------


def summarize_footprint(fp: Footprint) -> FootprintSummary:
    countries: set[str] = {fp.home_country}
    countries.update(s.country for s in fp.suppliers)
    countries.update(p.origin_country for p in (fp.parts or []) if p.origin_country)
    for lane in fp.lanes or []:
        countries.add(lane.origin_country)
        countries.add(lane.destination_country)
    countries.update(s.country for s in (fp.sites or []))
    countries.update(fp.sales_markets or [])
    spends = [s.annual_spend for s in fp.suppliers if s.annual_spend is not None]
    return FootprintSummary(
        suppliers=len(fp.suppliers),
        parts=len(fp.parts or []),
        lanes=len(fp.lanes or []),
        sites=len(fp.sites or []),
        countries=sorted(countries),
        total_spend=sum(spends) if spends else None,
    )


def footprint_warnings(fp: Footprint) -> list[str]:
    """Non-fatal data-quality notes a user should see after validation."""
    warnings: list[str] = []
    supplier_ids = {s.id for s in fp.suppliers}
    if len(supplier_ids) != len(fp.suppliers):
        warnings.append("Duplicate supplier ids found; matches will be reported per row.")
    no_spend = [s.id for s in fp.suppliers if s.annual_spend is None]
    if no_spend:
        warnings.append(
            f"{len(no_spend)} supplier(s) have no annual_spend; value_at_risk will be blank for them."
        )
    for p in fp.parts or []:
        unknown = [sid for sid in p.supplier_ids if sid not in supplier_ids]
        if unknown:
            warnings.append(f"Part {p.id} references unknown supplier ids: {', '.join(unknown)}.")
        if not p.hs_code:
            warnings.append(f"Part {p.id} has no hs_code; HS-based matching is skipped for it.")
    if not fp.parts:
        warnings.append("No parts given; HS-code based regulation and tariff matching is skipped.")
    if not fp.lanes:
        warnings.append("No lanes given; chokepoint matching is skipped.")
    if not fp.sites:
        warnings.append("No sites given; site-country matching is skipped.")
    return warnings
