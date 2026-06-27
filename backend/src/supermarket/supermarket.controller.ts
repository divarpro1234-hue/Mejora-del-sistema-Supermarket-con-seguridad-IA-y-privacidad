import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { SupermarketService } from './supermarket.service';

@Controller('api')
export class SupermarketController {
  constructor(private readonly supermarketService: SupermarketService) {}

  @Get('categorias')
  obtenerCategorias() {
    return this.supermarketService.obtenerCategorias();
  }

  @Get('productos')
  obtenerProductos() {
    return this.supermarketService.obtenerProductos();
  }

  @Get('inventario')
  obtenerInventario() {
    return this.supermarketService.obtenerInventario();
  }

  @Get('ventas/resumen')
  obtenerVentasResumen() {
    return this.supermarketService.obtenerVentasResumen();
  }

  @Get('ia/alertas')
  obtenerAlertasIA() {
    return this.supermarketService.obtenerAlertasIA();
  }

  @Get('auditoria/eventos')
  obtenerAuditoria() {
    return this.supermarketService.obtenerAuditoria();
  }

  @Get('reportes/ventas-diarias')
  obtenerReporteVentasDiarias() {
    return this.supermarketService.obtenerReporteVentasDiarias();
  }

  @Get('reportes/inventario-critico')
  obtenerReporteInventarioCritico() {
    return this.supermarketService.obtenerReporteInventarioCritico();
  }

  @Get('monitoreo/dashboard')
  obtenerDashboardMonitoreo() {
    return this.supermarketService.capturarMetricas();
  }

    @Get('clientes')
  obtenerClientesProtegidos() {
    return this.supermarketService.obtenerClientesProtegidos();
  }

  @Get('usuarios')
  obtenerUsuariosProtegidos() {
    return this.supermarketService.obtenerUsuariosProtegidos();
  }

  @Get('seguridad/reporte')
  obtenerReporteSeguridad() {
    return this.supermarketService.obtenerReporteSeguridad();
  }

  @Get('seguridad/secretos')
  obtenerSecretosPorRotar() {
    return this.supermarketService.obtenerSecretosPorRotar();
  }

  @Get('auditoria/integridad')
  obtenerIntegridadAuditoria() {
    return this.supermarketService.obtenerIntegridadAuditoria();
  }

  @Get('backups/estado')
  obtenerBackupsEstado() {
    return this.supermarketService.obtenerBackupsEstado();
  }

  @Get('backups/cumplimiento')
  obtenerBackupsCumplimiento() {
    return this.supermarketService.obtenerBackupsCumplimiento();
  }

  @Get('backups/ha')
  obtenerAltaDisponibilidadBackups() {
    return this.supermarketService.obtenerAltaDisponibilidadBackups();
  }

  @Get('privacidad/retencion')
  obtenerPrivacidadRetencion() {
    return this.supermarketService.obtenerPrivacidadRetencion();
  }

  @Get('qa/pruebas')
  obtenerPruebasSeguridad() {
    return this.supermarketService.obtenerPruebasSeguridad();
  }

  @Get('integracion/fuentes')
  obtenerFuentesIntegracion() {
    return this.supermarketService.obtenerFuentesIntegracion();
  }

  @Get('gobierno/controles')
  obtenerGobiernoControles() {
    return this.supermarketService.obtenerGobiernoControles();
  }

  @Get('gobierno/postura')
  obtenerPosturaGobierno() {
    return this.supermarketService.obtenerPosturaGobierno();
  }

  @Get('ia/panel-avanzado')
  obtenerPanelIAAvanzada() {
    return this.supermarketService.obtenerPanelIAAvanzada();
  }

  @Get('ia/chatbot-resumen')
  obtenerResumenChatbotIA() {
    return this.supermarketService.obtenerResumenChatbotIA();
  }

    @Get('seguridad/configuracion')
  obtenerConfiguracionSeguridad() {
    return this.supermarketService.obtenerConfiguracionSeguridad();
  }

  @Get('seguridad/ip-permitidas')
  obtenerIpPermitidas() {
    return this.supermarketService.obtenerIpPermitidas();
  }

