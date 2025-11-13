# Script de configuration Vercel automatique (PowerShell)
# Usage: .\scripts\setup-vercel.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🚀 Configuration de Vercel pour blocnotes" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

function Write-Info {
    param($Message)
    Write-Host "ℹ " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param($Message)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning2 {
    param($Message)
    Write-Host "⚠ " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error2 {
    param($Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

# Vérifier si Vercel CLI est installé
Write-Info "Vérification de Vercel CLI..."
try {
    $vercelVersion = vercel --version 2>&1
    Write-Success "Vercel CLI déjà installé ($vercelVersion)"
} catch {
    Write-Warning2 "Vercel CLI n'est pas installé"
    Write-Info "Installation de Vercel CLI..."
    npm install -g vercel
    Write-Success "Vercel CLI installé"
}

Write-Host ""
Write-Info "Connexion à Vercel..."
Write-Host "Une page de connexion va s'ouvrir dans votre navigateur"
vercel login

Write-Host ""
Write-Success "Connecté à Vercel !"

# Lier le projet
Write-Host ""
Write-Info "Configuration du projet..."
Write-Host "Répondez aux questions suivantes :"
Write-Host "  - Set up and deploy? " -NoNewline
Write-Host "N" -ForegroundColor Yellow -NoNewline
Write-Host " (non, juste la configuration)"
Write-Host "  - Which scope? " -NoNewline
Write-Host "Sélectionnez votre compte" -ForegroundColor Yellow
Write-Host "  - Link to existing project? " -NoNewline
Write-Host "N" -ForegroundColor Yellow -NoNewline
Write-Host " (nouveau projet)"
Write-Host "  - Project name? " -NoNewline
Write-Host "blocnotes" -ForegroundColor Yellow -NoNewline
Write-Host " (ou votre choix)"
Write-Host ""

vercel link

Write-Host ""
Write-Success "Projet lié à Vercel"

# Créer le Blob Store
Write-Host ""
Write-Info "Création du Blob Store pour les images..."
vercel blob create blocnotes-images

Write-Host ""
Write-Success "Blob Store créé !"

# Télécharger les variables d'environnement
Write-Host ""
Write-Info "Téléchargement des variables d'environnement..."

# Créer .env.local si il n'existe pas
if (-not (Test-Path .env.local)) {
    New-Item -ItemType File -Path .env.local -Force | Out-Null
}

vercel env pull .env.local

Write-Success "Variables d'environnement téléchargées dans .env.local"

# Vérifier que le token Blob est présent
Write-Host ""
Write-Info "Vérification de la configuration..."

$envContent = Get-Content .env.local -Raw
if ($envContent -match "BLOB_READ_WRITE_TOKEN") {
    Write-Success "BLOB_READ_WRITE_TOKEN trouvé !"
    if ($envContent -match 'BLOB_READ_WRITE_TOKEN="?([^"\r\n]+)"?') {
        $blobToken = $matches[1]
        if ($blobToken) {
            Write-Host "   Token: $($blobToken.Substring(0, [Math]::Min(20, $blobToken.Length)))..."
        }
    }
} else {
    Write-Warning2 "BLOB_READ_WRITE_TOKEN non trouvé"
    Write-Host "   Vous devrez peut-être reconnecter le Blob Store au projet"
}

# Ajouter les autres variables manquantes
Write-Host ""
Write-Info "Configuration des variables d'environnement supplémentaires..."

if (Test-Path .env.example) {
    # JWT_SECRET
    if ($envContent -notmatch "JWT_SECRET") {
        Write-Host ""
        Write-Warning2 "JWT_SECRET manquant"
        $generateJwt = Read-Host "Voulez-vous générer un JWT_SECRET aléatoire ? (Y/n)"
        if ($generateJwt -eq "" -or $generateJwt -eq "Y" -or $generateJwt -eq "y") {
            $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
            Add-Content -Path .env.local -Value "JWT_SECRET=`"$jwtSecret`""
            Write-Success "JWT_SECRET généré et ajouté"
        } else {
            Write-Info "Ajoutez manuellement JWT_SECRET dans .env.local"
        }
    }

    # DATABASE_URL
    if ($envContent -notmatch "DATABASE_URL") {
        Write-Host ""
        Write-Warning2 "DATABASE_URL manquant"
        Write-Info "Vous devez configurer une base de données PostgreSQL"
        Write-Host ""
        Write-Host "Options :"
        Write-Host "  1. Vercel Postgres (recommandé)"
        Write-Host "  2. Neon Database (gratuit)"
        Write-Host "  3. Supabase"
        Write-Host "  4. Entrer manuellement"
        Write-Host ""
        $dbChoice = Read-Host "Choisissez une option (1-4)"

        switch ($dbChoice) {
            "1" {
                Write-Info "Création d'une base Vercel Postgres..."
                vercel postgres create blocnotes-db
                vercel env pull .env.local
                Write-Success "Base de données Vercel Postgres créée"
            }
            "2" {
                Write-Info "Créez une base sur https://neon.tech"
                $databaseUrl = Read-Host "Entrez votre DATABASE_URL"
                Add-Content -Path .env.local -Value "DATABASE_URL=`"$databaseUrl`""
                Write-Success "DATABASE_URL ajouté"
            }
            "3" {
                Write-Info "Créez une base sur https://supabase.com"
                $databaseUrl = Read-Host "Entrez votre DATABASE_URL"
                Add-Content -Path .env.local -Value "DATABASE_URL=`"$databaseUrl`""
                Write-Success "DATABASE_URL ajouté"
            }
            "4" {
                $databaseUrl = Read-Host "Entrez votre DATABASE_URL"
                Add-Content -Path .env.local -Value "DATABASE_URL=`"$databaseUrl`""
                Write-Success "DATABASE_URL ajouté"
            }
        }
    }
}

# Copier .env.local vers .env pour le développement
if (-not (Test-Path .env)) {
    Copy-Item .env.local .env
    Write-Success ".env créé depuis .env.local"
}

# Résumé
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✓ Configuration terminée !" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Résumé :"
Write-Host "  • Projet Vercel: blocnotes"
Write-Host "  • Blob Store: blocnotes-images"
Write-Host "  • Variables d'environnement: .env.local et .env"
Write-Host ""

# Vérifier les variables critiques
Write-Host "🔍 Variables configurées :"
$finalEnvContent = Get-Content .env.local -Raw

if ($finalEnvContent -match "BLOB_READ_WRITE_TOKEN") {
    Write-Host "  ✓ BLOB_READ_WRITE_TOKEN" -ForegroundColor Green
} else {
    Write-Host "  ✗ BLOB_READ_WRITE_TOKEN (manquant)" -ForegroundColor Red
}

if ($finalEnvContent -match "DATABASE_URL") {
    Write-Host "  ✓ DATABASE_URL" -ForegroundColor Green
} else {
    Write-Host "  ⚠ DATABASE_URL (manquant)" -ForegroundColor Yellow
}

if ($finalEnvContent -match "JWT_SECRET") {
    Write-Host "  ✓ JWT_SECRET" -ForegroundColor Green
} else {
    Write-Host "  ⚠ JWT_SECRET (manquant)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Prochaines étapes :"
Write-Host "  1. Vérifiez les variables dans .env.local"
Write-Host "  2. Exécutez: npm run db:migrate"
Write-Host "  3. Démarrez: npm run dev"
Write-Host "  4. Testez l'upload d'images"
Write-Host ""
Write-Host "Pour déployer en production :"
Write-Host "  vercel --prod"
Write-Host ""
