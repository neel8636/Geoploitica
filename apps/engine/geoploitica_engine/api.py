"""FastAPI app implementing docs/api-contract.md."""

from __future__ import annotations

import datetime as dt
import os
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import __version__, calendar
from .analysis import analyze
from .csvio import CSVParseError, parse_footprint
from .models import (
    CHANGE_TYPES,
    AnalysisResult,
    AnalyzeRequest,
    Change,
    ChangesResponse,
    Footprint,
    HealthResponse,
    ValidateResponse,
    footprint_warnings,
    summarize_footprint,
)


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "*")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins or ["*"]


app = FastAPI(title="Geoploitica impact engine", version=__version__)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _parse_date_param(name: str, value: str | None) -> dt.date | None:
    if value is None or value == "":
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"{name} must be an ISO date YYYY-MM-DD") from exc


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(version=__version__, changes=len(calendar.CHANGES))


@app.get("/changes", response_model=ChangesResponse)
def list_changes(
    from_: Annotated[str | None, Query(alias="from")] = None,
    to: str | None = None,
    type: str | None = None,
    country: str | None = None,
) -> ChangesResponse:
    f = _parse_date_param("from", from_)
    t = _parse_date_param("to", to)
    if type is not None and type not in CHANGE_TYPES:
        raise HTTPException(status_code=422, detail=f"type must be one of {list(CHANGE_TYPES)}")
    if country is not None and (len(country) != 2 or not country.isalpha()):
        raise HTTPException(status_code=422, detail="country must be an ISO-2 code")
    return ChangesResponse(changes=calendar.get_changes(f, t, type, country))


@app.get("/changes/{change_id}", response_model=Change)
def get_change(change_id: str) -> Change:
    change = calendar.get_change(change_id)
    if change is None:
        raise HTTPException(status_code=404, detail=f"change {change_id!r} not found")
    return change


@app.post("/footprint/validate", response_model=ValidateResponse)
def validate_footprint(footprint: Footprint) -> ValidateResponse:
    return ValidateResponse(summary=summarize_footprint(footprint), warnings=footprint_warnings(footprint))


@app.post("/analyze", response_model=AnalysisResult)
def analyze_json(req: AnalyzeRequest) -> AnalysisResult:
    return analyze(req.footprint, req.as_of, req.horizon_days)


async def _read(upload: UploadFile | None) -> bytes | None:
    if upload is None:
        return None
    data = await upload.read()
    return data if data else None


@app.post("/analyze/csv", response_model=AnalysisResult)
async def analyze_csv(
    suppliers: Annotated[UploadFile, File()],
    company_name: Annotated[str, Form()],
    currency: Annotated[str, Form()],
    home_country: Annotated[str, Form()],
    parts: Annotated[UploadFile | None, File()] = None,
    lanes: Annotated[UploadFile | None, File()] = None,
    sites: Annotated[UploadFile | None, File()] = None,
    sales_markets: Annotated[str | None, Form()] = None,
    as_of: Annotated[str | None, Form()] = None,
    horizon_days: Annotated[int, Form()] = 365,
) -> AnalysisResult | JSONResponse:
    sup = await _read(suppliers)
    if sup is None:
        raise HTTPException(status_code=422, detail="suppliers CSV is empty")
    markets = [m.strip() for m in sales_markets.replace("|", ",").split(",") if m.strip()] if sales_markets else None
    try:
        footprint, _warnings = parse_footprint(
            company_name=company_name,
            currency=currency,
            home_country=home_country,
            suppliers_csv=sup,
            parts_csv=await _read(parts),
            lanes_csv=await _read(lanes),
            sites_csv=await _read(sites),
            sales_markets=markets,
        )
    except CSVParseError as exc:
        return JSONResponse(status_code=422, content={"detail": exc.errors})
    as_of_d = _parse_date_param("as_of", as_of)
    return analyze(footprint, as_of_d, horizon_days)
