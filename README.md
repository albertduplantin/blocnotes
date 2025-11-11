# SecureNotes

Une PWA de bloc-notes sécurisée cachant un chat chiffré 1-to-1 avec mode panique.

## Fonctionnalités

- **Interface publique** : Application de bloc-notes style Google Keep
- **Interface secrète** : Chat chiffré WhatsApp-like déclenché par raccourcis
- **Chiffrement** : AES-GCM + ECDH pour échange de clés
- **Mode panique** : Effacement instantané des données
- **PWA** : Installation et fonctionnement hors ligne
- **Auto-destruction** : Messages supprimés après 24h

## Déploiement

### 1. Prérequis

- Node.js 18+
- Compte Vercel
- Compte Neon (PostgreSQL)
- Compte Clerk (authentification)

### 2. Configuration Neon (Base de données)

1. Créer un projet sur [Neon](https://neon.tech)
2. Créer une base de données
3. Copier l'URL de connexion PostgreSQL

### 3. Configuration Clerk (Authentification)

1. Créer une application sur [Clerk](https://clerk.com)
2. Configurer les URLs de redirection :
   - Home URL : `https://votre-domaine.vercel.app`
   - Authorized redirect URIs : `https://votre-domaine.vercel.app/api/auth/callback`
3. Copier les clés API

### 4. Configuration Vercel Blob (Stockage optionnel)

1. Activer Vercel Blob dans votre projet Vercel
2. Générer un token d'accès

### 5. Variables d'environnement

Créer un fichier `.env.local` avec :

```env
# Base de données Neon
DATABASE_URL="postgresql://username:password@hostname/database?sslmode=require"

# Authentification Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stockage Vercel Blob (optionnel)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Token de nettoyage (pour cron)
CLEANUP_TOKEN=securenotes-cleanup-2024
```

### 6. Déploiement sur Vercel

1. Pousser le code sur GitHub
2. Importer le projet sur Vercel
3. Configurer les variables d'environnement
4. Déployer

### 7. Migration de la base de données

Après déploiement, exécuter les migrations :

```bash
npm run db:push
```

### 8. Configuration du cron (Nettoyage automatique)

Dans Vercel, ajouter un cron job :

- URL : `https://votre-domaine.vercel.app/api/cleanup`
- Méthode : POST
- Headers : `Authorization: Bearer securenotes-cleanup-2024`
- Fréquence : `0 */6 * * *` (toutes les 6 heures)

### 9. Icônes PWA

Ajouter les icônes dans `/public/` :
- `icon-192x192.png`
- `icon-512x512.png`
- `favicon.ico`

## Utilisation

### Interface Notes
- Créer, éditer, supprimer des notes
- Recherche en temps réel
- Couleurs personnalisables
- Stockage local (localStorage)

### Accès au Chat
- Double-clic n'importe où
- Alt + F9
- Ctrl + Maj + M
- Touche *

### Appairage
1. Générer un QR code
2. Scanner avec l'appareil du contact
3. Échange automatique des clés ECDH

### Mode Panique
- Ctrl + Maj + Escape
- Ou bouton "Déconnexion"
- Efface toutes les données locales
- Redirige vers l'interface notes

## Sécurité

- Chiffrement de bout en bout
- Clés non extractables
- Auto-destruction des messages
- Authentification obligatoire
- Mode panique instantané

## Technologies

- **Frontend** : Next.js 14 (App Router)
- **Backend** : API Routes Next.js
- **Base de données** : Neon PostgreSQL + Drizzle ORM
- **Authentification** : Clerk
- **Chiffrement** : Web Crypto API
- **PWA** : Service Worker
- **Déploiement** : Vercel
- **Stockage** : Vercel Blob (optionnel)

## Développement

```bash
# Installation
npm install

# Développement
npm run dev

# Build
npm run build

# Migration DB
npm run db:generate
npm run db:push
```

## Licence

Ce projet est fourni à des fins éducatives. Utilisez-le de manière responsable et légale.