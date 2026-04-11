from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
EXCHANGE_API_KEY = os.getenv("EXCHANGE_API_KEY")

# Fallback static rates relative to USD (updated periodically)
FALLBACK_RATES = {
    "USD": 1.0, "EUR": 0.92, "GBP": 0.79, "JPY": 149.5, "AUD": 1.53,
    "CAD": 1.36, "CHF": 0.88, "CNY": 7.24, "INR": 83.1, "MXN": 17.2,
    "BRL": 4.97, "KRW": 1325.0, "SGD": 1.34, "HKD": 7.82, "NOK": 10.5,
    "SEK": 10.4, "DKK": 6.88, "NZD": 1.63, "ZAR": 18.6, "THB": 35.1,
    "AED": 3.67, "TRY": 30.5, "PLN": 4.0, "IDR": 15600, "VND": 24500,
}


class ConvertRequest(BaseModel):
    amount: float
    from_currency: str
    to_currency: str


@router.post("/convert")
async def convert_currency(req: ConvertRequest):
    try:
        from_cur = req.from_currency.upper()
        to_cur = req.to_currency.upper()

        if EXCHANGE_API_KEY:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"https://v6.exchangerate-api.com/v6/{EXCHANGE_API_KEY}/pair/{from_cur}/{to_cur}/{req.amount}"
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "from": from_cur,
                        "to": to_cur,
                        "amount": req.amount,
                        "converted": round(data["conversion_result"], 4),
                        "rate": round(data["conversion_rate"], 6),
                        "source": "live",
                    }

        # Fallback to static rates
        if from_cur not in FALLBACK_RATES or to_cur not in FALLBACK_RATES:
            raise HTTPException(status_code=400, detail=f"Unsupported currency pair: {from_cur}/{to_cur}")

        rate_usd = FALLBACK_RATES[to_cur] / FALLBACK_RATES[from_cur]
        converted = req.amount * rate_usd

        return {
            "from": from_cur,
            "to": to_cur,
            "amount": req.amount,
            "converted": round(converted, 4),
            "rate": round(rate_usd, 6),
            "source": "fallback",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rates")
async def get_rates(base: str = Query("USD")):
    base = base.upper()
    if base not in FALLBACK_RATES:
        raise HTTPException(status_code=400, detail=f"Unsupported base currency: {base}")

    base_rate = FALLBACK_RATES[base]
    rates = {cur: round(rate / base_rate, 6) for cur, rate in FALLBACK_RATES.items()}
    return {"base": base, "rates": rates, "source": "fallback"}


@router.get("/currencies")
async def list_currencies():
    return {"currencies": sorted(FALLBACK_RATES.keys())}
