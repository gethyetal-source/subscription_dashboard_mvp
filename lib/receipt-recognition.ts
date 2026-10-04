/** Runs inside a browser worker. Images are not sent to an OCR server. */
export async function recognizeReceipt(uri: string) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try { return (await worker.recognize(uri)).data.text; }
  finally { await worker.terminate(); }
}