  @Get('seguridad/ip-bloqueadas')
  obtenerIpBloqueadas() {
    return this.supermarketService.obtenerIpBloqueadas();
  }

  @Get('seguridad/horarios')
  obtenerHorariosAcceso() {
    return this.supermarketService.obtenerHorariosAcceso();
  }

  @Get('seguridad/politica-password')
  obtenerPoliticaPassword() {
    return this.supermarketService.obtenerPoliticaPassword();
  }

  @Get('seguridad/mfa')
  obtenerMfaUsuarios() {
    return this.supermarketService.obtenerMfaUsuarios();
  }

  @Get('seguridad/sesiones')
  obtenerSesionesActivas() {
    return this.supermarketService.obtenerSesionesActivas();
  }

  @Get('seguridad/rotaciones-secretos')
  obtenerRotacionesSecretos() {
    return this.supermarketService.obtenerRotacionesSecretos();
  }
  //ruta de auditoria
    @Get('auditoria/login-intentos')
  obtenerLoginIntentosAuditoria() {
    return this.supermarketService.obtenerLoginIntentosAuditoria();
  }

  @Get('auditoria/eventos-completos')
  obtenerEventosAuditoriaCompletos() {
    return this.supermarketService.obtenerEventosAuditoriaCompletos();
  }

  @Get('auditoria/verificar-cadena')
  verificarIntegridadCadenaAuditoria() {
    return this.supermarketService.verificarIntegridadCadenaAuditoria();
  }

    @Get('backups/politicas')
  obtenerBackupPoliticas() {
    return this.supermarketService.obtenerBackupPoliticas();
  }

  @Get('backups/ejecuciones')
  obtenerBackupEjecuciones() {
    return this.supermarketService.obtenerBackupEjecuciones();
  }

  @Get('backups/verificaciones')
  obtenerBackupVerificaciones() {
    return this.supermarketService.obtenerBackupVerificaciones();
  }

  @Get('backups/comandos')
  obtenerComandosBackup() {
    return this.supermarketService.obtenerComandosBackup();
  }

  @Get('backups/plantillas')
  obtenerPlantillasOperacionales() {
    return this.supermarketService.obtenerPlantillasOperacionales();
  }

  @Get('backups/automatico/configuracion')
  obtenerBackupAutomaticoConfiguracion() {
    return this.supermarketService.obtenerBackupAutomaticoConfiguracion();
  }

  @Post('backups/automatico/configuracion')
  actualizarBackupAutomaticoConfiguracion(@Body() body: any) {
    return this.supermarketService.actualizarBackupAutomaticoConfiguracion(
      body.frecuenciaHoras || body.frecuencia_horas || 24,
      body.activo ?? true,
      body.usuario || body.actualizadoPor || 'admin',
    );
  }

  @Post('backups/automatico/ejecutar-ahora')
  ejecutarBackupAutomaticoAhora(@Body() body: any) {
    return this.supermarketService.ejecutarBackupAhora(
      body.usuario || body.ejecutadoPor || 'admin',
    );
  }

    @Get('reportes/alertas-ia')
  obtenerReporteAlertasIA() {
    return this.supermarketService.obtenerReporteAlertasIA();
  }

  @Get('reportes/privacidad-retencion')
  obtenerReportePrivacidadRetencion() {
    return this.supermarketService.obtenerReportePrivacidadRetencion();
  }

  @Get('reportes/monitoreo-seguridad')
  obtenerReporteMonitoreoSeguridad() {
    return this.supermarketService.obtenerReporteMonitoreoSeguridad();
  }

  @Get('reportes/cumplimiento-seguridad')
  obtenerReporteCumplimientoSeguridad() {
    return this.supermarketService.obtenerReporteCumplimientoSeguridad();
  }

  @Get('reportes/historial')
  obtenerHistorialReportes() {
    return this.supermarketService.obtenerHistorialReportes();
  }

  @Post('reportes/registrar')
  registrarReporteGenerado(@Body() body: any) {
    return this.supermarketService.registrarReporteGenerado(
      body.tipo || 'REPORTE_GENERAL',
      body.formato || 'PDF',
      body.parametros || {},
      body.confidencial ?? true,
    );
  }

