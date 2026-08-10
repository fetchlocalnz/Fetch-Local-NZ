// iPhones save photos as HEIC by default, which most browsers can't
// preview or display. This quietly converts HEIC files to JPEG right
// after someone picks them, before anything else happens — so people
// never need to think about file formats.
export async function normalizePhotoFile(file) {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  if (!isHeic) {
    return file;
  }

  const heic2any = (await import("heic2any")).default;
  const convertedBlob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });

  const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([convertedBlob], newName, { type: "image/jpeg" });
}
