import { Router, type IRouter } from "express";
import express from "express";
import OpenAI, { toFile } from "openai";

const router: IRouter = Router();
const audioBodyParser = express.json({ limit: "8mb" });

function makeClient() {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No OpenAI API key configured");
  return new OpenAI({ ...(baseURL ? { baseURL } : {}), apiKey });
}

function detectFormat(buf: Buffer): "webm" | "mp4" | "wav" | "ogg" | "mp3" {
  if (buf.length < 12) return "wav";
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "webm";
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return "mp4";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return "wav";
  if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return "ogg";
  if (buf[0] === 0xff && (buf[1] === 0xfb || buf[1] === 0xfa || buf[1] === 0xf3)) return "mp3";
  return "mp4";
}

router.post("/voice/transcribe", audioBodyParser, async (req, res): Promise<void> => {
  try {
    const { audio } = req.body;
    if (!audio) {
      res.status(400).json({ error: "audio (base64) required" });
      return;
    }
    const buf = Buffer.from(audio, "base64");
    if (buf.length > 6 * 1024 * 1024) {
      res.status(413).json({ error: "Файл слишком большой" });
      return;
    }
    const fmt = detectFormat(buf);
    const file = await toFile(buf, `audio.${fmt}`, { type: `audio/${fmt}` });
    const client = makeClient();
    const result = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "ru",
    });
    res.json({ text: result.text });
  } catch (err) {
    console.error("voice/transcribe error:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

router.post("/voice/tts", audioBodyParser, async (req, res): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text required" });
      return;
    }
    const client = makeClient();
    const response = await client.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: text,
      response_format: "mp3",
    });
    const buf = Buffer.from(await response.arrayBuffer());
    res.json({ audio: buf.toString("base64") });
  } catch (err) {
    console.error("voice/tts error:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});

export default router;
