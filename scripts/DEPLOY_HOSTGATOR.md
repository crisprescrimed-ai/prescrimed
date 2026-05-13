Deploy Template para Hostgator (FTP)

Pré-requisitos
- Node.js instalado (>=16)
- Acesso FTP/FTPS ao Hostgator (host, usuário, senha)

Passos rápidos
1) Na pasta do projeto instale a dependência (não salva no package.json):

```bash
npm install basic-ftp --no-save
```

2) Exporte as variáveis de ambiente com suas credenciais (PowerShell):

```powershell
$env:HOSTGATOR_HOST='ftp.seudominio.com'
$env:HOSTGATOR_USER='usuario_ftp'
$env:HOSTGATOR_PASS='senha_ftp'
$env:HOSTGATOR_PATH='/public_html' # ajuste se necessário
$env:HOSTGATOR_SECURE='false' # 'true' para FTPS
node scripts/deploy_hostgator.mjs
```

3) Verifique no host (substitua por seu domínio):

```bash
curl -I https://seudominio.com/
curl -I https://seudominio.com/assets/index-*.js
```

Observações e dicas
- O script usará `Template/` como origem e fará upload recursivo para o diretório remoto especificado.
- Por segurança, o script NÃO remove arquivos remotos extras. Se precisar sincronizar removendo arquivos obsoletos, peça que eu adicione essa opção.
- Se o seu host exigir FTPS, defina `HOSTGATOR_SECURE=true`.
- Para automações CI, configure as mesmas variáveis de ambiente no pipeline e execute `node scripts/deploy_hostgator.mjs`.
