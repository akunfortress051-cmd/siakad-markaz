-- CreateEnum
CREATE TYPE "StatusAbsen" AS ENUM ('HADIR', 'IZIN', 'SAKIT', 'ALPHA');

-- CreateEnum
CREATE TYPE "HissohKelas" AS ENUM ('ULA', 'TSANI', 'TSALIS', 'RABI', 'KHAMIS');

-- CreateTable
CREATE TABLE "AbsenSakan" (
    "id" TEXT NOT NULL,
    "riwayatId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "status" "StatusAbsen" NOT NULL,
    "keterangan" TEXT,

    CONSTRAINT "AbsenSakan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenKelas" (
    "id" TEXT NOT NULL,
    "riwayatId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "hissoh" "HissohKelas" NOT NULL,
    "status" "StatusAbsen" NOT NULL,
    "keterangan" TEXT,

    CONSTRAINT "AbsenKelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KategoriKegiatan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KategoriKegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenKegiatan" (
    "id" TEXT NOT NULL,
    "riwayatId" TEXT NOT NULL,
    "kategoriId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "status" "StatusAbsen" NOT NULL,
    "keterangan" TEXT,

    CONSTRAINT "AbsenKegiatan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbsenSakan_riwayatId_tanggal_key" ON "AbsenSakan"("riwayatId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenKelas_riwayatId_tanggal_hissoh_key" ON "AbsenKelas"("riwayatId", "tanggal", "hissoh");

-- CreateIndex
CREATE UNIQUE INDEX "KategoriKegiatan_nama_key" ON "KategoriKegiatan"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenKegiatan_riwayatId_kategoriId_tanggal_key" ON "AbsenKegiatan"("riwayatId", "kategoriId", "tanggal");

-- AddForeignKey
ALTER TABLE "AbsenSakan" ADD CONSTRAINT "AbsenSakan_riwayatId_fkey" FOREIGN KEY ("riwayatId") REFERENCES "RiwayatSantri"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenKelas" ADD CONSTRAINT "AbsenKelas_riwayatId_fkey" FOREIGN KEY ("riwayatId") REFERENCES "RiwayatSantri"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenKegiatan" ADD CONSTRAINT "AbsenKegiatan_riwayatId_fkey" FOREIGN KEY ("riwayatId") REFERENCES "RiwayatSantri"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenKegiatan" ADD CONSTRAINT "AbsenKegiatan_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "KategoriKegiatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
