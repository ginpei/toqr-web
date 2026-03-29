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

if (!form || !input || !message || !qrImage || !generatedText) {
  throw new Error("Required UI elements are missing");
}

const setErrorMessage = (text: string | null): void => {
  if (text) {
    message.textContent = text;
    message.className = "message error";
    return;
  }

  message.textContent = "";
  message.className = "message hidden";
};

const resetPreview = (): void => {
  qrImage.classList.add("hidden");
  qrImage.removeAttribute("src");
  generatedText.textContent = "";
  generatedText.classList.add("hidden");
};

const generateQrCode = async (): Promise<void> => {
  const text = input.value.trim();

  if (!text) {
    resetPreview();
    setErrorMessage("Please enter text before generating a QR code.");
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
    generatedText.textContent = text;
    generatedText.classList.remove("hidden");
    setErrorMessage(null);
  } catch (error) {
    resetPreview();
    const detail = error instanceof Error ? error.message : "Unknown QR generation error";
    setErrorMessage(`Failed to generate QR code: ${detail}`);
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
