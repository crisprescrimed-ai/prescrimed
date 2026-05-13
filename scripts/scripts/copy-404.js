import fs from 'fs'
import path from 'path'

const distDir = path.resolve(process.cwd(), 'dist')
const src = path.join(distDir, 'index.html')
const dest = path.join(distDir, '404.html')

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest)
    console.log('✅ 404.html criado para GitHub Pages SPA')
  } else {
    console.warn('⚠️ index.html não encontrado em dist; pulei 404.html')
  }
} catch (e) {
  console.error('❌ Falha ao criar 404.html:', e)
  process.exitCode = 0
}
