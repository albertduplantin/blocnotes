# Script simplifié de configuration Vercel (PowerShell)
# Usage: .\scripts\setup-vercel-simple.ps1

Write-Host ""
Write-Host "🚀 Configuration de Vercel pour blocnotes" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier Vercel CLI
Write-Host "1️⃣  Vérification de Vercel CLI..." -ForegroundColor Blue
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "   ✓ Vercel CLI installé ($vercelVersion)" -ForegroundColor Green
}
catch {
    Write-Host "   ⚠ Installation de Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "   ✓ Vercel CLI installé" -ForegroundColor Green
}

# 2. Login
Write-Host ""
Write-Host "2️⃣  Connexion à Vercel..." -ForegroundColor Blue
Write-Host "   Une page va s'ouvrir dans votre navigateur" -ForegroundColor Gray
vercel login
Write-Host "   ✓ Connecté à Vercel" -ForegroundColor Green

# 3. Link project
Write-Host ""
Write-Host "3️⃣  Liaison du projet..." -ForegroundColor Blue
Write-Host "   Répondez aux questions :" -ForegroundColor Gray
Write-Host "     - Set up and deploy? N" -ForegroundColor Yellow
Write-Host "     - Link to existing project? N" -ForegroundColor Yellow
Write-Host "     - Project name? blocnotes" -ForegroundColor Yellow
vercel link
Write-Host "   ✓ Projet lié" -ForegroundColor Green

# 4. Create Blob Store
Write-Host ""
Write-Host "4️⃣  Création du Blob Store..." -ForegroundColor Blue
vercel blob create blocnotes-images
Write-Host "   ✓ Blob Store créé" -ForegroundColor Green

# 5. Create Database
Write-Host ""
Write-Host "5️⃣  Création de la base de données..." -ForegroundColor Blue
$createDb = Read-Host "   Créer une base Vercel Postgres ? (Y/n)"
if ($createDb -eq "" -or $createDb -eq "Y" -or $createDb -eq "y") {
    vercel postgres create blocnotes-db
    Write-Host "   ✓ Base de données créée" -ForegroundColor Green
}
else {
    Write-Host "   ⚠ Base de données ignorée (ajoutez DATABASE_URL manuellement)" -ForegroundColor Yellow
}

# 6. Pull environment variables
Write-Host ""
Write-Host "6️⃣  Téléchargement des variables d'environnement..." -ForegroundColor Blue
vercel env pull .env.local
Write-Host "   ✓ Variables téléchargées" -ForegroundColor Green

# 7. Generate JWT_SECRET
Write-Host ""
Write-Host "7️⃣  Génération du JWT_SECRET..." -ForegroundColor Blue
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Add-Content -Path .env.local -Value "`nJWT_SECRET=`"$jwtSecret`""
Write-Host "   ✓ JWT_SECRET généré" -ForegroundColor Green

# 8. Copy to .env
Write-Host ""
Write-Host "8️⃣  Création du fichier .env..." -ForegroundColor Blue
Copy-Item .env.local .env -Force
Write-Host "   ✓ Fichier .env créé" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✓ Configuration terminée !" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Fichiers créés :" -ForegroundColor Cyan
Write-Host "   • .env.local"
Write-Host "   • .env"
Write-Host "   • .vercel/ (configuration Vercel)"
Write-Host ""
Write-Host "🎯 Prochaines étapes :" -ForegroundColor Cyan
Write-Host "   1. Vérifiez .env.local"
Write-Host "   2. npm run db:migrate"
Write-Host "   3. npm run dev"
Write-Host ""
Write-Host "🚀 Pour déployer :" -ForegroundColor Cyan
Write-Host "   vercel --prod"
Write-Host ""

# Display .env.local
Write-Host "📄 Contenu de .env.local :" -ForegroundColor Cyan
Write-Host "-------------------------------------------"
Get-Content .env.local | ForEach-Object {
    $line = $_
    if ($line -match "^(.+?)=(.*)$") {
        $key = $matches[1]
        $value = $matches[2]
        if ($value.Length -gt 30) {
            $value = $value.Substring(0, 30) + "..."
        }
        Write-Host "  $key = $value"
    }
}
Write-Host "-------------------------------------------"
Write-Host ""
