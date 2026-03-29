import QRCode from "qrcode";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root element not found");
}

app.innerHTML = `
  <main class="page">
    <section class="card">
      <h1>Text to QR Code</h1>

      <form id="qr-form">
        <textarea
          id="qr-input"
          class="input"
          placeholder="Type text here"
          rows="4"
        ></textarea>
        <p id="message" class="message hidden" aria-live="polite"></p>

        <button class="button" type="submit">Generate</button>
      </form>

      <div class="preview">
        <img id="qr-image" class="qr-image hidden" alt="Generated QR code" />
        <p id="generated-text" class="generated-text hidden"></p>
      </div>
    </section>
  </main>
`;

const form = document.querySelector<HTMLFormElement>("#qr-form");
const input = document.querySelector<HTMLTextAreaElement>("#qr-input");
const message = document.querySelector<HTMLParagraphElement>("#message");
const qrImage = document.querySelector<HTMLImageElement>("#qr-image");
const generatedText = document.querySelector<HTMLParagraphElement>("#generated-text");
const textEncoder = new TextEncoder();
const pageUrl = window.location.href;

const QR_ERROR_CORRECTION_LEVEL = "M";
const MAX_QR_BYTES = 2331;
const WARNING_RATIO = 0.7;

if (!form || !input || !message || !qrImage || !generatedText) {
  throw new Error("Required UI elements are missing");
}

const setMessage = (text: string | null, type: "info" | "error" = "info"): void => {
  if (text) {
    message.textContent = text;
    message.className = `message ${type}`;
    return;
  }

  message.textContent = "";
  message.className = "message hidden";
};

const getByteLength = (text: string): number => textEncoder.encode(text).length;
const getEffectiveText = (): string => input.value.trim() || pageUrl;

const updateUsageMessage = (text: string): void => {
  const byteLength = getByteLength(text);
  const threshold = MAX_QR_BYTES * WARNING_RATIO;

  if (byteLength > MAX_QR_BYTES) {
    setMessage(`Bytes: ${byteLength} / ${MAX_QR_BYTES}`, "error");
    return;
  }

  if (byteLength > threshold) {
    setMessage(`Bytes: ${byteLength} / ${MAX_QR_BYTES}`, "info");
    return;
  }

  setMessage(null);
};

const resetPreview = (): void => {
  qrImage.classList.add("hidden");
  qrImage.removeAttribute("src");
  generatedText.textContent = "";
  generatedText.classList.add("hidden");
};

const generateQrCode = async (): Promise<void> => {
  const text = getEffectiveText();

  const byteLength = getByteLength(text);

  if (byteLength > MAX_QR_BYTES) {
    resetPreview();
    setMessage(`Bytes: ${byteLength} / ${MAX_QR_BYTES}`, "error");
    input.focus();
    return;
  }

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: QR_ERROR_CORRECTION_LEVEL,
    });
    qrImage.src = dataUrl;
    qrImage.classList.remove("hidden");
    generatedText.textContent = text;
    generatedText.classList.remove("hidden");
    updateUsageMessage(text);
  } catch (error) {
    resetPreview();
    const detail = error instanceof Error ? error.message : "Unknown QR generation error";
    setMessage(`Failed to generate QR code: ${detail}`, "error");
  }
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void generateQrCode();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.ctrlKey) {
    event.preventDefault();
    void generateQrCode();
  }
});

input.addEventListener("input", () => {
  const text = getEffectiveText();
  updateUsageMessage(text);
});

void generateQrCode();
