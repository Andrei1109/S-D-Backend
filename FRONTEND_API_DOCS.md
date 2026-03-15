# SD Beauty Hub – Documentație API pentru Frontend Admin

> **Stack backend:** Next.js 15, TypeScript, Prisma ORM, PostgreSQL (Supabase)
> **Base URL:** `http://localhost:3000` (dev) / `https://yourdomain.com` (prod)
> **Toate răspunsurile** folosesc formatul `{ success: true, data }` sau `{ success: false, error }`

---

## Cuprins

1. [Autentificare](#1-autentificare)
2. [Produse (Admin)](#2-produse-admin)
3. [Comenzi (Admin)](#3-comenzi-admin)
4. [Produse (Public)](#4-produse-public)
5. [Categorii (Public)](#5-categorii-public)
6. [Checkout (Public)](#6-checkout-public)
7. [Plăți Netopia (Public)](#7-plăți-netopia)
8. [Schema completă DB](#8-schema-bază-de-date)
9. [Enums](#9-enums)
10. [Reguli de business](#10-reguli-de-business)
11. [Variabile de mediu](#11-variabile-de-mediu)

---

## 1. Autentificare

### `POST /api/admin/login`

Obține un JWT token pentru sesiunea de admin. **Singura rută admin publică.**

**Request body:**
```json
{
  "email": "admin@sdbeautyhub.ro",
  "password": "Admin1234!"
}
```

**Răspuns succes (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGci...",
    "admin": {
      "id": "cma1b2c3d4e5f6g7h8i9j0",
      "email": "admin@sdbeautyhub.ro",
      "name": "Admin"
    }
  }
}
```

**Răspuns eroare (401):**
```json
{
  "success": false,
  "error": "Invalid credentials."
}
```

### Utilizare token în frontend

Toate rutele `/api/admin/*` (cu excepția `/login`) necesită header-ul:

```
Authorization: Bearer <token>
```

**Token payload:**
```json
{
  "sub": "admin-id",
  "email": "admin@sdbeautyhub.ro",
  "iat": 1741600000,
  "exp": 1742204800
}
```

**Erori posibile fără token / token invalid:**
```json
{ "success": false, "error": "Unauthorized." }
{ "success": false, "error": "Invalid or expired token." }
```

---

## 2. Upload Imagini (Admin)

> Necesită `Authorization: Bearer <token>`

### `POST /api/admin/upload`

Uploadează o imagine în Supabase Storage. Folosit înainte de a crea/edita un produs.

**Request:** `multipart/form-data`
| Câmp | Tip | Descriere |
|---|---|---|
| `file` | File | JPEG / PNG / WebP / GIF, max **5 MB** |

**Exemplu JS:**
```js
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const res = await fetch('http://localhost:3000/api/admin/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
  // NU seta Content-Type manual
});
const { data } = await res.json();
// data.url → folosit ca mainImage sau în galleryImages
```

**Răspuns `201`:**
```json
{
  "success": true,
  "data": {
    "url": "https://yptiltgtwnlkouhxwoks.supabase.co/storage/v1/object/public/product-images/1234567890-abc.jpg"
  }
}
```

---

### `DELETE /api/admin/upload`

Șterge o imagine din storage (la editare produs sau ștergere).

**Request:**
```json
{ "url": "https://yptiltgtwnlkouhxwoks.supabase.co/storage/v1/object/public/product-images/1234567890-abc.jpg" }
```

**Răspuns `200`:**
```json
{ "success": true, "data": { "deleted": true } }
```

---

## 3. Produse (Admin)

> Toate rutele necesită `Authorization: Bearer <token>`

### `GET /api/admin/products`

Listează **toate** produsele (inclusiv inactive).

**Răspuns (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cma1b2c3d4",
      "name": "Cremă hidratantă",
      "slug": "crema-hidratanta",
      "shortDescription": "Cremă ușoară pentru față",
      "fullDescription": "Descriere completă a produsului...",
      "price": "89.99",
      "compareAtPrice": "109.99",
      "mainImage": "https://example.com/img.jpg",
      "galleryImages": ["https://example.com/img2.jpg"],
      "categoryId": "cma9k0l1m2",
      "category": {
        "id": "cma9k0l1m2",
        "name": "Îngrijire față",
        "slug": "ingrijire-fata",
        "description": null
      },
      "stock": 42,
      "isActive": true,
      "ingredients": "Aqua, Glycerin...",
      "usageInstructions": "Aplică dimineața și seara.",
      "benefits": "Hidratare 24h.",
      "createdAt": "2025-03-10T12:00:00.000Z",
      "updatedAt": "2025-03-10T12:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/admin/products`

Creează un produs nou.

**Request body:**
```json
{
  "name": "Ser vitamina C",
  "slug": "ser-vitamina-c",
  "shortDescription": "Ser iluminant cu vitamina C (min 10 chars)",
  "fullDescription": "Descriere detaliată a serului... (min 10 chars)",
  "price": 129.99,
  "compareAtPrice": 159.99,
  "mainImage": "https://example.com/ser.jpg",
  "galleryImages": ["https://example.com/ser2.jpg"],
  "categoryId": "cma9k0l1m2",
  "stock": 100,
  "isActive": true,
  "ingredients": "Ascorbic Acid 15%...",
  "usageInstructions": "Aplică 3-4 picături seara.",
  "benefits": "Iluminare, anti-aging."
}
```

**Câmpuri obligatorii:** `name`, `slug`, `shortDescription`, `fullDescription`, `price`, `mainImage`, `categoryId`, `stock`

**Validări:**
| Câmp | Regulă |
|------|--------|
| `name` | 2-200 caractere |
| `slug` | 2-200 chars, doar `a-z`, `0-9`, `-` (ex: `ser-vitamina-c`) |
| `shortDescription` | 10-500 caractere |
| `fullDescription` | 10-10000 caractere |
| `price` | număr pozitiv |
| `compareAtPrice` | număr pozitiv, opțional |
| `mainImage` | URL valid |
| `galleryImages` | array de URL-uri, max 10 |
| `categoryId` | CUID valid |
| `stock` | număr întreg ≥ 0 |
| `ingredients` | max 2000 chars, opțional |
| `usageInstructions` | max 2000 chars, opțional |
| `benefits` | max 1000 chars, opțional |

**Răspuns succes (201):**
```json
{
  "success": true,
  "data": { ...produs complet... }
}
```

**Răspuns eroare slug duplicat (409):**
```json
{
  "success": false,
  "error": "A product with this slug already exists."
}
```

---

### `GET /api/admin/products/:id`

Obține un produs după ID.

**Răspuns (200):**
```json
{
  "success": true,
  "data": { ...produs complet... }
}
```

**Răspuns (404):**
```json
{
  "success": false,
  "error": "Product not found."
}
```

---

### `PUT /api/admin/products/:id`

Actualizare parțială produs. Trimite **doar câmpurile** pe care vrei să le modifici.

**Request body (exemplu):**
```json
{
  "price": 99.99,
  "stock": 30,
  "isActive": false
}
```

**Răspuns (200):**
```json
{
  "success": true,
  "data": { ...produs actualizat... }
}
```

**Răspuns slug duplicat (409):**
```json
{
  "success": false,
  "error": "A product with this slug already exists."
}
```

---

### `DELETE /api/admin/products/:id`

Șterge definitiv un produs. **Comenzile existente nu sunt afectate** (snapshot-urile din OrderItems păstrează datele istorice).

**Răspuns (200):**
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

---

## 3. Comenzi (Admin)

> Toate rutele necesită `Authorization: Bearer <token>`

### `GET /api/admin/orders`

Listează toate comenzile (cele mai recente primele).

**Query parameters (opționale):**
| Parametru | Valori posibile |
|-----------|----------------|
| `status` | `new`, `paid`, `processing`, `shipped`, `delivered`, `cancelled` |
| `payment` | `pending`, `paid`, `failed`, `cancelled` |

**Exemple:**
```
GET /api/admin/orders
GET /api/admin/orders?status=new
GET /api/admin/orders?payment=paid
GET /api/admin/orders?status=processing&payment=paid
```

**Răspuns (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cmd1a2b3c4",
      "orderNumber": "SD-20250310-A3F9K2",
      "customerFirstName": "Ion",
      "customerLastName": "Popescu",
      "email": "ion@example.com",
      "phone": "+40723456789",
      "addressLine1": "Str. Florilor 10",
      "addressLine2": null,
      "city": "Cluj-Napoca",
      "county": "Cluj",
      "postalCode": "400001",
      "notes": null,
      "subtotal": "89.99",
      "shippingCost": "25.00",
      "total": "114.99",
      "paymentMethod": "NETOPIA",
      "paymentStatus": "paid",
      "orderStatus": "new",
      "createdAt": "2025-03-10T12:00:00.000Z",
      "updatedAt": "2025-03-10T12:05:00.000Z",
      "items": [
        { "quantity": 1, "lineTotal": "89.99" }
      ],
      "_count": { "items": 1 }
    }
  ]
}
```

---

### `GET /api/admin/orders/:id`

Obține detalii complete ale unei comenzi: produse comandate + tranzacții de plată.

**Răspuns (200):**
```json
{
  "success": true,
  "data": {
    "id": "cmd1a2b3c4",
    "orderNumber": "SD-20250310-A3F9K2",
    "customerFirstName": "Ion",
    "customerLastName": "Popescu",
    "email": "ion@example.com",
    "phone": "+40723456789",
    "addressLine1": "Str. Florilor 10",
    "addressLine2": null,
    "city": "Cluj-Napoca",
    "county": "Cluj",
    "postalCode": "400001",
    "notes": "Sună înainte de livrare",
    "subtotal": "89.99",
    "shippingCost": "25.00",
    "total": "114.99",
    "paymentMethod": "NETOPIA",
    "paymentStatus": "paid",
    "orderStatus": "processing",
    "createdAt": "2025-03-10T12:00:00.000Z",
    "updatedAt": "2025-03-10T12:05:00.000Z",
    "items": [
      {
        "id": "itm1a2b3c4",
        "orderId": "cmd1a2b3c4",
        "productId": "prd1a2b3c4",
        "productNameSnapshot": "Cremă hidratantă",
        "productPriceSnapshot": "89.99",
        "quantity": 1,
        "lineTotal": "89.99",
        "product": {
          "id": "prd1a2b3c4",
          "name": "Cremă hidratantă",
          "mainImage": "https://example.com/img.jpg"
        }
      }
    ],
    "transactions": [
      {
        "id": "trx1a2b3c4",
        "orderId": "cmd1a2b3c4",
        "provider": "NETOPIA",
        "providerTransactionId": "ntp-abc123",
        "amount": "114.99",
        "currency": "RON",
        "status": "success",
        "rawResponse": { "ntpID": "ntp-abc123", "status": 3 },
        "createdAt": "2025-03-10T12:00:00.000Z",
        "updatedAt": "2025-03-10T12:05:00.000Z"
      }
    ]
  }
}
```

---

### `PATCH /api/admin/orders/:id`

Actualizează statusul comenzii sau al plății. Cel puțin un câmp obligatoriu.

**Request body:**
```json
{
  "orderStatus": "shipped",
  "paymentStatus": "cancelled"
}
```

**Valori permise `orderStatus`:** `new`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`

**Valori permise `paymentStatus`:** **doar `cancelled`**
> ⚠️ Statusul `paid` se setează **automat** prin callback-ul Netopia (IPN). Nu se poate seta manual.

**Răspuns (200):**
```json
{
  "success": true,
  "data": {
    "id": "cmd1a2b3c4",
    "orderStatus": "shipped",
    "paymentStatus": "pending",
    ...
  }
}
```

**Răspuns eroare – niciun câmp (400):**
```json
{
  "success": false,
  "error": "Provide at least one field to update: orderStatus or paymentStatus."
}
```

**Răspuns eroare – paymentStatus invalid (400):**
```json
{
  "success": false,
  "error": "Payment status can only be set to 'cancelled' manually. Paid status is set automatically by the payment provider callback."
}
```

> 📧 La schimbarea `orderStatus`, clientul primește automat email de notificare.

---

## 4. Produse (Public)

> Rutele publice sunt folosite de frontend-ul magazinului (nu de panoul admin).

### `GET /api/products`

Listează produsele **active**. Filtrare opțională după categorie.

**Query parameters:**
| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `category` | string | Slug-ul categoriei (ex: `ingrijire-fata`) |

**Răspuns (200):** Array de produse (aceeași structură ca la admin, dar doar `isActive: true`).

---

### `GET /api/products/:slug`

Obține un produs activ după slug.

**Răspuns (404) dacă nu există sau e inactiv:**
```json
{ "success": false, "error": "Product not found." }
```

---

## 5. Categorii (Public)

### `GET /api/categories`

Listează toate categoriile, sortate alfabetic.

**Răspuns (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cma9k0l1m2",
      "name": "Îngrijire corp",
      "slug": "ingrijire-corp",
      "description": "Produse pentru îngrijirea corpului",
      "createdAt": "2025-03-10T12:00:00.000Z",
      "updatedAt": "2025-03-10T12:00:00.000Z"
    },
    {
      "id": "cma9k0l1m3",
      "name": "Îngrijire față",
      "slug": "ingrijire-fata",
      "description": null,
      "createdAt": "2025-03-10T12:00:00.000Z",
      "updatedAt": "2025-03-10T12:00:00.000Z"
    }
  ]
}
```

---

## 6. Checkout (Public)

### `POST /api/checkout`

Creează o comandă nouă cu statusul `pending`. Returnează ID-ul comenzii pentru inițierea plății.

**Request body:**
```json
{
  "customerFirstName": "Ion",
  "customerLastName": "Popescu",
  "email": "ion@example.com",
  "phone": "+40723456789",
  "addressLine1": "Str. Florilor 10",
  "addressLine2": "Ap. 3",
  "city": "Cluj-Napoca",
  "county": "Cluj",
  "postalCode": "400001",
  "notes": "Sună înainte de livrare",
  "paymentMethod": "NETOPIA",
  "items": [
    { "productId": "prd1a2b3c4", "quantity": 2 },
    { "productId": "prd5e6f7g8", "quantity": 1 }
  ]
}
```

**Câmpuri obligatorii:** `customerFirstName`, `customerLastName`, `email`, `phone`, `addressLine1`, `city`, `county`, `paymentMethod`, `items`

**Validări câmpuri:**
| Câmp | Regulă |
|------|--------|
| `phone` | 7-20 chars, doar `+`, cifre, spații, `-`, `()` |
| `addressLine1` | 5-200 chars |
| `postalCode` | max 20 chars, opțional |
| `notes` | max 500 chars, opțional |
| `items` | min 1, max 50 produse distincte |
| `quantity` | întreg pozitiv, max 100 per produs |
| `paymentMethod` | doar `"NETOPIA"` |

**Răspuns succes (201):**
```json
{
  "success": true,
  "data": {
    "orderId": "cmd1a2b3c4",
    "orderNumber": "SD-20250310-A3F9K2",
    "total": 229.98
  }
}
```

**Răspuns eroare validare (400):**
```json
{ "success": false, "error": "Phone number too short." }
```

**Răspuns eroare produs inactiv (422):**
```json
{ "success": false, "error": "Product is no longer available." }
```

**Răspuns eroare stoc insuficient (422):**
```json
{ "success": false, "error": "Insufficient stock for \"Cremă hidratantă\". Available: 5." }
```

> ⚠️ **Prețurile sunt ÎNTOTDEAUNA recalculate din baza de date.** Prețurile trimise din frontend sunt ignorate.

**Livrare:**
- Cost standard: **25 RON**
- Livrare gratuită la comenzi peste **250 RON**
- Configurabil prin `SHIPPING_COST_RON` și `FREE_SHIPPING_THRESHOLD_RON`

---

## 7. Plăți Netopia

### `POST /api/payments/netopia/initiate`

Inițiază sesiunea de plată Netopia pentru o comandă `pending`.

**Request body:**
```json
{ "orderId": "cmd1a2b3c4" }
```

**Răspuns succes (200):**
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://secure.sandbox.netopia-payments.com/payment/...",
    "ntpID": "ntp-abc123"
  }
}
```
> Redirecționează utilizatorul către `paymentUrl`.

**Răspuns (404) – comandă inexistentă sau deja plătită:**
```json
{ "success": false, "error": "Could not initiate payment. The order may not exist or has already been paid." }
```

**Răspuns (503) – Netopia neconfigurat:**
```json
{ "success": false, "error": "NETOPIA_POSID or NETOPIA_API_KEY is not configured..." }
```

---

### `POST /api/payments/netopia/ipn`

Webhook Netopia – **nu este apelat din frontend, ci de serverele Netopia.**

Răspunde întotdeauna cu HTTP 200 și `{ "errorCode": 0 }` pe succes.

---

## 8. Schema Bază de Date

### Admin
| Câmp | Tip | Note |
|------|-----|------|
| `id` | String (CUID) | PK |
| `email` | String | unic |
| `passwordHash` | String | bcryptjs |
| `name` | String? | opțional |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

### Category
| Câmp | Tip | Note |
|------|-----|------|
| `id` | String (CUID) | PK |
| `name` | String | |
| `slug` | String | unic, indexat |
| `description` | String? | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

### Product
| Câmp | Tip | Note |
|------|-----|------|
| `id` | String (CUID) | PK |
| `name` | String | |
| `slug` | String | unic, indexat |
| `shortDescription` | String | 10-500 chars |
| `fullDescription` | String | 10-10000 chars |
| `price` | Decimal(10,2) | |
| `compareAtPrice` | Decimal(10,2)? | preț tăiat |
| `mainImage` | String | URL |
| `galleryImages` | String[] | max 10 URL-uri |
| `categoryId` | String | FK → Category |
| `stock` | Int | default 0 |
| `isActive` | Boolean | default true |
| `ingredients` | String? | |
| `usageInstructions` | String? | |
| `benefits` | String? | |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

### Order
| Câmp | Tip | Note |
|------|-----|------|
| `id` | String (CUID) | PK |
| `orderNumber` | String | unic, format `SD-YYYYMMDD-XXXXXX` |
| `customerFirstName` | String | |
| `customerLastName` | String | |
| `email` | String | |
| `phone` | String | |
| `addressLine1` | String | |
| `addressLine2` | String? | |
| `city` | String | |
| `county` | String | |
| `postalCode` | String? | |
| `notes` | String? | |
| `subtotal` | Decimal(10,2) | fără livrare |
| `shippingCost` | Decimal(10,2) | |
| `total` | Decimal(10,2) | subtotal + livrare |
| `paymentMethod` | PaymentMethod | `NETOPIA` |
| `paymentStatus` | PaymentStatus | default `pending` |
| `orderStatus` | OrderStatus | default `new` |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

### OrderItem
| Câmp | Tip | Note |
|------|-----|------|
| `id` | String (CUID) | PK |
| `orderId` | String | FK → Order |
| `productId` | String | FK → Product |
| `productNameSnapshot` | String | **snapshot la momentul comenzii** |
| `productPriceSnapshot` | Decimal(10,2) | **snapshot la momentul comenzii** |
| `quantity` | Int | |
| `lineTotal` | Decimal(10,2) | quantity × price |

### Transaction
| Câmp | Tip | Note |
|------|-----|------|
| `id` | String (CUID) | PK |
| `orderId` | String | FK → Order |
| `provider` | String | ex: `"NETOPIA"` |
| `providerTransactionId` | String? | ID-ul Netopia (`ntpID`) |
| `amount` | Decimal(10,2) | |
| `currency` | String | default `"RON"` |
| `status` | TransactionStatus | default `pending` |
| `rawResponse` | Json? | răspunsul brut Netopia |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

---

## 9. Enums

```typescript
enum OrderStatus {
  new         // comandă nouă, neconfirmată
  paid        // plata confirmată prin IPN
  processing  // în curs de procesare
  shipped     // expediată
  delivered   // livrată
  cancelled   // anulată
}

enum PaymentStatus {
  pending     // în așteptare
  paid        // confirmată prin IPN Netopia
  failed      // eșuată
  cancelled   // anulată manual de admin
}

enum PaymentMethod {
  NETOPIA
}

enum TransactionStatus {
  pending
  success
  failed
  cancelled
}
```

---

## 10. Reguli de Business

### Checkout
- Prețurile sunt **întotdeauna recalculate din DB** — niciodată din frontend
- Produsele inactive sunt **respinse** la checkout
- Stocul insuficient este **respins** la checkout
- Stocul este **rezervat atomic** la crearea comenzii (tranzacție DB)
- Snapshot-urile din `OrderItem` păstrează datele istorice chiar dacă produsul e șters

### Plăți
- `paymentStatus = paid` este setat **exclusiv** prin callback IPN Netopia
- Admin poate seta `paymentStatus` **doar la `cancelled`**
- Handler-ul IPN este **idempotent** — callback-uri duplicate pentru aceeași comandă plătită sunt ignorate
- IPN returnează **întotdeauna HTTP 200** (chiar și la erori de business)

### Numere comenzi
- Format: `SD-YYYYMMDD-XXXXXX`
- Caractere folosite: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (fără `I`, `O`, `0`, `1` pentru lizibilitate)
- Unicitate garantată prin constraint DB + retry logic

### Email
- **La checkout:** email de confirmare comandă
- **La IPN succes:** email confirmare plată
- **La schimbare status de admin:** email notificare client

---

## 11. Variabile de Mediu

| Variabilă | Obligatorie | Descriere |
|-----------|-------------|-----------|
| `DATABASE_URL` | DA | Connection string PostgreSQL |
| `JWT_SECRET` | DA | Min 64 chars (`openssl rand -base64 64`) |
| `JWT_EXPIRES_IN` | Nu | Default: `7d` |
| `NETOPIA_SANDBOX` | Nu | `true` = sandbox, `false` = producție |
| `NETOPIA_POSID` | DA (plăți) | Merchant POS ID din contul Netopia |
| `NETOPIA_API_KEY` | DA (plăți) | API key din contul Netopia |
| `NETOPIA_IPN_URL` | DA (plăți) | URL public pentru webhook (ex: `https://yourdomain.com/api/payments/netopia/ipn`) |
| `NETOPIA_RETURN_URL` | DA (plăți) | URL redirecționare după plată |
| `SUPABASE_URL` | DA (upload) | URL proiect Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | DA (upload) | Secret key din Settings → API Keys |
| `FRONTEND_URL` | Nu | Origin CORS (ex: `http://localhost:3001`) |
| `NEXT_PUBLIC_APP_URL` | Nu | Default: `http://localhost:3000` |
| `SHIPPING_COST_RON` | Nu | Default: `25` |
| `FREE_SHIPPING_THRESHOLD_RON` | Nu | Default: `250` (0 = dezactivat) |
| `SMTP_HOST` | Nu | Email mockat dacă lipsește |
| `SMTP_PORT` | Nu | Default: `587` |
| `SMTP_USER` | Nu | |
| `SMTP_PASS` | Nu | |
| `EMAIL_FROM` | Nu | |

---

## Structura fișierelor

```
app/api/
├── admin/
│   ├── login/route.ts           → POST (public)
│   ├── upload/route.ts          → POST, DELETE (protected)
│   ├── products/route.ts        → GET, POST (protected)
│   ├── products/[id]/route.ts   → GET, PUT, DELETE (protected)
│   ├── orders/route.ts          → GET (protected)
│   └── orders/[id]/route.ts     → GET, PUT (protected)
├── products/route.ts            → GET (public)
├── products/[slug]/route.ts     → GET (public)
├── categories/route.ts          → GET (public)
├── checkout/route.ts            → POST (public)
└── payments/netopia/
    ├── initiate/route.ts        → POST (public)
    └── ipn/route.ts             → POST (webhook Netopia)
```

---

*Documentație generată pentru SD Beauty Hub Backend ADMIN — v1.0*
