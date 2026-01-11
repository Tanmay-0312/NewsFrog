# tts_reader.py
import pyttsx3
import threading
import time

engine = pyttsx3.init()
engine.setProperty("rate", 170)
engine.setProperty("volume", 1.0)

stop_event = threading.Event()
tts_thread = None


def _speak_sequence(articles):
    engine.say("Here are today's top headlines.")
    engine.runAndWait()

    for i, article in enumerate(articles, start=1):
        if stop_event.is_set():
            break

        title = article.get("title")
        if not title:
            continue

        engine.say(f"Headline {i}. {title}")
        engine.runAndWait()

        time.sleep(0.4)  # 👈 IMPORTANT pause


def speak_headlines(articles):
    global tts_thread

    stop_event.clear()

    tts_thread = threading.Thread(
        target=_speak_sequence,
        args=(articles,),
        daemon=True
    )
    tts_thread.start()


def stop_speaking():
    stop_event.set()
    engine.stop()
