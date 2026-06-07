---
name: Voice routes OpenAI key
description: How voice.ts gets its OpenAI key and which TTS approach works
---

The `makeClient()` in voice.ts prefers `AI_INTEGRATIONS_OPENAI_API_KEY` (Replit proxy) but falls back to `OPENAI_API_KEY`. The user's personal key is stored as `OPENAI_API_KEY` secret.

**Why:** Replit AI Integrations proxy does NOT support `client.audio.speech.create()` (speech API / tts-1 model). Only chat completions and audio transcriptions are proxied. TTS via tts-1 model with a real OPENAI_API_KEY works fine.

**How to apply:** Keep the fallback pattern in makeClient(). If ever migrating to gpt-audio TTS (chat completions), use the pattern from `server/replit_integrations/audio/client.ts` → `textToSpeech()`. For Whisper transcription, `whisper-1` works with a real key.
