import { apiBackendAction } from "@/lib/api-backend";
import { MediaFile } from "@/components/features/media";

export interface UploadedMedia {
  url: string;
  storage_path: string;
  tipo: 'foto' | 'video';
  orden: number;
  comment?: string;
}

/**
 * Sube archivos multimedia a Supabase Storage via apiBackendAction
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
      const { url, storage_path } = await apiBackendAction("storage.upload", {
        bucket: 'incidente-fotos',
        path: fileName,
        file: item.file,
        options: { cacheControl: '3600', upsert: false }
      });

      uploaded.push({
        url,
        storage_path,
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
  const { user } = await apiBackendAction("auth.getUser", {});
  
  const photosToInsert = uploadedMedia.map(media => ({
    incidente_id: incidenteId,
    tipo,
    url: media.url,
    storage_path: media.storage_path,
    orden: media.orden,
    created_by: user?.id,
    // Note: comments are not stored in incidente_fotos table yet
    // You may want to add a 'comentario' column to the table
  }));

  // Use apiBackendAction for insert
  await apiBackendAction("incidente_fotos.create", photosToInsert as any);
}

/**
 * Elimina archivos de Supabase Storage via apiBackendAction
 * @param storagePaths - Array de rutas de storage a eliminar
 */
export async function deleteMediaFromStorage(storagePaths: string[]) {
  await apiBackendAction("storage.delete", {
    bucket: 'incidente-fotos',
    paths: storagePaths
  });
}
