# Guide de Configuration avec Vercel CLI

Configuration complète de votre projet avec la Vercel CLI en une seule commande ! 🚀

## 🎯 Configuration Automatique (Recommandé)

### Windows (PowerShell)

```powershell
# Exécuter le script de configuration
.\scripts\setup-vercel.ps1
```

### Mac/Linux (Bash)

```bash
# Rendre le script exécutable
chmod +x scripts/setup-vercel.sh

# Exécuter le script de configuration
./scripts/setup-vercel.sh
```

Le script va automatiquement :
- ✅ Installer Vercel CLI (si nécessaire)
- ✅ Vous connecter à Vercel
- ✅ Créer/lier votre projet
- ✅ Créer un Blob Store pour les images
- ✅ Télécharger les variables d'environnement
- ✅ Générer un JWT_SECRET
- ✅ Configurer la base de données
- ✅ Créer les fichiers .env

---

## 📝 Configuration Manuelle (Étape par étape)

Si vous préférez contrôler chaque étape :

### 1. Installer Vercel CLI

```bash
npm install -g vercel
```

### 2. Se connecter à Vercel

```bash
vercel login
```

Une page web s'ouvrira pour l'authentification.

### 3. Lier le projet

```bash
cd D:\Documents\aiprojets\blocnotes\blocnotes
vercel link
```

**Répondez aux questions :**
- `Set up and deploy?` → **N** (pas encore)
- `Which scope?` → Sélectionnez votre compte
- `Link to existing project?` → **N** (nouveau projet)
- `What's your project's name?` → **blocnotes**

### 4. Créer le Blob Store

```bash
vercel blob create blocnotes-images
```

Cela va créer un store pour stocker les images.

### 5. Créer la base de données PostgreSQL (Option 1 - Vercel)

```bash
vercel postgres create blocnotes-db
```

**Ou Option 2 - Neon Database (gratuit) :**

1. Allez sur https://neon.tech
2. Créez un compte (gratuit)
3. Créez un nouveau projet
4. Copiez la connection string

### 6. Télécharger les variables d'environnement

```bash
vercel env pull .env.local
```

Cela télécharge toutes les variables (BLOB_READ_WRITE_TOKEN, DATABASE_URL, etc.)

### 7. Ajouter les variables manquantes

```bash
# Générer un JWT_SECRET
openssl rand -base64 32

# Ajouter manuellement dans .env.local
echo 'JWT_SECRET="votre-secret-genere"' >> .env.local

# Si vous utilisez Neon ou autre DB externe
echo 'DATABASE_URL="postgresql://..."' >> .env.local
```

### 8. Copier pour le développement local

```bash
cp .env.local .env
```

### 9. Exécuter les migrations

```bash
npm run db:migrate
```

### 10. Démarrer le projet

```bash
npm run dev
```

---

## 🔍 Vérification de la Configuration

### Vérifier que tout est installé

```bash
# Vercel CLI
vercel --version

# Node.js
node --version

# npm
npm --version
```

### Vérifier les variables d'environnement

```bash
# Windows (PowerShell)
Get-Content .env.local

# Mac/Linux
cat .env.local
```

**Vous devriez voir :**
```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
DATABASE_URL="postgresql://..."
POSTGRES_URL="postgresql://..."
JWT_SECRET="..."
```

### Tester le Blob Store

```bash
# Uploader un fichier de test
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-image.jpg"
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "url": "https://xxxxx.public.blob.vercel-storage.com/..."
  }
}
```

---

## 🚀 Commandes Vercel Utiles

### Gestion du projet

```bash
# Lister vos projets
vercel projects ls

# Voir les infos du projet actuel
vercel project ls

# Changer de projet
vercel switch
```

### Gestion des environnements

```bash
# Lister les variables d'environnement
vercel env ls

# Ajouter une variable
vercel env add JWT_SECRET

# Supprimer une variable
vercel env rm JWT_SECRET

# Télécharger les variables
vercel env pull .env.local

# Uploader une variable
vercel env add JWT_SECRET production < secret.txt
```

### Gestion du Blob Storage

```bash
# Lister les stores
vercel blob ls

# Créer un nouveau store
vercel blob create nom-du-store

# Supprimer un store
vercel blob rm nom-du-store
```

### Gestion de PostgreSQL

```bash
# Lister les bases de données
vercel postgres ls

# Créer une base
vercel postgres create nom-db

# Se connecter à la base (psql)
vercel postgres connect
```

### Déploiement

```bash
# Déploiement preview (test)
vercel

# Déploiement production
vercel --prod

# Voir les déploiements
vercel ls

# Rollback vers un déploiement précédent
vercel rollback
```

