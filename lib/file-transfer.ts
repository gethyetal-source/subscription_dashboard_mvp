import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export async function chooseTextFile(types = ["application/json", "text/plain", "text/csv"]) {
  const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > 10_000_000) throw new Error("Choose a file smaller than 10 MB.");
  if (Platform.OS === "web") {
    if (!asset.file) throw new Error("This browser could not read the selected file.");
    return asset.file.text();
  }
  const info = await FileSystem.getInfoAsync(asset.uri);
  if (info.exists && "size" in info && info.size > 10_000_000) throw new Error("Choose a file smaller than 10 MB.");
  try { return await FileSystem.readAsStringAsync(asset.uri); }
  finally { await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => undefined); }
}
export async function exportTextFile(filename: string, text: string, mimeType: string) {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) throw new Error("File sharing is unavailable on this device.");
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, text);
  try { await Sharing.shareAsync(path, { mimeType, dialogTitle: "Export SubTrack data" }); }
  finally { await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined); }
}
