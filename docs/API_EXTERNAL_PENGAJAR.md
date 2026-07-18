# 📘 API Dokumentasi: External Pengajar

Base URL: `https://<domain-siakad>/api/external/pengajar`

## Autentikasi

Semua request **wajib** menyertakan header:

| Header | Value |
|---|---|
| `x-api-key` | `<EXTERNAL_API_KEY>` |

Jika tidak disertakan atau salah → **401 Unauthorized**.

---

## 1. GET — Ambil Data Pengajar

Mengambil seluruh data pengajar aktif beserta detail absensi mengajar dan keterlambatan. Periode otomatis berdasarkan **usbu' Dufah yang sedang aktif** (prioritas: usbu' 3 → 2 → 1).

### Request

```
GET /api/external/pengajar
```

Tidak ada query parameter. Rentang tanggal ditentukan otomatis dari Dufah.

### Response (200 OK)

```json
{
  "success": true,
  "periode": {
    "dari": "2026-06-29",
    "sampai": "2026-07-05",
    "dufah": "Duf'ah 90",
    "usbu": 3
  },
  "data": [
    {
      "id": "cmq9coev10008huem9927v5bi",
      "nama": "Ustadzah Riskiya, M.Pd.",
      "noHp": "6287872471712",
      "jumlahJadwalMengajar": 5,
      "jumlahAbsenTerverifikasi": 27,
      "absenDetail": [
        {
          "id": "cmqz8jqls0001qq941fljc6ie",
          "tanggal": "2026-06-29",
          "sesi": "SESI_8",
          "kelas": "Ula 1",
          "waktuMulai": "20:10",
          "waktuSelesai": "23:00",
          "materi": "Sorogan",
          "terlambatMenit": 0,
          "isBadal": false
        }
      ]
    }
  ]
}
```

### Penjelasan Field

| Field | Tipe | Keterangan |
|---|---|---|
| `periode.dari` | `string` | Tanggal awal usbu' aktif (YYYY-MM-DD) |
| `periode.sampai` | `string` | Tanggal akhir usbu' aktif (YYYY-MM-DD) |
| `periode.dufah` | `string` | Nama Dufah yang sedang aktif |
| `periode.usbu` | `number` | Nomor usbu' (1, 2, atau 3) |
| `data[].id` | `string` | ID unik pengajar |
| `data[].nama` | `string` | Nama lengkap pengajar |
| `data[].noHp` | `string\|null` | Nomor WhatsApp (format: 62xxx) |
| `data[].jumlahJadwalMengajar` | `number` | Total slot jadwal yang ditugaskan |
| `data[].jumlahAbsenTerverifikasi` | `number` | Jumlah sesi mengajar yang sudah terverifikasi |
| `data[].absenDetail` | `array` | Detail tiap sesi mengajar |
| `absenDetail[].id` | `string` | ID unik record absen (digunakan untuk PUT) |
| `absenDetail[].tanggal` | `string` | Tanggal mengajar (YYYY-MM-DD) |
| `absenDetail[].sesi` | `string` | Sesi mengajar (SESI_1 s/d SESI_10) |
| `absenDetail[].kelas` | `string` | Nama kelas |
| `absenDetail[].waktuMulai` | `string` | Jam mulai mengajar (HH:mm) |
| `absenDetail[].waktuSelesai` | `string` | Jam selesai mengajar (HH:mm) |
| `absenDetail[].materi` | `string` | Materi yang diajarkan |
| `absenDetail[].terlambatMenit` | `number` | Jumlah menit keterlambatan |
| `absenDetail[].isBadal` | `boolean` | Apakah ini pengajar pengganti (badal) |

---

## 2. PUT — Update Keterlambatan

Mengubah nilai `terlambatMenit` pada record absen pengajar tertentu.

### Request

```
PUT /api/external/pengajar
Content-Type: application/json
```

**Body:**

```json
{
  "id": "cmqz8jqls0001qq941fljc6ie",
  "terlambatMenit": 10
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `id` | `string` | ✅ | ID dari `absenDetail[].id` pada response GET |
| `terlambatMenit` | `number` | ✅ | Menit keterlambatan baru |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "cmqz8jqls0001qq941fljc6ie",
    "pengajar": "Evita Desi Safitri",
    "kelas": "Ula 1",
    "tanggal": "2026-06-29",
    "sesi": "SESI_8",
    "terlambatMenit": 10
  }
}
```

---

## Error Responses

| Status | Kondisi |
|---|---|
| `401` | API key tidak valid atau tidak disertakan |
| `400` | Parameter `id` atau `terlambatMenit` tidak diisi |
| `404` | ID absen tidak ditemukan / Tidak ada usbu' aktif |
| `500` | Kesalahan server internal |

Format error:
```json
{ "error": "Pesan error" }
```

---

## Contoh Penggunaan

### JavaScript (fetch)

```javascript
// GET - Ambil data pengajar
const response = await fetch('https://<domain>/api/external/pengajar', {
  headers: { 'x-api-key': '<EXTERNAL_API_KEY>' }
});
const { data, periode } = await response.json();

// PUT - Update keterlambatan
await fetch('https://<domain>/api/external/pengajar', {
  method: 'PUT',
  headers: {
    'x-api-key': '<EXTERNAL_API_KEY>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ id: '<absenId>', terlambatMenit: 15 })
});
```

### PHP (cURL)

```php
// GET - Ambil data pengajar
$ch = curl_init('https://<domain>/api/external/pengajar');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['x-api-key: <EXTERNAL_API_KEY>'],
]);
$result = json_decode(curl_exec($ch), true);
curl_close($ch);

// PUT - Update keterlambatan
$ch = curl_init('https://<domain>/api/external/pengajar');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'PUT',
    CURLOPT_HTTPHEADER => [
        'x-api-key: <EXTERNAL_API_KEY>',
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'id' => '<absenId>',
        'terlambatMenit' => 15,
    ]),
]);
$result = json_decode(curl_exec($ch), true);
curl_close($ch);
```
