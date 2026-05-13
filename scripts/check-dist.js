import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'client', 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log('\n🔍 Verificando build do frontend...\n');
console.log(`📁 Caminho dist: ${distPath}`);
console.log(`📄 Caminho index.html: ${indexPath}\n`);

if (fs.existsSync(distPath)) {
  console.log('✅ Pasta dist existe');
  
  const files = fs.readdirSync(distPath);
  console.log(`📊 Arquivos/pastas na dist: ${files.length}`);
  console.log('📑 Listagem:');
  files.forEach(file => {
    const filePath = path.join(distPath, file);
    const stats = fs.statSync(filePath);
    const type = stats.isDirectory() ? '📁' : '📄';
    const size = stats.isDirectory() ? '' : ` (${(stats.size / 1024).toFixed(2)} KB)`;
    console.log(`  ${type} ${file}${size}`);
  });
  
  if (fs.existsSync(indexPath)) {
    console.log('\n✅ index.html encontrado');
    const indexSize = fs.statSync(indexPath).size;
    console.log(`📏 Tamanho: ${(indexSize / 1024).toFixed(2)} KB`);
    
    if (indexSize > 0) {
      console.log('\n✅ Build do frontend OK!');
      process.exit(0);
    } else {
      console.error('\n❌ index.html está vazio!');
      process.exit(1);
    }
  } else {
    console.error('\n❌ index.html não encontrado na pasta dist!');
    console.error('Execute: npm run build:full');
    process.exit(1);
  }
} else {
  console.error('❌ Pasta dist não existe!');
  console.error('Execute: npm run build:full');
  process.exit(1);
}
