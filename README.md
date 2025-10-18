# rastrador-gps

🔧 Endpoints disponibles:
Limpieza manual:
bashPOST http://tu-servidor/api/cleanup
Estadísticas:
bashGET http://tu-servidor/api/cleanup/stats
Limpiar dispositivo específico:
bashDELETE http://tu-servidor/api/cleanup/device/GPS_BQS01?days=7
Eliminar TODAS las posiciones (cuidado):
bashDELETE http://tu-servidor/api/cleanup/all?confirm=YES_DELETE_ALL
✅ Funcionalidades:

✅ Limpieza automática cada día a las 3:00 AM
✅ Limpieza manual mediante POST
✅ Estadísticas de posiciones y dispositivos
✅ Limpieza por dispositivo específico
✅ Logs detallados de cada operación
✅ Limpieza inicial al arrancar el servidor

¡Listo para usar! 🎉
