import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || typeof file === 'string' || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Hanya file gambar yang diperbolehkan' }, { status: 400 });
  }
  const filename = formData.get('filename') || 'bukti-transfer.jpg';
  const blob = await put(filename.toString(), file, { access: 'public' });
  return NextResponse.json({ url: blob.url });
}
