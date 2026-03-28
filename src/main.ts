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
      <p class="subtitle">Enter text and click Generate to create a QR code.</p>

      <form id="qr-form">
        <label class="label" for="qr-input">Text</label>
        <input
          id="qr-input"
          class="input"
          type="text"
          placeholder="Type text here"
          autocomplete="off"
        />

        <button class="button" type="submit">Generate</button>
      </form>
      <p id="message" class="message" aria-live="polite"></p>

      <div class="preview">
        <img id="qr-image" class="qr-image hidden" alt="Generated QR code" />
      </div>
    </section>
  </main>
`;

const form = document.querySelector<HTMLFormElement>("#qr-form");
const input = document.querySelector<HTMLInputElement>("#qr-input");
const message = document.querySelector<HTMLParagraphElement>("#message");
const qrImage = document.querySelector<HTMLImageElement>("#qr-image");

if (!form || !input || !message || !qrImage) {
  throw new Error("Required UI elements are missing");
}

const setMessage = (text: string, type: "error" | "info" = "info"): void => {
  message.textContent = text;
  message.className = `message ${type}`;
};

const generateQrCode = async (): Promise<void> => {
  const text = input.value.trim();

  if (!text) {
    qrImage.classList.add("hidden");
    qrImage.removeAttribute("src");
    setMessage("Please enter text before generating a QR code.", "error");
    input.focus();
    return;
  }

  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 256,
      margin: 2,
    });
    qrImage.src = dataUrl;
    qrImage.classList.remove("hidden");
    setMessage("QR code generated.");
  } catch (error) {
    qrImage.classList.add("hidden");
    qrImage.removeAttribute("src");
    const detail = error instanceof Error ? error.message : "Unknown QR generation error";
    setMessage(`Failed to generate QR code: ${detail}`, "error");
  }
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void generateQrCode();
});
