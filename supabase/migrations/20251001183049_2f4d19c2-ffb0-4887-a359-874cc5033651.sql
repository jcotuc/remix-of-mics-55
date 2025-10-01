-- Delete all incidents for clean testing
DELETE FROM public.incidentes;

-- Also delete any media files associated with incidents
DELETE FROM public.media_files;