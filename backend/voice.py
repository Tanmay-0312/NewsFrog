from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class VoiceCommandRequest(BaseModel):
    text: str

@router.post("/voice")
def voice_command(payload: VoiceCommandRequest):
    command = payload.text.strip().lower()

    return {
        "command": command
    }