---

## 🐛 Dépannage

### "Command not found: vercel"

```bash
# Réinstaller globalement
npm install -g vercel

# Ou utiliser npx
npx vercel login
```

### "Not authorized"

```bash
# Se reconnecter
vercel logout
vercel login
```

### "BLOB_READ_WRITE_TOKEN not found"

```bash
# Vérifier que le store est lié
vercel blob ls

# Reconnecter le store au projet
# 1. Dashboard Vercel → Storage → Blob Store
# 2. Settings → Connect Project
# 3. Sélectionnez votre projet

# Puis re-télécharger les variables
vercel env pull .env.local
```

### "DATABASE_URL not found"

```bash
# Option 1: Créer une DB Vercel
vercel postgres create blocnotes-db

# Option 2: Ajouter manuellement
vercel env add DATABASE_URL
# Collez votre connection string
```

### Le Blob Store existe déjà

```bash
# Lister les stores existants
vercel blob ls

# Utiliser le store existant
# Pas besoin de recréer, juste lier au projet via le dashboard
```

---

## 📊 Architecture de Configuration

```
Projet Local
├── .env.local          ← Téléchargé depuis Vercel
├── .env                ← Copie pour dev local
└── .env.example        ← Template (committé dans git)

Vercel Cloud
├── Project: blocnotes
├── Blob Store: blocnotes-images
│   └── BLOB_READ_WRITE_TOKEN
├── Postgres: blocnotes-db
│   └── DATABASE_URL
│   └── POSTGRES_URL
└── Environment Variables
    ├── Production
    ├── Preview
    └── Development
```

---

## 🎯 Checklist de Configuration

### Avant de commencer
- [ ] Node.js 18+ installé
- [ ] npm installé
- [ ] Compte Vercel créé
- [ ] Git installé (optionnel)

### Configuration
- [ ] Vercel CLI installé (`npm i -g vercel`)
- [ ] Connecté à Vercel (`vercel login`)
- [ ] Projet lié (`vercel link`)
- [ ] Blob Store créé (`vercel blob create`)
- [ ] Base de données créée (`vercel postgres create`)
- [ ] Variables téléchargées (`vercel env pull`)
- [ ] JWT_SECRET ajouté (manuellement)
- [ ] .env créé (`cp .env.local .env`)

### Test
- [ ] Migrations exécutées (`npm run db:migrate`)
- [ ] Serveur démarré (`npm run dev`)
- [ ] Upload d'image testé
- [ ] Base de données accessible

### Déploiement
- [ ] Build réussi (`npm run build`)
- [ ] Preview déployé (`vercel`)
- [ ] Production déployée (`vercel --prod`)

---

## 💡 Tips & Astuces

### Accélérer la configuration

```bash
# Tout en une ligne
vercel login && vercel link && vercel blob create images && vercel postgres create db && vercel env pull
```

### Développement local sans Vercel

Si vous voulez développer sans Vercel (juste pour tester) :

```bash
# Utiliser le stockage local
mv app/api/upload/route-local.ts app/api/upload/route.ts

# Utiliser une DB locale (PostgreSQL)
# Installez PostgreSQL localement
# DATABASE_URL="postgresql://localhost:5432/blocnotes"
```

### Script de réinitialisation

Si vous voulez tout recommencer :

```bash
# Supprimer la configuration locale
rm -rf .vercel .env .env.local

# Déconnecter
vercel logout

# Recommencer
vercel login
```

### Partager le projet avec l'équipe

```bash
# Chaque membre de l'équipe doit :
git clone <repo>
cd blocnotes
vercel link  # Lier au même projet
vercel env pull .env.local  # Télécharger les secrets
npm install
npm run db:migrate
npm run dev
```

---

## 🔗 Ressources

- **Vercel CLI Docs** : https://vercel.com/docs/cli
- **Vercel Blob** : https://vercel.com/docs/storage/vercel-blob
- **Vercel Postgres** : https://vercel.com/docs/storage/vercel-postgres
- **Dashboard** : https://vercel.com/dashboard

---

## ⏭️ Prochaines Étapes

Une fois configuré :

1. ✅ **Tester l'application**
   ```bash
   npm run dev
   ```

2. ✅ **Créer votre première room**
   ```bash
   curl -X PUT http://localhost:3000/api/auth \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Room","password":"admin123"}'
   ```

3. ✅ **Déployer en production**
   ```bash
   vercel --prod
   ```

4. ✅ **Personnaliser** : Voir `TODO.md` pour les prochaines fonctionnalités

---

Bonne configuration ! 🎉
