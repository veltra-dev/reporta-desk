import { createClient } from '@supabase/supabase-js';

if (typeof window === 'undefined' && typeof globalThis !== 'undefined' && !(globalThis as any).WebSocket) {
  try {
    (globalThis as any).WebSocket = require('ws');
  } catch {}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }) 
  : null;

export const BUCKET_NAME = 'attachments';

export async function uploadFileToSupabase(file: File | Blob, originalFileName?: string): Promise<string | null> {
  if (!supabase) return null;

  try {
    const rawName = originalFileName || (file as File).name || `file_${Date.now()}`;
    const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `reportadesk/${Date.now()}_${cleanName}`;

    let targetBucket = BUCKET_NAME;
    let { error } = await supabase.storage
      .from(targetBucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn(`[Supabase Storage] Erro no bucket '${targetBucket}':`, error.message);
      targetBucket = 'public';
      const retry = await supabase.storage.from(targetBucket).upload(path, file, { upsert: true });
      if (retry.error) {
        console.error('[Supabase Storage] Falha ao fazer upload:', retry.error.message);
        return null;
      }
    }

    const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(path);
    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('Erro ao fazer upload no Supabase Storage:', err);
    return null;
  }
}

export async function uploadBase64ToSupabase(base64Data: string, fileName: string): Promise<string | null> {
  try {
    const match = base64Data.match(/^data:(.*?);base64,(.*)$/);
    if (!match) return null;

    const mimeType = match[1];
    const b64Data = match[2];
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, { type: mimeType });
    return await uploadFileToSupabase(blob, fileName);
  } catch (err) {
    console.error('Erro ao converter base64 para upload no Supabase:', err);
    return null;
  }
}
