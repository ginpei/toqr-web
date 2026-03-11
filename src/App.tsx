import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import './App.css'
import {
  decodePayload,
  encodeFilePayload,
  encodeTextPayload,
  PayloadError,
  type DecodedPayload,
} from './payload'

function App() {
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [textValue, setTextValue] = useState('')
  const [fileValue, setFileValue] = useState<File | null>(null)
  const [encodedPayload, setEncodedPayload] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [generateError, setGenerateError] = useState('')
  const [decodeInput, setDecodeInput] = useState('')
  const [decodedPayload, setDecodedPayload] = useState<DecodedPayload | null>(null)
  const [decodeError, setDecodeError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  const payloadBytes = useMemo(
    () => (encodedPayload.length > 0 ? new TextEncoder().encode(encodedPayload).length : 0),
    [encodedPayload],
  )

  const payloadHint = useMemo(() => {
    if (payloadBytes > 2200) {
      return 'Large payload: QR may be dense and hard to scan on some devices.'
    }

    if (payloadBytes > 1200) {
      return 'Medium payload: scanning quality depends on camera and screen clarity.'
    }

    if (payloadBytes > 0) {
      return 'Small payload: usually easy to scan.'
    }

    return ''
  }, [payloadBytes])

  useEffect(() => {
    if (copyStatus.length === 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCopyStatus('')
    }, 2000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [copyStatus])

  async function handleGenerateQr() {
    setGenerateError('')

    try {
      const payload =
        inputMode === 'text'
          ? encodeTextPayload(textValue)
          : await encodeSelectedFilePayload(fileValue)

      const dataUrl = await QRCode.toDataURL(payload, {
        width: 340,
        margin: 1,
        errorCorrectionLevel: 'M',
      })

      setEncodedPayload(payload)
      setQrDataUrl(dataUrl)
    } catch (error) {
      if (error instanceof Error) {
        setGenerateError(error.message)
        return
      }

      setGenerateError('QR generation failed for an unknown reason.')
    }
  }

  function handleDownloadQr() {
    if (qrDataUrl.length === 0) {
      setGenerateError('Generate a QR code first.')
      return
    }

    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = 'toqr-code.png'
    link.click()
  }

  function handleDecodePayload() {
    setDecodeError('')
    setDecodedPayload(null)

    try {
      const decoded = decodePayload(decodeInput.trim())
      setDecodedPayload(decoded)
    } catch (error) {
      if (error instanceof Error) {
        setDecodeError(error.message)
        return
      }

      setDecodeError('Could not decode payload.')
    }
  }

  async function handleCopyDecodedText() {
    if (decodedPayload?.kind !== 'text') {
      return
    }

    await navigator.clipboard.writeText(decodedPayload.text)
    setCopyStatus('Copied text')
  }

  function handleDownloadDecodedFile() {
    if (decodedPayload?.kind !== 'file') {
      return
    }

    const blob = new Blob([decodedPayload.bytes], { type: decodedPayload.mimeType })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = decodedPayload.name
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <main className="app-shell">
      <header>
        <h1>TOQR</h1>
        <p>Create a QR from text or file, fully in your browser.</p>
      </header>

      <section className="panel">
        <h2>Generate QR</h2>
        <div className="row">
          <button
            className={inputMode === 'text' ? 'active' : ''}
            type="button"
            onClick={() => setInputMode('text')}
          >
            Text
          </button>
          <button
            className={inputMode === 'file' ? 'active' : ''}
            type="button"
            onClick={() => setInputMode('file')}
          >
            File
          </button>
        </div>

        {inputMode === 'text' ? (
          <label>
            Text content
            <textarea
              value={textValue}
              onChange={(event) => setTextValue(event.target.value)}
              rows={5}
              placeholder="Enter any text to encode"
            />
          </label>
        ) : (
          <label>
            File to encode
            <input
              type="file"
              onChange={(event) => {
                setFileValue(event.target.files?.[0] ?? null)
              }}
            />
          </label>
        )}

        {fileValue && inputMode === 'file' ? (
          <p className="hint">
            Selected: {fileValue.name} ({formatBytes(fileValue.size)})
          </p>
        ) : null}

        <div className="row">
          <button type="button" onClick={() => void handleGenerateQr()}>
            Generate
          </button>
          <button type="button" onClick={handleDownloadQr} disabled={qrDataUrl.length === 0}>
            Download PNG
          </button>
        </div>

        {generateError.length > 0 ? <p className="error">{generateError}</p> : null}

        {qrDataUrl.length > 0 ? (
          <div className="qr-result">
            <img src={qrDataUrl} alt="Generated QR code" width={340} height={340} />
            <p className="hint">
              Payload size: {payloadBytes} bytes ({encodedPayload.length} chars)
            </p>
            {payloadHint.length > 0 ? <p className="hint">{payloadHint}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Paste-to-recover</h2>
        <label>
          Scanned payload text
          <textarea
            value={decodeInput}
            onChange={(event) => setDecodeInput(event.target.value)}
            rows={5}
            placeholder="Paste scanned TOQR payload here"
          />
        </label>
        <div className="row">
          <button type="button" onClick={handleDecodePayload}>
            Decode payload
          </button>
        </div>

        {decodeError.length > 0 ? <p className="error">{decodeError}</p> : null}

        {decodedPayload?.kind === 'text' ? (
          <div className="decode-result">
            <h3>Recovered text</h3>
            <textarea value={decodedPayload.text} readOnly rows={5} />
            <div className="row">
              <button type="button" onClick={() => void handleCopyDecodedText()}>
                Copy text
              </button>
              {copyStatus.length > 0 ? <span className="hint">{copyStatus}</span> : null}
            </div>
          </div>
        ) : null}

        {decodedPayload?.kind === 'file' ? (
          <div className="decode-result">
            <h3>Recovered file</h3>
            <p className="hint">
              {decodedPayload.name} ({decodedPayload.mimeType}) · {formatBytes(decodedPayload.bytes.length)}
            </p>
            <button type="button" onClick={handleDownloadDecodedFile}>
              Download file
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}

async function encodeSelectedFilePayload(file: File | null): Promise<string> {
  if (!file) {
    throw new PayloadError('No file selected. Choose a file first.')
  }

  return encodeFilePayload(file)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const kib = bytes / 1024
  if (kib < 1024) {
    return `${kib.toFixed(1)} KiB`
  }

  const mib = kib / 1024
  return `${mib.toFixed(2)} MiB`
}

export default App
