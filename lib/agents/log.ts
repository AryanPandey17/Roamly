const PREFIX = "[pipeline]"

function ts() {
  return new Date().toISOString().slice(11, 23)
}

export function pipelineLog(stage: string, message: string, extra?: unknown) {
  if (extra === undefined) {
    console.log(`${PREFIX} ${ts()}  ${stage}  ${message}`)
    return
  }
  console.log(`${PREFIX} ${ts()}  ${stage}  ${message}`, extra)
}

export function pipelineWarn(stage: string, message: string, extra?: unknown) {
  if (extra === undefined) {
    console.warn(`${PREFIX} ${ts()}  ${stage}  ${message}`)
    return
  }
  console.warn(`${PREFIX} ${ts()}  ${stage}  ${message}`, extra)
}

export function pipelineError(stage: string, message: string, extra?: unknown) {
  console.error(`${PREFIX} ${ts()}  ${stage}  ${message}`, extra ?? "")
}
