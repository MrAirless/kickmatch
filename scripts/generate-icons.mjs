import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

async function generateIcon(size) {
  const padding = Math.round(size * 0.08)
  const logoSize = size - padding * 2

  // Logo mit weißem Hintergrund zusammensetzen
  const logo = await sharp(join(publicDir, 'logo.png'))
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer()

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 },
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(join(publicDir, `pwa-${size}.png`))

  console.log(`✓ pwa-${size}.png erstellt`)
}

await generateIcon(192)
await generateIcon(512)
console.log('Alle Icons fertig!')
