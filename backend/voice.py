from fastapi import APIRouter, UploadFile, File
import whisper
import tempfile
import os

router = APIRouter()

# Load Whisper model ONCE at startup
model = whisper.load_model("base")
# You can later switch to: tiny | small | medium

@router.post("/voice")
async def voice_command(audio: UploadFile = File(...)):
    # 1. Save uploaded audio to a temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(await audio.read())
        temp_path = tmp.name

    try:
        # 2. Transcribe using Whisper
        result = model.transcribe(temp_path)

        # 3. Return text only
        return {
            "text": result["text"]
        }

    finally:
        # 4. Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
