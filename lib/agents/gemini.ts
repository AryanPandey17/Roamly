import { GoogleGenerativeAI } from "@google/generative-ai"
import { geminiModel, isGeminiConfigured, isMistralConfigured, mistralModel } from "@/lib/config"
import { pipelineError, pipelineLog, pipelineWarn } from "@/lib/agents/log"
import { parseJsonFromText } from "@/lib/agents/math"

/**
 * Gemini 3.x rejects the classic function-calling "function" role used by
 * ChatSession.sendMessage(functionResponse). Tools run in TypeScript; the
 * model only ranks/annotates the injected results and returns JSON.
 */
export async function runGeminiJson<T>(input: {
  system: string
  user: string
}): Promise<T> {
  if (isMistralConfigured()) {
    try {
      return await runMistralJson<T>(input)
    } catch (error) {
      pipelineWarn("mistral", "request failed, falling back to Gemini", error)
    }
  }

  if (!isGeminiConfigured()) {
    throw new Error("Neither MISTRAL_API_KEY nor GEMINI_API_KEY is configured")
  }

  const model = genAI().getGenerativeModel({
    model: geminiModel(),
    systemInstruction: `${input.system}\n\nAlways finish with valid JSON matching the output contract. No markdown fences. Do not call tools; results are already in the user message.`,
  })

  const prompt = `${input.user}\n\nReturn JSON only.`
  const contents = [{ role: "user" as const, parts: [{ text: prompt }] }]
  const modelName = geminiModel()
  pipelineLog("gemini", `generate model=${modelName} promptChars=${prompt.length}`)

  let text = ""
  try {
    const first = await model.generateContent({
      contents,
      generationConfig: { responseMimeType: "application/json" },
    })
    text = first.response.text()
    pipelineLog("gemini", `response chars=${text.length}`)
  } catch (error) {
    pipelineWarn("gemini", "json mime failed, retrying without mime", error)
    const fallback = await model.generateContent({ contents })
    text = fallback.response.text()
    pipelineLog("gemini", `fallback response chars=${text.length}`)
  }

  try {
    const parsed = parseJsonFromText<T>(text)
    pipelineLog("gemini", "parsed JSON")
    return parsed
  } catch (error) {
    pipelineWarn("gemini", "invalid JSON, asking model to repair", error)
    const retry = await model.generateContent({
      contents: [
        ...contents,
        { role: "model", parts: [{ text }] },
        {
          role: "user",
          parts: [{ text: "That was not valid JSON. Reply with the JSON object only. Roles allowed: USER and MODEL." }],
        },
      ],
    })
    const repaired = retry.response.text()
    pipelineLog("gemini", `repair response chars=${repaired.length}`)
    try {
      return parseJsonFromText<T>(repaired)
    } catch (parseError) {
      pipelineError("gemini", "JSON repair failed", parseError)
      throw parseError
    }
  }
}

function genAI() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
}

async function runMistralJson<T>(input: { system: string; user: string }): Promise<T> {
  const modelName = mistralModel()
  const prompt = `${input.user}\n\nReturn JSON only.`
  pipelineLog("mistral", `generate model=${modelName} promptChars=${prompt.length}`)

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: `${input.system}\n\nAlways finish with valid JSON matching the output contract. No markdown fences.` },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  })

  if (!response.ok) {
    throw new Error(`Mistral API returned ${response.status}: ${await response.text()}`)
  }

  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string | null } }> }
  const text = payload.choices?.[0]?.message?.content
  if (!text) throw new Error("Mistral API returned no message content")
  pipelineLog("mistral", `response chars=${text.length}`)

  try {
    const parsed = parseJsonFromText<T>(text)
    pipelineLog("mistral", "parsed JSON")
    return parsed
  } catch (error) {
    pipelineWarn("mistral", "invalid JSON, falling back to Gemini", error)
    throw error
  }
}
