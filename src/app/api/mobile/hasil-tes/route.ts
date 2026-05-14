import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActiveDufahName } from '@/lib/absensi';
import { getMasterSantriList } from '@/lib/santri-api';

export async function GET(request: Request) {
  try {
    // Ambil data dufah yang sedang aktif
    const activeDufah = await getActiveDufahName();

    if (!activeDufah) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada Dufah aktif saat ini.' },
        { status: 404 }
      );
    }

    const masterList = await getMasterSantriList();
    const masterMap = new Map(masterList.map((m: any) => [m.id, m]));

    // Ambil data lengkap terkait RiwayatSantri pada Dufah aktif
    const dataRiwayatList = await prisma.riwayatSantri.findMany({
      where: {
        dufahNama: activeDufah
      },
      include: {
        santri: true,
        kelas: true,
        program: true,
        // Hasil Tes Per Usbu' (Nilai List terhubung ke Mapel)
        nilaiList: {
          include: {
            mapel: true
          }
        },
        // Rekap Absen Rutinan (per Usbu) untuk mengambil rata-rata nilai
        riwayatUsbuList: {
          orderBy: {
            usbu: 'asc'
          }
        }
      }
    });

    if (!dataRiwayatList || dataRiwayatList.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data santri tidak ditemukan untuk Dufah aktif.' },
        { status: 404 }
      );
    }

    // Mengelompokkan data berdasarkan kelas
    const groupedData: Record<string, any> = {};

    dataRiwayatList.forEach((dataRiwayat) => {
      const kelasName = dataRiwayat.kelas?.nama || 'Tanpa Kelas';

      if (!groupedData[kelasName]) {
        groupedData[kelasName] = {
          kelas: kelasName,
          santri: []
        };
      }

      const computeAverage = (key: 'nilaiUsbu1' | 'nilaiUsbu2' | 'nilaiNihai' | 'nilaiAkhir') => {
        let sumBobot = 0;
        let countHasScore = 0;
        dataRiwayat.nilaiList.forEach((n: any) => {
          if (n.mapel.masuk_akumulasi !== false) { // Default to true if undefined
            const score = n[key];
            if (score !== null && score !== undefined) {
              const bobot = n.mapel.bobot ?? 1;
              sumBobot += score * bobot;
              countHasScore++;
            }
          }
        });
        return countHasScore > 0 ? Number((sumBobot / 100).toFixed(2)) : null;
      };

      groupedData[kelasName].santri.push({
        id_riwayat: dataRiwayat.id,
        id_santri: dataRiwayat.santri.id,
        nama: dataRiwayat.santri.nama,
        gender: masterMap.get(dataRiwayat.santri.id)?.gender || '-',
        tempat_lahir: dataRiwayat.santri.tempat_lahir,
        tanggal_lahir: dataRiwayat.santri.tanggal_lahir,
        akademik: {
          program: dataRiwayat.program?.nama_indo || '-',
          status_kelulusan: dataRiwayat.status_kelulusan,
        },
        nilai_per_mapel: dataRiwayat.nilaiList.map((n: any) => ({
          mapel: n.mapel.nama_indo,
          nilai_usbu_1: n.nilaiUsbu1,
          nilai_usbu_2: n.nilaiUsbu2,
          nilai_nihai: n.nilaiNihai,
          nilai_akhir: n.nilaiAkhir,
        })),
        rata_rata_per_usbu: [
          { usbu: 1, label: "Usbu' 1", rata_rata_nilai: computeAverage('nilaiUsbu1') },
          { usbu: 2, label: "Usbu' 2", rata_rata_nilai: computeAverage('nilaiUsbu2') },
          { usbu: 3, label: "Usbu' 3 (Nihai)", rata_rata_nilai: computeAverage('nilaiNihai') },
          { usbu: 4, label: "Semua Usbu'", rata_rata_nilai: computeAverage('nilaiAkhir') }
        ]
      });
    });

    // Mengurutkan kelas berdasarkan abjad (opsional)
    const sortedData = Object.values(groupedData).sort((a: any, b: any) =>
      a.kelas.localeCompare(b.kelas)
    );

    const responseData = {
      success: true,
      active_dufah: activeDufah,
      data: sortedData
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
