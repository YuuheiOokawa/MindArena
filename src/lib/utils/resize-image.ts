/** `accept="image/*"` on the file input is only a UI hint — some pickers (desktop "all files",
 * some cloud/file-manager pickers on Android) let the user select past it, so an arbitrarily
 * large or non-image file could otherwise be fully base64-encoded into memory before any error
 * has a chance to surface. Checked before touching FileReader at all. */
const MAX_SOURCE_FILE_BYTES = 15 * 1024 * 1024;

/** Center-crops a selected image file to a square and downscales it to `size`px, returning a
 * compressed JPEG data URI small enough to store inline (no object storage configured for this
 * app — see PlayerProfile.customAvatarUrl). Runs entirely client-side via canvas. */
export function resizeImageToSquareDataUrl(file: File, size = 256, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("画像ファイルを選択してください。"));
      return;
    }
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      reject(new Error("画像サイズが大きすぎます。15MB以下のファイルを選んでください。"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("画像の処理に失敗しました。"));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
