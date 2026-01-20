/**
 * Shared Components - Barrel Export
 * 
 * Re-exporta componentes reutilizables desde su ubicación actual.
 * Para nuevos componentes compartidos, crearlos directamente en esta carpeta.
 * 
 * @example
 * import { StatusBadge, TablePagination } from "@/components/shared";
 */

export { StatusBadge } from "../StatusBadge";
export { TablePagination } from "../TablePagination";
export { SignatureCanvasComponent } from "../SignatureCanvas";
export type { SignatureCanvasRef } from "../SignatureCanvas";
export { ObservacionesLog } from "../ObservacionesLog";
export { CompactPhotoGallery } from "../CompactPhotoGallery";
export { PhotoGalleryWithDescriptions } from "../PhotoGalleryWithDescriptions";
export { IncidentPhotoGallery } from "../IncidentPhotoGallery";
export { default as ImportFormatDialog } from "../ImportFormatDialog";
export { NotificationBadge } from "../NotificationBadge";
export { AccesorioSearchSelect } from "../AccesorioSearchSelect";
