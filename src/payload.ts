const PAYLOAD_PREFIX = 'TOQR1:'

type PayloadRecord =
  | {
      type: 'text'
      text: string
    }
  | {
      type: 'file'
      name: string
      mimeType: string
      dataBase64: string
    }

export type DecodedPayload =
  | {
      kind: 'text'
      text: string
    }
  | {
      kind: 'file'
      name: string
      mimeType: string
      bytes: Uint8Array<ArrayBuffer>
    }

export class PayloadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PayloadError'
  }
}

export function encodeTextPayload(text: string): string {
  if (text.length === 0) {
    throw new PayloadError('Text is empty. Enter some text before generating a QR code.')
  }

  return encodeRecord({
    type: 'text',
    text,
  })
}

export async function encodeFilePayload(file: File): Promise<string> {
  if (file.size === 0) {
    throw new PayloadError('File is empty. Choose a non-empty file.')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const dataBase64 = bytesToBase64(bytes)

  return encodeRecord({
    type: 'file',
    name: file.name || 'download.bin',
    mimeType: file.type || 'application/octet-stream',
    dataBase64,
  })
}

export function decodePayload(raw: string): DecodedPayload {
  if (!raw.startsWith(PAYLOAD_PREFIX)) {
    throw new PayloadError('Invalid payload prefix. Expected TOQR payload data.')
  }

  const payloadBody = raw.slice(PAYLOAD_PREFIX.length)
  const jsonText = base64ToUtf8(payloadBody)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new PayloadError('Payload JSON could not be parsed.')
  }

  if (!isPayloadRecord(parsed)) {
    throw new PayloadError('Payload schema is invalid.')
  }

  if (parsed.type === 'text') {
    if (parsed.text.length === 0) {
      throw new PayloadError('Text payload is empty.')
    }

    return {
      kind: 'text',
      text: parsed.text,
    }
  }

  const bytes = base64ToBytes(parsed.dataBase64)
  if (bytes.length === 0) {
    throw new PayloadError('File payload is empty.')
  }

  return {
    kind: 'file',
    name: parsed.name,
    mimeType: parsed.mimeType,
    bytes,
  }
}

function encodeRecord(record: PayloadRecord): string {
  const jsonText = JSON.stringify(record)
  return `${PAYLOAD_PREFIX}${utf8ToBase64(jsonText)}`
}

function isPayloadRecord(value: unknown): value is PayloadRecord {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const data = value as Record<string, unknown>
  if (!('type' in data)) {
    return false
  }

  if (data.type === 'text') {
    return typeof data.text === 'string'
  }

  if (data.type === 'file') {
    return (
      typeof data.name === 'string' &&
      data.name.length > 0 &&
      typeof data.mimeType === 'string' &&
      data.mimeType.length > 0 &&
      typeof data.dataBase64 === 'string' &&
      data.dataBase64.length > 0
    )
  }

  return false
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  return bytesToBase64(bytes)
}

function base64ToUtf8(base64Value: string): string {
  const bytes = base64ToBytes(base64Value)
  return new TextDecoder().decode(bytes)
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    const chunk = bytes.subarray(i, i + 0x8000)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function base64ToBytes(base64Value: string): Uint8Array<ArrayBuffer> {
  let binary: string
  try {
    binary = atob(base64Value)
  } catch {
    throw new PayloadError('Payload base64 is invalid.')
  }

  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}
