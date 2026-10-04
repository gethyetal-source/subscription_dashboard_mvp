import TextRecognition from "@react-native-ml-kit/text-recognition";
export async function recognizeReceipt(uri: string) {
  try { return (await TextRecognition.recognize(uri)).text; }
  catch { throw new Error("On-device recognition is unavailable. Use a rebuilt Android APK, or paste the receipt text below. Expo Go does not include this native module."); }
}
