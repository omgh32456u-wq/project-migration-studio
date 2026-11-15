/** Browser-only: call from event handlers. Centre-crops to a square and downsizes to a small JPEG data URL. */
export async function imageFileToAvatar(file: File, size = 256): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif|heic|heif)$/.test(file.type) || file.size > 15_000_000) throw new Error('unsupported image')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('decode failed'))
      el.src = url
    })
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    if (!side) throw new Error('empty image')
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