    @Get('integracion/sincronizaciones')
  obtenerSincronizacionesIntegracion() {
    return this.supermarketService.obtenerSincronizacionesIntegracion();
  }

  @Get('integracion/plantilla-fdw')
  obtenerPlantillaFdwIntegracion() {
    return this.supermarketService.obtenerPlantillaFdwIntegracion();
  }

  @Post('integracion/sincronizaciones/registrar')
  registrarSincronizacionIntegracion(@Body() body: any) {
    return this.supermarketService.registrarSincronizacionIntegracion(
      Number(body.idFuente || 1),
      body.modulo || 'VENTAS',
      body.estado || 'EXITOSO',
      Number(body.filasLeidas || 0),
      Number(body.filasInsertadas || 0),
      Number(body.filasActualizadas || 0),
      body.mensaje || 'Sincronización registrada desde panel empresarial.',
    );
  }

    @Get('monitoreo/metricas')
  obtenerMetricasMonitoreo() {
    return this.supermarketService.obtenerMetricasMonitoreo();
  }

  @Get('monitoreo/umbrales')
  obtenerUmbralesMonitoreo() {
    return this.supermarketService.obtenerUmbralesMonitoreo();
  }

  @Get('monitoreo/alertas')
  obtenerAlertasOperacionalesMonitoreo() {
    return this.supermarketService.obtenerAlertasOperacionalesMonitoreo();
  }

  @Post('monitoreo/capturar')
  capturarMetricasMonitoreo() {
    return this.supermarketService.capturarMetricasMonitoreo();
  }

  @Post('monitoreo/evaluar-alertas')
  evaluarAlertasMonitoreo() {
    return this.supermarketService.evaluarAlertasMonitoreo();
  }

  @Post('monitoreo/cerrar-alerta')
  cerrarAlertaMonitoreo(@Body() body: any) {
    return this.supermarketService.cerrarAlertaMonitoreo(
      body.idAlerta,
      body.atendidoPor || 'admin',
    );
  }

    @Get('privacidad/solicitudes')
  obtenerSolicitudesPrivacidad() {
    return this.supermarketService.obtenerSolicitudesPrivacidad();
  }

  @Get('privacidad/anonimizaciones')
  obtenerAnonimizacionesPrivacidad() {
    return this.supermarketService.obtenerAnonimizacionesPrivacidad();
  }

  @Get('privacidad/evaluar-clientes')
  evaluarClientesPrivacidad() {
    return this.supermarketService.evaluarClientesPrivacidad();
  }

  @Post('privacidad/solicitudes/registrar')
  registrarSolicitudPrivacidad(@Body() body: any) {
    return this.supermarketService.registrarSolicitudPrivacidad(
      body.idCliente || null,
      body.tipo || 'ACCESO',
      body.motivo || 'Solicitud registrada desde el panel empresarial.',
    );
  }

  @Post('privacidad/solicitudes/resolver')
  resolverSolicitudPrivacidad(@Body() body: any) {
    return this.supermarketService.resolverSolicitudPrivacidad(
      body.idSolicitud,
      body.estado || 'EN_REVISION',
      body.resolucion || 'Solicitud revisada desde el panel empresarial.',
    );
  }
    @Get('qa/ejecuciones')
  obtenerEjecucionesPruebasSeguridad() {
    return this.supermarketService.obtenerEjecucionesPruebasSeguridad();
  }

  @Get('qa/resumen')
  obtenerResumenPruebasSeguridad() {
    return this.supermarketService.obtenerResumenPruebasSeguridad();
  }

  @Post('qa/pruebas/registrar-resultado')
  registrarResultadoPruebaSeguridad(@Body() body: any) {
    return this.supermarketService.registrarResultadoPruebaSeguridad(
      body.codigo || 'QA-SEC-004',
      body.resultado || 'APROBADA',
      body.evidencia || 'Evidencia registrada desde backend.',
      body.observacion || 'Prueba registrada desde panel empresarial.',
    );
  }

    @Get('gobierno/ambientes')
  obtenerAmbientesGobierno() {
    return this.supermarketService.obtenerAmbientesGobierno();
  }

  @Get('gobierno/versiones')
  obtenerVersionesGobierno() {
    return this.supermarketService.obtenerVersionesGobierno();
  }

