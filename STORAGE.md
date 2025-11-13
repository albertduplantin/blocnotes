# Guide de Configuration du Stockage d'Images

Ce guide explique comment configurer le stockage d'images pour votre application.

## 🎯 **Options disponibles**

1. **Vercel Blob** (Recommandé pour production)
2. **Cloudinary** (Alternative gratuite)
3. **AWS S3** (Scalable, payant)
4. **Stockage local** (Développement uniquement)

---

## 🚀 **Option 1 : Vercel Blob (Recommandé)**

### Avantages
- ✅ Intégration native avec Vercel
- ✅ CDN global automatique
- ✅ Gratuit jusqu'à 1GB
- ✅ Simple à configurer

### Configuration pas à pas

#### 1. Créer un compte Vercel
- Allez sur https://vercel.com/signup
- Connectez-vous avec GitHub

#### 2. Créer un Blob Store

**Via le Dashboard :**

```
1. Allez sur https://vercel.com/dashboard
2. Cliquez sur votre projet (ou créez-le)
3. Menu "Storage" → "Create Database"
4. Sélectionnez "Blob"
5. Nom : "blocnotes-images"
6. Cliquez "Create"
```

**Via la CLI :**

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Lier le projet
vercel link

# Créer le Blob Store
vercel blob create blocnotes-images

# Télécharger les variables d'environnement
vercel env pull .env.local
```

#### 3. Obtenir le token

**Méthode A - Via Dashboard :**
```
1. Projet → Storage → Votre Blob Store
2. "Settings" → "Connect Project"
3. Sélectionnez votre projet
4. Le token apparaît dans "Environment Variables"
5. Copiez BLOB_READ_WRITE_TOKEN
```

**Méthode B - Via CLI :**
```bash
# Le token est automatiquement dans .env.local après "vercel env pull"
cat .env.local | grep BLOB_READ_WRITE_TOKEN
```

#### 4. Ajouter à .env

```bash
# .env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXXXXXXXXXXX"
```

#### 5. Vérifier que ça marche

```bash
# Démarrer le serveur
npm run dev

# Tester l'upload
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/image.jpg"
```

### Tarification Vercel Blob
- **Hobby (Gratuit)** : 1GB stockage, 100GB bandwidth
- **Pro ($20/mois)** : 100GB stockage, 1TB bandwidth
- **Enterprise** : Custom

---

## ☁️ **Option 2 : Cloudinary (Alternative gratuite)**

### Avantages
- ✅ Gratuit jusqu'à 25GB
- ✅ Transformations d'images automatiques
- ✅ CDN inclus
- ✅ Optimisation automatique

### Configuration

#### 1. Créer un compte
- https://cloudinary.com/users/register/free
- Confirmez votre email

#### 2. Obtenir les credentials
```
Dashboard → Account Details
- Cloud Name
- API Key
- API Secret
```

#### 3. Installer le SDK

```bash
npm install cloudinary
```

#### 4. Créer la route d'upload Cloudinary

Créez `app/api/upload/route.ts` :

```typescript
import { NextRequest } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { rateLimit, addRateLimitHeaders } from '@/lib/middleware/rateLimit';
import { errorResponse, successResponse, withErrorHandling } from '@/lib/utils';
import { HTTP_STATUS, ERROR_MESSAGES, APP_CONFIG } from '@/lib/constants';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const rateLimitResult = await rateLimit(request, { maxRequests: 20, windowMs: 60000 });
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return errorResponse('Aucun fichier fourni', HTTP_STATUS.BAD_REQUEST);
  }

  // Validate
  if (!APP_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    return errorResponse(ERROR_MESSAGES.INVALID_FILE_TYPE, HTTP_STATUS.BAD_REQUEST);
  }

  if (file.size > APP_CONFIG.MAX_FILE_SIZE_BYTES) {
    return errorResponse(ERROR_MESSAGES.FILE_TOO_LARGE, HTTP_STATUS.BAD_REQUEST);
  }

  // Convert to base64
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString('base64');
  const dataUri = `data:${file.type};base64,${base64}`;

  // Upload to Cloudinary
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'blocnotes',
    resource_type: 'auto',
  });

  const response = successResponse(
    { url: result.secure_url },
    'Image uploadée avec succès',
    HTTP_STATUS.CREATED
  );

  return addRateLimitHeaders(response, rateLimitResult);
});
```

#### 5. Variables d'environnement

```bash
# .env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="your-secret-key"
```

### Tarification Cloudinary
- **Free** : 25GB stockage, 25GB bandwidth/mois
- **Plus ($99/mois)** : 140GB stockage, 140GB bandwidth
- **Advanced** : Custom

---

## 📦 **Option 3 : AWS S3**

### Avantages
- ✅ Très scalable
- ✅ Prix compétitifs à grande échelle
- ✅ Contrôle total

### Configuration rapide

#### 1. Créer un bucket S3
```
1. Console AWS → S3
2. "Create bucket"
3. Nom : "blocnotes-images-{random}"
4. Region : us-east-1
5. Désactiver "Block all public access"
6. Create
```

#### 2. Créer un utilisateur IAM
```
1. IAM → Users → Create user
2. Nom : "blocnotes-uploader"
3. Permissions : AmazonS3FullAccess (ou custom policy)
4. Créer Access Key
5. Copier Access Key ID et Secret
```

#### 3. Installer le SDK

```bash
npm install @aws-sdk/client-s3
```

#### 4. Variables d'environnement

```bash
# .env
AWS_ACCESS_KEY_ID="AKIAXXXXXXXXXX"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="blocnotes-images-abc123"
```

---

## 💻 **Option 4 : Stockage Local (Dev uniquement)**

### ⚠️ ATTENTION
- ❌ **NE PAS utiliser en production**
- ❌ Les images sont perdues lors du redéploiement
- ✅ **OK pour le développement local**

### Configuration

#### 1. Utiliser la route locale

```bash
# Renommer le fichier
mv app/api/upload/route-local.ts app/api/upload/route.ts
```

#### 2. Créer le dossier uploads

```bash
mkdir -p public/uploads
```

#### 3. Ajouter au .gitignore

```bash
echo "public/uploads/*" >> .gitignore
```

#### 4. Variables d'environnement

```bash
# .env
# Pas de variable nécessaire pour le stockage local
NODE_ENV="development"
```

#### 5. Tester

```bash
npm run dev

