import { supabase } from "@/integrations/supabase/client";
import { MediaFile } from "@/components/WhatsAppStyleMediaCapture";

export interface UploadedMedia {
  url: string;
  storage_path: string;
  tipo: 'foto' | 'video';
  orden: number;
  comment?: string;
}

/**
 * Sube archivos multimedia a Supabase Storage
 * @param media - Array de archivos de media a subir
 * @param incidenteId - ID del incidente (opcional, para organizar por carpetas)
 * @returns Array de objetos con URLs y rutas de storage
 */
export async function uploadMediaToStorage(
  media: MediaFile[],
  incidenteId?: string
): Promise<UploadedMedia[]> {
  const uploaded: UploadedMedia[] = [];
  
  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const extension = item.file.type.split('/')[1] || 'jpg';
    
    // Organizar por carpetas si hay incidenteId
    const folder = incidenteId ? `incidentes/${incidenteId}` : 'temp';
    const fileName = `${folder}/${timestamp}_${randomId}.${extension}`;

    try {
      const { data, error } = await supabase.storage
        .from('incidente-fotos')
        .upload(fileName, item.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        throw error;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('incidente-fotos')
        .getPublicUrl(data.path);

      uploaded.push({
        url: urlData.publicUrl,
        storage_path: data.path,
        tipo: item.tipo,
        orden: i
      });
    } catch (error) {
      console.error('Failed to upload media:', error);
      throw error;
    }
  }

  return uploaded;
}

/**
 * Guarda referencias de fotos en la tabla incidente_fotos
 * @param incidenteId - ID del incidente
 * @param uploadedMedia - Array de media subidos con sus URLs
 * @param tipo - Tipo de fotos (ingreso, salida, diagnostico, reparacion)
 */
export async function saveIncidentePhotos(
  incidenteId: string,
  uploadedMedia: (UploadedMedia & { comment?: string })[],
  tipo: 'ingreso' | 'salida' | 'diagnostico' | 'reparacion'
) {
  const { data: userData } = await supabase.auth.getUser();
  
  const photosToInsert = uploadedMedia.map(media => ({
    incidente_id: incidenteId,
    tipo,
    url: media.url,
    storage_path: media.storage_path,
    orden: media.orden,
    created_by: userData.user?.id,
    // Note: comments are not stored in incidente_fotos table yet
    // You may want to add a 'comentario' column to the table
  }));

  // Using any to bypass type checking until Supabase types are regenerated
  const { error } = await (supabase as any)
    .from('incidente_fotos')
    .insert(photosToInsert);

  if (error) {
    console.error('Error saving photo references:', error);
    throw error;
  }
}

/**
 * Elimina archivos de Supabase Storage
 * @param storagePaths - Array de rutas de storage a eliminar
 */
export async function deleteMediaFromStorage(storagePaths: string[]) {
  const { error } = await supabase.storage
    .from('incidente-fotos')
    .remove(storagePaths);

  if (error) {
    console.error('Error deleting files:', error);
    throw error;
  }
}
