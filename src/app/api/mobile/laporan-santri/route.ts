import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveDufahName } from '@/lib/absensi';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const namaQuery = searchParams.get('nama');
    const dufahNama = searchParams.get('dufahNama');

    if (!namaQuery) {
      return NextResponse.json(
        { success: false, message: 'Nama santri diperlukan (Misal: ?nama=Ahmad)' },
        { status: 400 }
      );
    }

    // Build the query where clause
    const whereClause: any = {
      santri: {
        nama: {
          contains: namaQuery,
          mode: 'insensitive'
        }
      }
    };

    // Kalau param dufahNama dikirim, cari spesifik dufah itu
    if (dufahNama) {
      whereClause.dufahNama = dufahNama;
    }

    // Ambil data dufah yang sedang aktif
    const activeDufah = await getActiveDufahName();

    // Ambil data lengkap terkait RiwayatSantri tersebut
    const dataRiwayatList = await prisma.riwayatSantri.findMany({
      where: whereClause,
      // Kalau dufahNama tidak diisi, otomatis ambil data riwayat yang paling terbaru (Dufah terakhir)
      orderBy: {
        dufahNama: 'desc'
      },
      include: {
        santri: true,
        kelas: true,
        program: true,
        dufah: true,
        // Hasil Tes Per Usbu' (Nilai List terhubung ke Mapel)
        nilaiList: {
          include: {
            mapel: true
          }
        },
        // Rekap Absen Rutinan (per Usbu)
        riwayatUsbuList: {
          orderBy: {
            usbu: 'asc'
          }
        },
        // Rincian Absensi kalau mau ditampilkan history-nya (5 histori terakhir)
        absenKelasList: {
          orderBy: { tanggal: 'desc' },
          take: 5 
        },
        absenSakanList: {
          orderBy: { tanggal: 'desc' },
          take: 5
        },
        // Khusus absen kegiatan, includekan nama kegiatannya
        absenKegiatanList: {
          include: {
            kategori: true
          },
          orderBy: { tanggal: 'desc' },
          take: 5
        }
      }
    });

    if (!dataRiwayatList || dataRiwayatList.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data santri dengan nama tersebut tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Format (Transform) data agar strukturnya bersih dan mudah dibaca oleh Flutter
    const responseData = {
      success: true,
      active_dufah: activeDufah || 'Tidak Diketahui',
      data: dataRiwayatList.map((dataRiwayat) => ({
        id_riwayat: dataRiwayat.id,
        dufah: dataRiwayat.dufahNama,
        santri: {
          id: dataRiwayat.santri.id,
          nama: dataRiwayat.santri.nama,
          tempat_lahir: dataRiwayat.santri.tempat_lahir,
          tanggal_lahir: dataRiwayat.santri.tanggal_lahir,
        },
        akademik: {
          program: dataRiwayat.program?.nama_indo || '-',
          kelas: dataRiwayat.kelas?.nama || '-',
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
          rata_rata_nilai: u.rataRataNilai
        })),
        histori_absen_terbaru: {
          kelas: dataRiwayat.absenKelasList,
          sakan: dataRiwayat.absenSakanList,
          kegiatan: dataRiwayat.absenKegiatanList.map((a: any) => ({
            id: a.id,
            tanggal: a.tanggal,
            status: a.status,
            nama_kegiatan: a.kategori.nama,
            keterangan: a.keterangan
          }))
        }
      }))
    };

    // Tambahkan header CORS khusus agar Flutter Mobile App / web local tester tidak kena block
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem internal', error: error.message },
      { status: 500 }
    );
  }
}

// Menangani request OPTIONS (Preflight) yang otomatis dikirim oleh browser / aplikasi HTTP client
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
