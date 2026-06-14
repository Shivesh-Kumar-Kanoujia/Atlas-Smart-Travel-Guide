import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from pydantic import BaseModel
import base64
import os
from groq import AsyncGroq
from .limiter import limiter

logger = logging.getLogger("atlas.images")

router = APIRouter()
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

IMAGE_SYSTEM_PROMPT = """You are an expert travel photographer and destination specialist.
When shown a travel image, provide:
1. **Location** - Identify the destination/country if possible
2. **Description** - Vivid, engaging description of what you see
3. **Travel Tips** - 2-3 practical tips for visiting this place
4. **Best Time** - Optimal season to visit
5. **Photography Tip** - How to capture a great shot here
Be enthusiastic, informative, and inspiring."""


class ImageAnalysisRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"
    question: str = "Describe this travel destination and provide travel tips."


@router.post("/analyze")
@limiter.limit("5/minute")
async def analyze_image(request: Request, req: ImageAnalysisRequest):
    try:
        completion = await client.chat.completions.create(
            model=os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
            messages=[
                {"role": "system", "content": IMAGE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{req.media_type};base64,{req.image_base64}"
                            },
                        },
                        {"type": "text", "text": req.question},
                    ],
                },
            ],
            max_tokens=1024,
        )
        return {
            "analysis": completion.choices[0].message.content,
            "tokens_used": completion.usage.total_tokens,
        }
    except Exception as e:
        logger.exception("Image analysis failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
@limiter.limit("5/minute")
async def upload_and_analyze(request: Request, file: UploadFile = File(...), question: str = "Describe this travel destination."):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")

    b64 = base64.b64encode(contents).decode("utf-8")

    try:
        completion = await client.chat.completions.create(
            model=os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
            messages=[
                {"role": "system", "content": IMAGE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{file.content_type};base64,{b64}"},
                        },
                        {"type": "text", "text": question},
                    ],
                },
            ],
            max_tokens=1024,
        )
        return {
            "filename": file.filename,
            "analysis": completion.choices[0].message.content,
            "tokens_used": completion.usage.total_tokens,
        }
    except Exception as e:
        logger.exception("Image upload analysis failed")
        raise HTTPException(status_code=500, detail=str(e))
