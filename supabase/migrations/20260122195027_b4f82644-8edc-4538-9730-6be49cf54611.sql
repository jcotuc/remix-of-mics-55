-- Arreglar la secuencia de la tabla direcciones para que no haya conflictos de ID
SELECT setval('direcciones_id_seq', COALESCE((SELECT MAX(id) FROM direcciones), 1), true);