  @Get('gobierno/resumen-postura')
  obtenerResumenPosturaGobierno() {
    return this.supermarketService.obtenerResumenPosturaGobierno();
  }

  @Post('gobierno/control/actualizar')
  actualizarControlGobierno(@Body() body: any) {
    return this.supermarketService.actualizarControlGobierno(
      body.codigo || 'SEC-007',
      body.estado || 'IMPLEMENTADO',
      body.evidencia || 'Control actualizado desde el panel empresarial.',
    );
  }

  @Post('gobierno/versiones/registrar')
  registrarVersionGobierno(@Body() body: any) {
    return this.supermarketService.registrarVersionGobierno(
      body.version || '2.1-panel',
      body.descripcion || 'Versión registrada desde el panel empresarial.',
      body.hashScript || 'hash-demo-panel-gobierno',
    );
  }

    @Post('ventas/registrar')
  registrarVentaReal(@Body() body: any) {
    return this.supermarketService.registrarVentaReal(
      Number(body.idCaja || 1),
      body.idCliente || null,
      body.metodoPago || 'EFECTIVO',
      Number(body.descuento || 0),
      body.items || [],
      body.idSesion || null,
      {
        referenciaPago: body.referenciaPago || null,
        estadoPago: body.estadoPago || null,
        montoPago: body.montoPago || null,
        tarjetaEnmascarada: body.tarjetaEnmascarada || null,
        codigoAutorizacion: body.codigoAutorizacion || null,
        fechaVencimientoPago: body.fechaVencimientoPago || null,
        qrPayload: body.qrPayload || null,
      },
    );
  }

  @Get('ventas/:idVenta/detalle')
  obtenerDetalleVenta(@Param('idVenta') idVenta: string) {
    return this.supermarketService.obtenerDetalleVenta(idVenta);
  }

  @Get('inventario/movimientos')
  obtenerMovimientosInventario() {
    return this.supermarketService.obtenerMovimientosInventario();
  }


    @Post('pedidos-virtuales/registrar')
  registrarPedidoVirtual(@Body() body: any) {
    return this.supermarketService.registrarPedidoVirtual(
      body.cliente || 'CONSUMIDOR FINAL',
      body.telefonoCi || 'SIN REFERENCIA',
      body.sucursal || 'Supermarket Centro',
      body.items || [],
      {
        metodoPago: body.metodoPago || 'EFECTIVO',
        referenciaPago: body.referenciaPago || null,
        estadoPago: body.estadoPago || null,
        montoPago: body.montoPago || null,
        tarjetaEnmascarada: body.tarjetaEnmascarada || null,
        codigoAutorizacion: body.codigoAutorizacion || null,
        fechaVencimientoPago: body.fechaVencimientoPago || null,
        qrPayload: body.qrPayload || null,
      },
    );
  }

  @Get('pedidos-virtuales')
  listarPedidosVirtuales() {
    return this.supermarketService.listarPedidosVirtuales();
  }

  @Get('pedidos-virtuales/:codigo')
  buscarPedidoVirtual(@Param('codigo') codigo: string) {
    return this.supermarketService.buscarPedidoVirtual(codigo);
  }

  @Post('pedidos-virtuales/:codigo/confirmar')
  confirmarPedidoVirtual(@Param('codigo') codigo: string, @Body() body: any) {
    return this.supermarketService.confirmarPedidoVirtual(
      codigo,
      body.metodoPago || 'EFECTIVO',
      body.idSesion || null,
      {
        referenciaPago: body.referenciaPago || null,
        estadoPago: body.estadoPago || null,
        montoPago: body.montoPago || null,
        tarjetaEnmascarada: body.tarjetaEnmascarada || null,
        codigoAutorizacion: body.codigoAutorizacion || null,
        fechaVencimientoPago: body.fechaVencimientoPago || null,
        qrPayload: body.qrPayload || null,
      },
    );
  }

      @Post('ia/asistente/chat')
  chatAsistenteIA(@Body() body: any) {
    return this.supermarketService.chatAsistenteIAConOllama(
      String(body.pregunta || ''),
      body.historial || [],
    );
  }
}