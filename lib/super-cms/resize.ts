// super-cms fork addition — client-side image downscale + WebP conversion.
//
// Runs in the browser BEFORE the file is uploaded, so a raw phone photo never
// has to reach the serverless upload route (Vercel caps request bodies at
// 4.5MB). One step solves three problems: stays under that ceiling, keeps the
// git repo small, and serves small images on mobile. `browser-image-compression`
// also bakes EXIF orientation into the pixels, so portrait photos don't end up
// sideways — which a naive <canvas> resize would get wrong.
import imageCompression from "browser-image-compression";

// Raster formats we downscale/convert. Anything else (svg, gif, …) passes
// through untouched.
const PROCESSABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

const MAX_DIMENSION = 2000; // longest side, px
const TARGET_MAX_MB = 1;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!PROCESSABLE.has(file.type)) return file;

  try {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: MAX_DIMENSION,
      maxSizeMB: TARGET_MAX_MB,
      fileType: "image/webp",
      initialQuality: 0.82,
      useWebWorker: true,
    });

    // Give it a .webp name so the stored path/extension matches the output.
    const webpName = file.name.replace(/\.[^./\\]+$/, "") + ".webp";
    return new File([compressed], webpName, { type: "image/webp" });
  } catch {
    // Fail-safe: never block an upload because compression hiccuped.
    return file;
  }
}
