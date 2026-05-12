import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: santriId } = await params;

    if (!santriId) {
      return NextResponse.json(
        { success: false, message: 'ID Santri diperlukan' },
        { status: 400 }
      );
    }

    // Ambil data santri beserta seluruh riwayatnya
    const santri = await prisma.santriInternal.findUnique({
      where: { id: santriId },
      include: {
        riwayatRecords: {
          orderBy: {
            dufahNama: 'desc',
          },
          include: {
            program: true,
            kelas: true,
            dufah: true,
            nilaiList: {
              include: {
                mapel: true,
              },
            },
            riwayatUsbuList: {
              orderBy: {
                usbu: 'asc',
              },
            },
            absenKelasList: {
              orderBy: { tanggal: 'desc' },
            },
            absenSakanList: {
              orderBy: { tanggal: 'desc' },
            },
            absenKegiatanList: {
              include: {
                kategori: true,
              },
              orderBy: { tanggal: 'desc' },
            },
          },
        },
      },
    });

    if (!santri) {
      return NextResponse.json(
        { success: false, message: 'Data santri tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Helper: Hitung total H/I/S/A dari array berisi field 'status'
    const hitungRekap = (records: { status: string }[]) => ({
      total_hadir: records.filter((r) => r.status === 'HADIR').length,
      total_izin: records.filter((r) => r.status === 'IZIN').length,
      total_sakit: records.filter((r) => r.status === 'SAKIT').length,
      total_alpha: records.filter((r) => r.status === 'ALPHA').length,
      total_hari: records.length,
    });

    // Format (Transform) data agar strukturnya bersih
    const responseData = {
      success: true,
      santri: {
        id: santri.id,
        nama: santri.nama,
        tempat_lahir: santri.tempat_lahir,
        tanggal_lahir: santri.tanggal_lahir,
      },
      riwayat: santri.riwayatRecords.map((dataRiwayat) => ({
        id_riwayat: dataRiwayat.id,
        dufah: dataRiwayat.dufahNama,
        akademik: {
          program: dataRiwayat.program?.nama_indo || '-',
          kelas: dataRiwayat.kelas?.nama || '-',
          is_tasmi: dataRiwayat.is_tasmi,
          status_kelulusan: dataRiwayat.status_kelulusan,
        },
        nilai_per_mapel: dataRiwayat.nilaiList.map((n) => ({
          mapel: n.mapel.nama_indo,
          nilai_usbu_1: n.nilaiUsbu1,
          nilai_usbu_2: n.nilaiUsbu2,
          nilai_nihai: n.nilaiNihai,
          nilai_akhir: n.nilaiAkhir,
        })),
        rekap_absen_per_usbu: dataRiwayat.riwayatUsbuList.map((u) => ({
          usbu: u.usbu,
          total_hadir: u.totalHadir,
          total_sakit: u.totalSakit,
          total_izin: u.totalIzin,
          total_alpha: u.totalAlpha,
          rata_rata_nilai: u.rataRataNilai,
        })),

        // ===== REKAP TOTAL per Jenis Absen (dalam 1 Duf'ah) =====
        rekap_absen_sakan: hitungRekap(dataRiwayat.absenSakanList),
        rekap_absen_kelas: hitungRekap(dataRiwayat.absenKelasList),
        rekap_absen_kegiatan: hitungRekap(dataRiwayat.absenKegiatanList),

        // ===== RINCIAN Absensi per Tanggal =====
        histori_absen: {
          kelas: dataRiwayat.absenKelasList.map((a) => ({
            id: a.id,
            tanggal: a.tanggal,
            sesi: a.sesi,
            status: a.status,
            // Keterangan hanya ditampilkan jika status ALPHA
            keterangan: a.status === 'ALPHA' ? a.keterangan : null,
          })),
          sakan: dataRiwayat.absenSakanList.map((a) => ({
            id: a.id,
            tanggal: a.tanggal,
            status: a.status,
            keterangan: a.status === 'ALPHA' ? a.keterangan : null,
          })),
          kegiatan: dataRiwayat.absenKegiatanList.map((a) => ({
            id: a.id,
            tanggal: a.tanggal,
            status: a.status,
            nama_kegiatan: a.kategori.nama,
            keterangan: a.status === 'ALPHA' ? a.keterangan : null,
          })),
        },
      })),
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan sistem internal',
        error: err.message,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
