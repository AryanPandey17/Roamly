import { GoogleGenerativeAI } from "@google/generative-ai"
import { geminiModel, isGeminiConfigured } from "@/lib/config"
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
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY is not configured")
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