# Uploader une image
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-image.jpg"

# L'image sera accessible à :
# http://localhost:3000/uploads/abc123.jpg
```

---

## 🔄 **Comparaison des options**

| Critère | Vercel Blob | Cloudinary | AWS S3 | Local |
|---------|-------------|------------|--------|-------|
| **Setup** | ⭐⭐⭐ Facile | ⭐⭐⭐ Facile | ⭐⭐ Moyen | ⭐⭐⭐ Facile |
| **Gratuit** | 1GB | 25GB | Payant | Illimité |
| **CDN** | ✅ | ✅ | ⚠️ (CloudFront) | ❌ |
| **Optimisation** | ❌ | ✅ | ❌ | ❌ |
| **Production** | ✅ | ✅ | ✅ | ❌ |
| **Scalabilité** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ |

---

## 🎯 **Recommandations**

### Pour débuter (gratuit)
1. **Développement** : Stockage local
2. **Production** : Cloudinary (25GB gratuit)

### Pour scale
1. **Petite app** : Vercel Blob (simple, intégré)
2. **Moyenne app** : Cloudinary (optimisations incluses)
3. **Grande app** : AWS S3 (contrôle total, scalable)

---

## 🧪 **Tester votre configuration**

### Via curl

```bash
# Upload
curl -X POST http://localhost:3000/api/upload \
  -F "file=@image.jpg"

# Réponse attendue :
{
  "success": true,
  "data": {
    "url": "https://..."
  }
}
```

### Via le frontend (à implémenter)

```javascript
// components/ImageUpload.jsx
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data.data.url;
}
```

---

## 📝 **Checklist de configuration**

### Pour Vercel Blob
- [ ] Compte Vercel créé
- [ ] Blob Store créé
- [ ] Token copié dans .env
- [ ] Test d'upload réussi

### Pour Cloudinary
- [ ] Compte créé
- [ ] Credentials copiés
- [ ] SDK installé (`npm install cloudinary`)
- [ ] Route d'upload créée
- [ ] Test d'upload réussi

### Pour AWS S3
- [ ] Bucket S3 créé
- [ ] Utilisateur IAM créé
- [ ] Access keys générées
- [ ] SDK installé
- [ ] Route d'upload créée

### Pour Local (dev)
- [ ] Route locale activée
- [ ] Dossier public/uploads créé
- [ ] .gitignore mis à jour
- [ ] Test d'upload réussi

---

## 🐛 **Résolution de problèmes**

### "BLOB_READ_WRITE_TOKEN not found"
```bash
# Vérifier que la variable est définie
echo $BLOB_READ_WRITE_TOKEN

# Vérifier le fichier .env
cat .env | grep BLOB_READ_WRITE_TOKEN

# Redémarrer le serveur
npm run dev
```

### "Upload failed: 401 Unauthorized"
- Token invalide ou expiré
- Vérifier sur Vercel Dashboard
- Régénérer le token si nécessaire

### "File too large"
- Limite actuelle : 5MB
- Modifier dans `lib/constants.ts` :
```typescript
MAX_FILE_SIZE_MB: 10,  // Augmenter à 10MB
```

### "Invalid file type"
- Types acceptés : JPEG, PNG, GIF, WebP
- Ajouter d'autres types dans `lib/constants.ts`

---

## 📚 **Ressources**

- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [Cloudinary Docs](https://cloudinary.com/documentation)
- [AWS S3 Docs](https://docs.aws.amazon.com/s3/)

---

## ⏭️ **Prochaine étape**

Une fois le stockage configuré, continuez avec :
```bash
npm run dev
# Testez l'upload d'images dans le chat
```
