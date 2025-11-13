#!/bin/bash

# Script de configuration Vercel automatique
# Usage: bash scripts/setup-vercel.sh

set -e  # Exit on error

echo "🚀 Configuration de Vercel pour blocnotes"
echo "=========================================="
echo ""

# Couleurs pour le terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Vérifier si Vercel CLI est installé
info "Vérification de Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    warning "Vercel CLI n'est pas installé"
    info "Installation de Vercel CLI..."
    npm install -g vercel
    success "Vercel CLI installé"
else
    success "Vercel CLI déjà installé ($(vercel --version))"
fi

echo ""
info "Connexion à Vercel..."
echo "Une page de connexion va s'ouvrir dans votre navigateur"
vercel login

echo ""
success "Connecté à Vercel !"

# Lier le projet
echo ""
info "Configuration du projet..."
echo "Répondez aux questions suivantes :"
echo "  - Set up and deploy? ${YELLOW}N${NC} (non, juste la configuration)"
echo "  - Which scope? ${YELLOW}Sélectionnez votre compte${NC}"
echo "  - Link to existing project? ${YELLOW}N${NC} (nouveau projet)"
echo "  - Project name? ${YELLOW}blocnotes${NC} (ou votre choix)"
echo ""

vercel link

echo ""
success "Projet lié à Vercel"

# Créer le Blob Store
echo ""
info "Création du Blob Store pour les images..."
vercel blob create blocnotes-images

echo ""
success "Blob Store créé !"

# Télécharger les variables d'environnement
echo ""
info "Téléchargement des variables d'environnement..."

# Créer .env.local si il n'existe pas
if [ ! -f .env.local ]; then
    touch .env.local
fi

vercel env pull .env.local

success "Variables d'environnement téléchargées dans .env.local"

# Vérifier que le token Blob est présent
echo ""
info "Vérification de la configuration..."

if grep -q "BLOB_READ_WRITE_TOKEN" .env.local; then
    success "BLOB_READ_WRITE_TOKEN trouvé !"
    BLOB_TOKEN=$(grep "BLOB_READ_WRITE_TOKEN" .env.local | cut -d '=' -f 2 | tr -d '"')
    echo "   Token: ${BLOB_TOKEN:0:20}..."
else
    warning "BLOB_READ_WRITE_TOKEN non trouvé"
    echo "   Vous devrez peut-être reconnecter le Blob Store au projet"
fi

# Ajouter les autres variables manquantes
echo ""
info "Configuration des variables d'environnement supplémentaires..."

if [ -f .env.example ]; then
    # Lire .env.example et demander les valeurs manquantes

    # JWT_SECRET
    if ! grep -q "JWT_SECRET" .env.local; then
        echo ""
        warning "JWT_SECRET manquant"
        read -p "Voulez-vous générer un JWT_SECRET aléatoire ? (Y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
            JWT_SECRET=$(openssl rand -base64 32)
            echo "JWT_SECRET=\"$JWT_SECRET\"" >> .env.local
            success "JWT_SECRET généré et ajouté"
        else
            info "Ajoutez manuellement JWT_SECRET dans .env.local"
        fi
    fi

    # DATABASE_URL
    if ! grep -q "DATABASE_URL" .env.local; then
        echo ""
        warning "DATABASE_URL manquant"
        info "Vous devez configurer une base de données PostgreSQL"
        echo ""
        echo "Options :"
        echo "  1. Vercel Postgres (recommandé)"
        echo "  2. Neon Database (gratuit)"
        echo "  3. Supabase"
        echo "  4. Entrer manuellement"
        echo ""
        read -p "Choisissez une option (1-4) : " db_choice

        case $db_choice in
            1)
                info "Création d'une base Vercel Postgres..."
                vercel postgres create blocnotes-db
                vercel env pull .env.local
                success "Base de données Vercel Postgres créée"
                ;;
            2)
                info "Créez une base sur https://neon.tech"
                read -p "Entrez votre DATABASE_URL : " database_url
                echo "DATABASE_URL=\"$database_url\"" >> .env.local
                success "DATABASE_URL ajouté"
                ;;
            3)
                info "Créez une base sur https://supabase.com"
                read -p "Entrez votre DATABASE_URL : " database_url
                echo "DATABASE_URL=\"$database_url\"" >> .env.local
                success "DATABASE_URL ajouté"
                ;;
            4)
                read -p "Entrez votre DATABASE_URL : " database_url
                echo "DATABASE_URL=\"$database_url\"" >> .env.local
                success "DATABASE_URL ajouté"
                ;;
        esac
    fi
fi

# Copier .env.local vers .env pour le développement
if [ ! -f .env ]; then
    cp .env.local .env
    success ".env créé depuis .env.local"
fi

# Résumé
echo ""
echo "=========================================="
echo -e "${GREEN}✓ Configuration terminée !${NC}"
echo "=========================================="
echo ""
echo "📋 Résumé :"
echo "  • Projet Vercel: $(vercel project ls 2>/dev/null | head -n 2 | tail -n 1 || echo 'blocnotes')"
echo "  • Blob Store: blocnotes-images"
echo "  • Variables d'environnement: .env.local et .env"
echo ""

# Vérifier les variables critiques
echo "🔍 Variables configurées :"
if grep -q "BLOB_READ_WRITE_TOKEN" .env.local; then
    echo -e "  ${GREEN}✓${NC} BLOB_READ_WRITE_TOKEN"
else
    echo -e "  ${RED}✗${NC} BLOB_READ_WRITE_TOKEN (manquant)"
fi

if grep -q "DATABASE_URL" .env.local; then
    echo -e "  ${GREEN}✓${NC} DATABASE_URL"
else
    echo -e "  ${YELLOW}⚠${NC} DATABASE_URL (manquant)"
fi

if grep -q "JWT_SECRET" .env.local; then
    echo -e "  ${GREEN}✓${NC} JWT_SECRET"
else
    echo -e "  ${YELLOW}⚠${NC} JWT_SECRET (manquant)"
fi

echo ""
echo "🎯 Prochaines étapes :"
echo "  1. Vérifiez les variables dans .env.local"
echo "  2. Exécutez: npm run db:migrate"
echo "  3. Démarrez: npm run dev"
echo "  4. Testez l'upload d'images"
echo ""
echo "Pour déployer en production :"
echo "  vercel --prod"
echo ""
