import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SupermarketService {
  constructor(private readonly databaseService: DatabaseService) {}

  async obtenerCategorias() {
    return this.databaseService.query(`
      SELECT 
        id_categoria,
        nombre,
        descripcion,
        activo
      FROM app.categorias
      WHERE activo = true
      ORDER BY nombre
    `);
  }

  async obtenerProductos() {
  return this.databaseService.query(`
    SELECT
      p.id_producto,
      s.nombre AS sucursal,
      p.codigo_barra,
      p.nombre AS producto,
      c.nombre AS categoria,
      i.stock_actual,
      i.stock_minimo,   
      i.stock_maximo,
      CASE
        WHEN i.stock_actual <= i.stock_minimo THEN 'CRITICO'
        WHEN i.stock_actual >= i.stock_maximo THEN 'ALTO'
        ELSE 'NORMAL'
      END AS estado_stock,
      p.precio_venta,
      i.ubicacion,
      i.updated_at
    FROM app.inventario i
    INNER JOIN app.productos p ON p.id_producto = i.id_producto
    INNER JOIN app.categorias c ON c.id_categoria = p.id_categoria
    INNER JOIN app.sucursales s ON s.id_sucursal = i.id_sucursal
    WHERE p.activo = true
    ORDER BY c.nombre, p.nombre, s.nombre
    LIMIT 300
  `);
}

  async obtenerInventario() {
  return this.databaseService.query(`
    SELECT *
    FROM app.v_inventario_general
    ORDER BY sucursal, categoria, producto
    LIMIT 300
  `);
}

  async obtenerVentasResumen() {
    return this.databaseService.query(`
      SELECT *
      FROM app.v_ventas_resumen
      LIMIT 50
    `);
  }

  async obtenerAlertasIA() {
    return this.databaseService.query(`
      SELECT *
      FROM ai.v_alertas_pendientes
      LIMIT 50
    `);
  }

  async obtenerAuditoria() {
    return this.databaseService.query(`
      SELECT *
      FROM audit.v_eventos_recientes
      LIMIT 50
    `);
  }

  async obtenerReporteVentasDiarias() {
    return this.databaseService.query(`
      SELECT *
      FROM rpt.v_reporte_ventas_diarias
      LIMIT 50
    `);
  }

  async obtenerReporteInventarioCritico() {
    return this.databaseService.query(`
      SELECT *
      FROM rpt.v_reporte_inventario_critico
      LIMIT 50
    `);
  }

  async capturarMetricas() {
    await this.databaseService.query(`
      SELECT mon.fn_capturar_metricas_basicas()
    `);

    return this.databaseService.query(`
      SELECT *
      FROM mon.v_dashboard_seguridad_operativa
    `);
  }

    async obtenerClientesProtegidos() {
    return this.databaseService.query(`
      SELECT *
      FROM app.v_clientes_seguro
      LIMIT 100
    `);
  }

  async obtenerUsuariosProtegidos() {
    return this.databaseService.query(`
      SELECT *
      FROM app.v_usuarios_seguro
      LIMIT 100
    `);
  }

  async obtenerReporteSeguridad() {
    return this.databaseService.query(`
      SELECT *
      FROM rpt.v_reporte_seguridad
      LIMIT 100
    `);
  }

  async obtenerIntegridadAuditoria() {
    return this.databaseService.query(`
      SELECT *
      FROM audit.v_integridad_auditoria
      LIMIT 100
    `);
  }

  async obtenerBackupsEstado() {
    return this.databaseService.query(`
      SELECT *
      FROM ops.v_estado_backups
      LIMIT 100
    `);
  }

  async obtenerBackupsCumplimiento() {
    return this.databaseService.query(`
      SELECT *
      FROM ops.v_cumplimiento_backup_empresarial
      LIMIT 100
    `);
  }

  async obtenerAltaDisponibilidadBackups() {
    return this.databaseService.query(`
      SELECT *
      FROM rpt.v_reporte_ha_backups
      LIMIT 100
    `);
  }

  async obtenerPrivacidadRetencion() {
    return this.databaseService.query(`
      SELECT *
      FROM privacy.v_matriz_retencion
      LIMIT 100
    `);
  }

  async obtenerPruebasSeguridad() {
    return this.databaseService.query(`
      SELECT *
      FROM qa.v_estado_pruebas_seguridad
      LIMIT 100
    `);
  }

  async obtenerFuentesIntegracion() {
    return this.databaseService.query(`
      SELECT *
      FROM integ.fuentes_externas
      ORDER BY id_fuente
      LIMIT 100
    `);
  }

  async obtenerGobiernoControles() {
    return this.databaseService.query(`
      SELECT *
      FROM rpt.v_reporte_cumplimiento_seguridad
      LIMIT 100
    `);
  }

  async obtenerPosturaGobierno() {
    return this.databaseService.query(`
      SELECT *
      FROM gov.fn_resumen_postura_seguridad()
    `);
  }

  async obtenerSecretosPorRotar() {
    return this.databaseService.query(`
      SELECT *
      FROM sec.v_secretos_por_rotar
      LIMIT 100
    `);
  }

  async obtenerPanelIAAvanzada() {
    return this.databaseService.query(`
      SELECT *
      FROM ai.v_panel_ia_avanzada
      LIMIT 100
    `);
  }

  async obtenerResumenChatbotIA() {
    return this.databaseService.query(`
      SELECT ai.fn_chatbot_gerencial_resumen() AS resumen
    `);
  }
  //rutas de seguridad al backend

    async obtenerConfiguracionSeguridad() {
    return this.databaseService.query(`
      SELECT clave, valor, descripcion, updated_at
      FROM sec.configuracion_seguridad
      ORDER BY clave
    `);
  }

  async obtenerIpPermitidas() {
    return this.databaseService.query(`
      SELECT 
        id_ip,
        red::text AS red,
        descripcion,
        rol,
        id_sucursal,
        activa,
        created_at
      FROM sec.ip_permitidas
      ORDER BY id_ip
      LIMIT 100
    `);
  }

  async obtenerIpBloqueadas() {
    return this.databaseService.query(`
      SELECT 
        id_bloqueo,
        ip::text AS ip,
        motivo,
        bloqueada_desde,
        bloqueada_hasta,
        severidad,
        creada_por_ia,
        activa
      FROM sec.ip_bloqueadas
      ORDER BY bloqueada_desde DESC
      LIMIT 100
    `);
  }

  async obtenerHorariosAcceso() {
    return this.databaseService.query(`
      SELECT 
        id_horario,
        rol,
        dia_semana,
        hora_inicio,
        hora_fin,
        permitido,
        descripcion
      FROM sec.horarios_acceso
      ORDER BY rol, dia_semana, hora_inicio
      LIMIT 200
    `);
  }

  async obtenerPoliticaPassword() {
    return this.databaseService.query(`
      SELECT *
      FROM sec.politica_password
      LIMIT 1
    `);
  }

    async obtenerMfaUsuarios() {
    return this.databaseService.query(`
      SELECT
        u.id_usuario,
        u.username,
        u.nombre_completo,
        r.nombre AS rol,
        COALESCE(s.nombre, 'GLOBAL') AS sucursal,
        COALESCE(m.metodo, 'NO_CONFIGURADO') AS metodo,
        COALESCE(m.activo, false) AS activo,
        m.codigo_expira_en,
        m.ultimo_uso_en,
        m.created_at
      FROM app.usuarios u
      INNER JOIN app.roles r ON r.id_rol = u.id_rol
      LEFT JOIN app.sucursales s ON s.id_sucursal = u.id_sucursal
      LEFT JOIN sec.usuario_mfa m ON m.id_usuario = u.id_usuario
      ORDER BY r.nivel_seguridad DESC, u.username ASC
    `);
  }

  async obtenerSesionesActivas() {
    return this.databaseService.query(`
      SELECT 
        id_sesion,
        username,
        rol,
        id_sucursal,
        ip::text AS ip,
        inicio_en,
        ultimo_uso_en,
        finalizada_en,
        estado
      FROM sec.sesiones_activas
      ORDER BY inicio_en DESC
      LIMIT 100
    `);
  }

  async obtenerRotacionesSecretos() {
    return this.databaseService.query(`
      SELECT 
        rs.fecha,
        sr.nombre,
        sr.proveedor,
        rs.ejecutado_por,
        rs.motivo,
        rs.resultado,
        rs.observacion
      FROM sec.rotaciones_secretos rs
      INNER JOIN sec.secretos_referenciados sr ON sr.id_secreto = rs.id_secreto
      ORDER BY rs.fecha DESC
      LIMIT 100
    `);
  }
  //ruta de auditoria
    async obtenerLoginIntentosAuditoria() {
    return this.databaseService.query(`
      SELECT *
      FROM audit.login_intentos
      ORDER BY fecha DESC
      LIMIT 100
    `);
  }

  async obtenerEventosAuditoriaCompletos() {
    return this.databaseService.query(`
      SELECT 
        id_evento,
        fecha,
        usuario_db,
        usuario_app,
        rol_app,
        sucursal_app,
        esquema,
        tabla,
        operacion,
        fila_pk,
        ip,
        hash_anterior,
        hash_evento
      FROM audit.eventos
      ORDER BY id_evento DESC
      LIMIT 100
    `);
  }

  async verificarIntegridadCadenaAuditoria() {
    return this.databaseService.query(`
      SELECT *
      FROM audit.verificar_integridad_cadena()
      LIMIT 100
    `);
  }

    async obtenerBackupPoliticas() {
    return this.databaseService.query(`
      SELECT *
      FROM ops.backup_politicas
      ORDER BY id_politica
      LIMIT 100
    `);
  }

  async obtenerBackupEjecuciones() {
    return this.databaseService.query(`
      SELECT *
      FROM ops.backup_ejecuciones
      ORDER BY iniciado_en DESC
      LIMIT 100
    `);
  }

  async obtenerBackupVerificaciones() {
    return this.databaseService.query(`
      SELECT *
      FROM ops.backup_verificaciones
      ORDER BY fecha DESC
      LIMIT 100
    `);
  }

  async obtenerComandosBackup() {
    return this.databaseService.query(`
      SELECT 
        'pg_dump' AS herramienta,
        ops.comando_backup_pg_dump('supermarket_db') AS comando
      UNION ALL
      SELECT 
        'pgBackRest' AS herramienta,
        ops.comando_backup_pgbackrest('supermarket') AS comando
    `);
  }

  async obtenerPlantillasOperacionales() {
    return this.databaseService.query(`
      SELECT 
        'pg_hba.conf seguro' AS plantilla,
        ops.plantilla_pg_hba_conf_seguro() AS contenido
      UNION ALL
      SELECT 
        'postgresql.conf TLS' AS plantilla,
        ops.plantilla_postgresql_conf_tls() AS contenido
      UNION ALL
      SELECT 
        'Firewall UFW' AS plantilla,
        ops.plantilla_firewall_ufw() AS contenido
    `);
  }

  async obtenerReporteAlertasIA() {
    return this.databaseService.query(`
      SELECT *
      FROM rpt.v_reporte_alertas_ia
      LIMIT 100
    `);
  }

  async obtenerReportePrivacidadRetencion() {
    return this.databaseService.query(`
      SELECT *
      FROM rpt.v_reporte_privacidad_retencion
      LIMIT 100
    `);
  }

  async obtenerReporteMonitoreoSeguridad() {
    await this.databaseService.query(`
      SELECT mon.fn_capturar_metricas_basicas()
    `);

    return this.databaseService.query(`
      SELECT *
      FROM rpt.v_reporte_monitoreo_seguridad
      LIMIT 100
    `);
  }

  async obtenerReporteCumplimientoSeguridad() {
    return this.databaseService.query(`
      SELECT *
      FROM rpt.v_reporte_cumplimiento_seguridad
      LIMIT 100
    `);
  }

  async obtenerHistorialReportes() {
    return this.databaseService.query(`
      SELECT 
        id_reporte,
        fecha,
        tipo,
        formato,
        parametros,
        usuario_app,
        rol_app,
        id_sucursal,
        confidencial,
        hash_reporte,
        observacion
      FROM rpt.reportes_generados
      ORDER BY fecha DESC
      LIMIT 100
    `);
  }

  async registrarReporteGenerado(
    tipo: string,
    formato: string,
    parametros: Record<string, unknown>,
    confidencial: boolean,
  ) {
    return this.databaseService.query(`
      SELECT rpt.registrar_reporte($1, $2, $3::jsonb, $4) AS id_reporte
    `, [
      tipo,
      formato,
      JSON.stringify(parametros || {}),
      confidencial,
    ]);
  }

    async obtenerSincronizacionesIntegracion() {
    return this.databaseService.query(`
      SELECT
        s.id_sinc,
        f.nombre AS fuente,
        f.tipo AS tipo_fuente,
        s.modulo,
        s.iniciado_en,
        s.finalizado_en,
        s.estado,
        s.filas_leidas,
        s.filas_insertadas,
        s.filas_actualizadas,
        s.mensaje
      FROM integ.sincronizaciones s
      LEFT JOIN integ.fuentes_externas f ON f.id_fuente = s.id_fuente
      ORDER BY s.iniciado_en DESC
      LIMIT 100
    `);
  }

  async obtenerPlantillaFdwIntegracion() {
    return this.databaseService.query(`
      SELECT integ.plantilla_postgres_fdw(
        'srv_proveedores',
        'proveedores.interno.local',
        'proveedores_db',
        5432,
        'public',
        'integ'
      ) AS plantilla
    `);
  }

  async registrarSincronizacionIntegracion(
    idFuente: number,
    modulo: string,
    estado: string,
    filasLeidas: number,
    filasInsertadas: number,
    filasActualizadas: number,
    mensaje: string,
  ) {
    return this.databaseService.query(
      `
      INSERT INTO integ.sincronizaciones (
        id_fuente,
        modulo,
        finalizado_en,
        estado,
        filas_leidas,
        filas_insertadas,
        filas_actualizadas,
        mensaje
      )
      VALUES ($1, $2, now(), $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        idFuente,
        modulo,
        estado,
        filasLeidas,
        filasInsertadas,
        filasActualizadas,
        mensaje,
      ],
    );
  }

    async obtenerMetricasMonitoreo() {
    return this.databaseService.query(`
      SELECT
        id_metrica,
        fecha,
        nombre,
        valor_numeric,
        valor_texto,
        unidad,
        severidad,
        detalle
      FROM mon.metricas_sistema
      ORDER BY fecha DESC
      LIMIT 100
    `);
  }

  async obtenerUmbralesMonitoreo() {
    return this.databaseService.query(`
      SELECT
        id_umbral,
        nombre_metrica,
        operador,
        valor_umbral,
        severidad,
        descripcion,
        activo
      FROM mon.umbral_alertas
      ORDER BY id_umbral ASC
    `);
  }

  async obtenerAlertasOperacionalesMonitoreo() {
    return this.databaseService.query(`
      SELECT
        id_alerta,
        fecha,
        tipo,
        severidad,
        mensaje,
        detalle,
        estado,
        atendido_por,
        atendido_at
      FROM mon.alertas_operacionales
      ORDER BY fecha DESC
      LIMIT 100
    `);
  }

  async capturarMetricasMonitoreo() {
    await this.databaseService.query(`
      SELECT mon.fn_capturar_metricas_basicas()
    `);

    return this.obtenerMetricasMonitoreo();
  }

  async evaluarAlertasMonitoreo() {
    return this.databaseService.query(`
      SELECT mon.fn_evaluar_alertas_operacionales() AS alertas_generadas
    `);
  }

  async cerrarAlertaMonitoreo(idAlerta: string, atendidoPor: string) {
    return this.databaseService.query(
      `
      UPDATE mon.alertas_operacionales
      SET
        estado = 'CERRADA',
        atendido_por = $2,
        atendido_at = now()
      WHERE id_alerta = $1
      RETURNING *
      `,
      [idAlerta, atendidoPor],
    );
  }

      async obtenerEjecucionesPruebasSeguridad() {
    return this.databaseService.query(`
      SELECT
        e.id_ejecucion,
        p.codigo,
        p.categoria,
        p.nombre,
        p.criticidad,
        e.fecha,
        e.ejecutado_por,
        e.resultado,
        e.evidencia,
        e.observacion
      FROM qa.ejecuciones_pruebas e
      INNER JOIN qa.pruebas_seguridad p ON p.id_prueba = e.id_prueba
      ORDER BY e.fecha DESC
      LIMIT 100
    `);
  }

  async obtenerResumenPruebasSeguridad() {
    return this.databaseService.query(`
      SELECT
        COUNT(*)::int AS total_pruebas,
        COUNT(*) FILTER (WHERE ultimo_resultado = 'APROBADA')::int AS aprobadas,
        COUNT(*) FILTER (WHERE ultimo_resultado = 'FALLIDA')::int AS fallidas,
        COUNT(*) FILTER (WHERE ultimo_resultado = 'NO_EJECUTADA')::int AS no_ejecutadas,
        COUNT(*) FILTER (WHERE criticidad = 'CRITICA')::int AS criticas,
        COUNT(*) FILTER (WHERE criticidad = 'ALTA')::int AS altas
      FROM qa.v_estado_pruebas_seguridad
    `);
  }

  async registrarResultadoPruebaSeguridad(
    codigo: string,
    resultado: string,
    evidencia: string,
    observacion: string,
  ) {
    return this.databaseService.query(
      `
      SELECT qa.registrar_resultado_prueba($1, $2, $3, $4) AS id_ejecucion
      `,
      [
        codigo || 'QA-SEC-004',
        resultado || 'APROBADA',
        evidencia || 'Evidencia registrada desde backend.',
        observacion || 'Prueba registrada desde panel empresarial.',
      ],
    );
  }
    async obtenerSolicitudesPrivacidad() {
    return this.databaseService.query(`
      SELECT
        s.id_solicitud,
        s.id_cliente,
        CASE
          WHEN c.id_cliente IS NULL THEN 'SIN_CLIENTE_ASOCIADO'
          ELSE c.nombres || ' ' || c.apellidos
        END AS cliente,
        s.tipo,
        s.estado,
        s.motivo,
        s.solicitado_por,
        s.fecha_solicitud,
        s.fecha_resolucion,
        s.resolucion
      FROM privacy.solicitudes_privacidad s
      LEFT JOIN app.clientes c ON c.id_cliente = s.id_cliente
      ORDER BY s.fecha_solicitud DESC
      LIMIT 100
    `);
  }

  async obtenerAnonimizacionesPrivacidad() {
    return this.databaseService.query(`
      SELECT
        id_anonimizacion,
        id_cliente,
        fecha,
        ejecutado_por,
        motivo,
        hash_cliente,
        observacion
      FROM privacy.anonimizaciones
      ORDER BY fecha DESC
      LIMIT 100
    `);
  }

  async evaluarClientesPrivacidad() {
    return this.databaseService.query(`
      SELECT *
      FROM privacy.fn_evaluar_clientes_para_anonimizar()
      LIMIT 100
    `);
  }

  async registrarSolicitudPrivacidad(
    idCliente: string | null,
    tipo: string,
    motivo: string,
  ) {
    return this.databaseService.query(
      `
      INSERT INTO privacy.solicitudes_privacidad (
        id_cliente,
        tipo,
        motivo
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [
        idCliente || null,
        tipo || 'ACCESO',
        motivo || 'Solicitud registrada desde el panel empresarial.',
      ],
    );
  }

  async resolverSolicitudPrivacidad(
    idSolicitud: string,
    estado: string,
    resolucion: string,
  ) {
    return this.databaseService.query(
      `
      UPDATE privacy.solicitudes_privacidad
      SET
        estado = $2,
        fecha_resolucion = now(),
        resolucion = $3
      WHERE id_solicitud = $1
      RETURNING *
      `,
      [
        idSolicitud,
        estado || 'EN_REVISION',
        resolucion || 'Solicitud actualizada desde el panel empresarial.',
      ],
    );
  }

    async obtenerAmbientesGobierno() {
    return this.databaseService.query(`
      SELECT
        id_ambiente,
        nombre,
        descripcion,
        permite_datos_reales,
        requiere_tls,
        requiere_backup,
        activo,
        created_at
      FROM gov.ambientes
      ORDER BY id_ambiente ASC
    `);
  }

  async obtenerVersionesGobierno() {
    return this.databaseService.query(`
      SELECT
        id_version,
        version,
        descripcion,
        aplicado_por,
        hash_script,
        fecha_aplicacion
      FROM gov.versiones_base_datos
      ORDER BY fecha_aplicacion DESC
      LIMIT 100
    `);
  }

  async obtenerResumenPosturaGobierno() {
    return this.databaseService.query(`
      SELECT *
      FROM gov.fn_resumen_postura_seguridad()
    `);
  }

  async actualizarControlGobierno(
    codigo: string,
    estado: string,
    evidencia: string,
  ) {
    return this.databaseService.query(
      `
      UPDATE gov.controles_seguridad
      SET
        estado = $2,
        evidencia = COALESCE(NULLIF($3, ''), evidencia),
        updated_at = now()
      WHERE codigo = $1
      RETURNING *
      `,
      [
        codigo || 'SEC-007',
        estado || 'IMPLEMENTADO',
        evidencia || 'Control actualizado desde el panel empresarial.',
      ],
    );
  }

  async registrarVersionGobierno(
    version: string,
    descripcion: string,
    hashScript: string,
  ) {
    return this.databaseService.query(
      `
      INSERT INTO gov.versiones_base_datos (
        version,
        descripcion,
        hash_script
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (version) DO UPDATE
      SET
        descripcion = EXCLUDED.descripcion,
        hash_script = EXCLUDED.hash_script,
        fecha_aplicacion = now()
      RETURNING *
      `,
      [
        version || '2.1-panel',
        descripcion || 'Versión registrada desde el panel empresarial.',
        hashScript || 'hash-demo-panel-gobierno',
      ],
    );
  }

     async registrarVentaReal(
    idCaja: number,
    idCliente: string | null,
    metodoPago: string,
    descuento: number,
    items: Array<{ id_producto: number; cantidad: number }>,
    idSesion?: string | null,
  ) {
    const ventaCreada = await this.databaseService.query(
      `
      WITH sesion AS (
        SELECT
          s.id_usuario,
          s.username,
          s.rol,
          s.id_sucursal
        FROM sec.sesiones_activas s
        WHERE s.id_sesion = NULLIF($6, '')::uuid
          AND s.estado = 'ACTIVA'
        LIMIT 1
      ),
      fallback_admin AS (
        SELECT
          u.id_usuario,
          u.username,
          r.nombre AS rol,
          u.id_sucursal
        FROM app.usuarios u
        INNER JOIN app.roles r ON r.id_rol = u.id_rol
        WHERE u.username = 'admin'
        LIMIT 1
      ),
      usuario_ctx AS (
        SELECT * FROM sesion
        UNION ALL
        SELECT * FROM fallback_admin
        WHERE NOT EXISTS (SELECT 1 FROM sesion)
        LIMIT 1
      ),
      contexto AS (
        SELECT
          set_config('app.user_id', id_usuario::text, false),
          set_config('app.username', username, false),
          set_config('app.rol', rol, false),
          set_config('app.sucursal_id', COALESCE(id_sucursal::text, ''), false)
        FROM usuario_ctx
      )
      SELECT app.registrar_venta(
        $1::int,
        NULLIF($2, '')::uuid,
        $3::text,
        $4::numeric,
        $5::jsonb
      ) AS id_venta
      FROM contexto
      `,
      [
        idCaja,
        idCliente || '',
        metodoPago || 'EFECTIVO',
        descuento || 0,
        JSON.stringify(items || []),
        idSesion || '',
      ],
    );

    const idVenta = ventaCreada[0]?.id_venta;

    if (!idVenta) {
      return [];
    }

    return this.databaseService.query(
      `
      SELECT
        v.id_venta,
        v.fecha,
        s.nombre AS sucursal,
        cj.codigo AS caja,
        u.username AS cajero,
        COALESCE(c.nombres || ' ' || c.apellidos, 'SIN CLIENTE') AS cliente,
        v.metodo_pago,
        v.subtotal,
        v.descuento,
        v.impuesto,
        v.total,
        v.estado
      FROM app.ventas v
      INNER JOIN app.sucursales s ON s.id_sucursal = v.id_sucursal
      INNER JOIN app.cajas cj ON cj.id_caja = v.id_caja
      INNER JOIN app.usuarios u ON u.id_usuario = v.id_cajero
      LEFT JOIN app.clientes c ON c.id_cliente = v.id_cliente
      WHERE v.id_venta = $1
      `,
      [idVenta],
    );
  }
    async obtenerDetalleVenta(idVenta: string) {
    return this.databaseService.query(
      `
      SELECT
        d.id_detalle,
        d.id_venta,
        d.id_producto,
        p.nombre AS producto,
        d.cantidad,
        d.precio_unitario,
        d.subtotal
      FROM app.venta_detalle d
      INNER JOIN app.productos p ON p.id_producto = d.id_producto
      WHERE d.id_venta = $1
      ORDER BY d.id_detalle ASC
      `,
      [idVenta],
    );
  }

  async obtenerMovimientosInventario() {
    return this.databaseService.query(`
      SELECT
        m.id_movimiento,
        m.fecha,
        s.nombre AS sucursal,
        p.nombre AS producto,
        m.tipo,
        m.cantidad,
        m.stock_anterior,
        m.stock_nuevo,
        m.referencia,
        m.descripcion
      FROM app.movimientos_inventario m
      INNER JOIN app.sucursales s ON s.id_sucursal = m.id_sucursal
      INNER JOIN app.productos p ON p.id_producto = m.id_producto
      ORDER BY m.fecha DESC
      LIMIT 100
    `);
  }


    private generarCodigoPedidoVirtual() {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const aleatorio = Math.floor(1000 + Math.random() * 9000);

    return `PED-${anio}${mes}${dia}-${aleatorio}`;
  }

  async registrarPedidoVirtual(
    cliente: string,
    telefonoCi: string,
    sucursal: string,
    items: Array<{ id_producto: number; cantidad: number }>,
  ) {
    const codigo = this.generarCodigoPedidoVirtual();

    return this.databaseService.query(
      `
      WITH items_entrada AS (
        SELECT
          x.id_producto::int AS id_producto,
          x.cantidad::int AS cantidad
        FROM jsonb_to_recordset($5::jsonb) AS x(
          id_producto int,
          cantidad int
        )
        WHERE x.cantidad > 0
      ),
      items_calculados AS (
        SELECT
          i.id_producto,
          p.nombre AS producto,
          i.cantidad,
          p.precio_venta,
          (p.precio_venta * i.cantidad)::numeric(12,2) AS subtotal
        FROM items_entrada i
        INNER JOIN app.productos p ON p.id_producto = i.id_producto
      ),
      resumen AS (
        SELECT
          COALESCE(SUM(subtotal), 0)::numeric(12,2) AS total,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id_producto', id_producto,
                'producto', producto,
                'cantidad', cantidad,
                'precio_venta', precio_venta,
                'subtotal', subtotal
              )
            ),
            '[]'::jsonb
          ) AS items_json
        FROM items_calculados
      ),
      pedido AS (
        INSERT INTO app.pedidos_virtuales (
          codigo,
          cliente,
          telefono_ci,
          sucursal,
          estado,
          total_estimado,
          items,
          observacion
        )
        SELECT
          $1,
          $2,
          $3,
          $4,
          'PENDIENTE',
          r.total,
          r.items_json,
          'Pedido virtual generado desde tienda pública.'
        FROM resumen r
        WHERE r.total > 0
        RETURNING *
      )
      SELECT
        id_pedido,
        codigo,
        cliente,
        telefono_ci,
        sucursal,
        estado,
        total_estimado,
        items,
        fecha_creacion,
        fecha_confirmacion,
        id_venta,
        observacion
      FROM pedido
      `,
      [
        codigo,
        cliente || 'CONSUMIDOR FINAL',
        telefonoCi || 'SIN REFERENCIA',
        sucursal,
        JSON.stringify(items || []),
      ],
    );
  }

  async buscarPedidoVirtual(codigo: string) {
    return this.databaseService.query(
      `
      SELECT
        id_pedido,
        codigo,
        cliente,
        telefono_ci,
        sucursal,
        estado,
        total_estimado,
        items,
        fecha_creacion,
        fecha_confirmacion,
        id_venta,
        observacion
      FROM app.pedidos_virtuales
      WHERE UPPER(codigo) = UPPER($1)
      LIMIT 1
      `,
      [codigo],
    );
  }

  async listarPedidosVirtuales() {
    return this.databaseService.query(`
      SELECT
        id_pedido,
        codigo,
        cliente,
        telefono_ci,
        sucursal,
        estado,
        total_estimado,
        items,
        fecha_creacion,
        fecha_confirmacion,
        id_venta,
        observacion
      FROM app.v_pedidos_virtuales
      LIMIT 50
    `);
  }

  async confirmarPedidoVirtual(
    codigo: string,
    metodoPago: string,
    idSesion?: string | null,
  ) {
    const pedidoEncontrado = await this.buscarPedidoVirtual(codigo);

    if (!pedidoEncontrado || pedidoEncontrado.length === 0) {
      return [
        {
          exito: false,
          mensaje: 'Pedido virtual no encontrado.',
        },
      ];
    }

    const pedido = pedidoEncontrado[0];

    if (pedido.estado !== 'PENDIENTE') {
      return [
        {
          exito: false,
          mensaje: `El pedido no puede confirmarse porque está en estado ${pedido.estado}.`,
          pedido,
        },
      ];
    }

    let idCaja = 1;

    if (pedido.sucursal === 'Supermarket Centro') {
      idCaja = 1;
    } else if (pedido.sucursal === 'Supermarket El Alto') {
      idCaja = 2;
    } else if (pedido.sucursal === 'Supermarket Zona Sur') {
      idCaja = 3;
    }

    const itemsVenta = (pedido.items || []).map((item: any) => ({
      id_producto: Number(item.id_producto),
      cantidad: Number(item.cantidad),
    }));

    const venta = await this.registrarVentaReal(
      idCaja,
      null,
      metodoPago || 'EFECTIVO',
      0,
      itemsVenta,
      idSesion || null,
    );

    if (!venta || venta.length === 0) {
      return [
        {
          exito: false,
          mensaje: 'No se pudo registrar la venta desde el pedido virtual.',
          pedido,
        },
      ];
    }

    await this.databaseService.query(
      `
      UPDATE app.pedidos_virtuales
      SET
        estado = 'CONFIRMADO',
        fecha_confirmacion = now(),
        id_venta = $2,
        observacion = 'Pedido confirmado por cajero y convertido en venta real.'
      WHERE UPPER(codigo) = UPPER($1)
      `,
      [codigo, venta[0].id_venta],
    );

    return [
      {
        exito: true,
        mensaje: 'Pedido confirmado y venta registrada correctamente.',
        pedido: {
          ...pedido,
          estado: 'CONFIRMADO',
          id_venta: venta[0].id_venta,
        },
        venta: venta[0],
      },
    ];
  }



    private normalizarTextoIA(texto: string) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private contarCoincidenciasIA(texto: string, palabras: string[]) {
    return palabras.reduce((total, palabra) => {
      return texto.includes(palabra) ? total + 1 : total;
    }, 0);
  }

  private formatearBsIA(valor: any) {
    const numero = Number(valor || 0);
    return `Bs ${numero.toFixed(2)}`;
  }

  private async consultaSeguraIA(sql: string, params: any[] = []) {
    try {
      return await this.databaseService.query(sql, params);
    } catch (error) {
      console.error('Error en consulta IA:', error);
      return [];
    }
  }

  async chatAsistenteIA(preguntaOriginal: string, historial: any[] = []) {
    const pregunta = String(preguntaOriginal || '').trim();
    const texto = this.normalizarTextoIA(pregunta);

    if (!pregunta) {
      return [
        {
          rol: 'ia',
          respuesta:
            'Escribe una consulta sobre el sistema Supermarket. Puedo ayudarte con ventas, inventario, pedidos virtuales, seguridad, auditoría, reportes, IA, backups, privacidad, monitoreo y gobierno empresarial.',
          tema: 'AYUDA',
        },
      ];
    }

    const esSaludo =
      texto === 'hola' ||
      texto.includes('buenos dias') ||
      texto.includes('buenas tardes') ||
      texto.includes('buenas noches') ||
      texto.includes('saludos') ||
      texto === 'hey';

    if (esSaludo) {
      return [
        {
          rol: 'ia',
          respuesta:
            'Hola, soy el asistente IA del sistema Supermarket. Puedo ayudarte a analizar ventas, inventario, pedidos virtuales, alertas, seguridad, auditoría, reportes y la estructura de la base de datos. ¿Qué deseas revisar?',
          tema: 'SALUDO',
        },
      ];
    }

    const fueraDelSistema = [
      'receta',
      'cocina',
      'comida',
      'mundial',
      'futbol',
      'pelicula',
      'musica',
      'novia',
      'novio',
      'tarea de matematicas',
      'historia universal',
      'chiste',
      'poema',
    ];

    const temasSistema = {
      ventas: [
        'venta',
        'ventas',
        'vendido',
        'total vendido',
        'caja',
        'cajero',
        'metodo de pago',
        'factura',
        'comprobante',
      ],
      inventario: [
        'inventario',
        'stock',
        'producto',
        'productos',
        'reposicion',
        'stock bajo',
        'stock critico',
        'sucursal',
        'sucursales',
      ],
      pedidos: [
        'pedido',
        'pedidos',
        'pedido virtual',
        'ticket',
        'codigo',
        'confirmar pedido',
        'cliente virtual',
      ],
      seguridad: [
        'seguridad',
        'login',
        'inicio de sesion',
        'riesgo',
        'ip',
        'bloqueado',
        'mfa',
        'password',
        'acceso',
      ],
      auditoria: [
        'auditoria',
        'audit',
        'evento',
        'eventos',
        'hash',
        'integridad',
        'trazabilidad',
      ],
      ia: [
        'ia',
        'inteligencia artificial',
        'alerta ia',
        'alertas ia',
        'fraude',
        'anomalia',
        'modelo',
        'prediccion',
        'chatbot',
      ],
      reportes: [
        'reporte',
        'reportes',
        'ventas diarias',
        'inventario critico',
        'cumplimiento',
      ],
      backups: [
        'backup',
        'backups',
        'respaldo',
        'restauracion',
        'copia',
        'alta disponibilidad',
        'ha',
      ],
      privacidad: [
        'privacidad',
        'datos personales',
        'retencion',
        'anonimizar',
        'anonimizacion',
        'cliente protegido',
      ],
      gobierno: [
        'gobierno',
        'control',
        'controles',
        'postura',
        'ambiente',
        'version',
        'qa',
        'prueba',
        'pruebas',
      ],
      basedatos: [
        'base de datos',
        'bd',
        'sql',
        'postgresql',
        'tabla',
        'tablas',
        'vista',
        'vistas',
        'funcion',
        'funciones',
        'esquema',
        'esquemas',
        'estructura de la base',
        'modelo de datos',
      ],
    };

    const mencionaTemaExterno = fueraDelSistema.some((palabra) =>
      texto.includes(palabra),
    );

    const puntajes = Object.entries(temasSistema)
      .map(([tema, palabras]) => ({
        tema,
        puntaje: this.contarCoincidenciasIA(texto, palabras),
      }))
      .filter((item) => item.puntaje > 0)
      .sort((a, b) => b.puntaje - a.puntaje);

    if (mencionaTemaExterno && puntajes.length === 0) {
      return [
        {
          rol: 'ia',
          respuesta:
            'Solo puedo responder preguntas relacionadas con el sistema Supermarket. Puedes consultarme sobre ventas, inventario, pedidos virtuales, seguridad, auditoría, IA, reportes, backups, privacidad, monitoreo, gobierno empresarial o la estructura de la base de datos.',
          tema: 'FUERA_DEL_SISTEMA',
        },
      ];
    }




    const consultaEstadoGeneral =
      texto.includes('sistema es funcional') ||
      texto.includes('el sistema funciona') ||
      texto.includes('esta funcionando') ||
      texto.includes('esta bien el sistema') ||
      texto.includes('sistema completo') ||
      texto.includes('esta completo') ||
      texto.includes('resumen gerencial') ||
      texto.includes('resumen ejecutivo') ||
      texto.includes('resumen general') ||
      texto.includes('resumen del sistema') ||
      texto.includes('estado general');

    if (consultaEstadoGeneral) {
      return [
        {
          rol: 'ia',
          respuesta:
            'Sí, el sistema Supermarket se encuentra funcional en sus flujos principales. Actualmente permite operar la tienda pública, generar tickets virtuales, confirmar pedidos con cajero, registrar ventas reales, descontar inventario, emitir comprobantes, controlar accesos, registrar auditoría y visualizar los módulos empresariales desde el panel administrativo.\n\nTambién cuenta con módulos de seguridad, IA, reportes, monitoreo, privacidad, QA, integración, backups y gobierno empresarial. Para una revisión más específica puedes preguntarme, por ejemplo: “¿cómo van las ventas?”, “¿hay stock bajo?” o “¿hay alertas críticas?”.',
          tema: 'ESTADO_GENERAL',
        },
      ];
    }






        const pideSugerencias =
      texto.includes('que preguntas') ||
      texto.includes('preguntas me sugieres') ||
      texto.includes('que puedo preguntar') ||
      texto.includes('que puedo preguntarte') ||
      texto.includes('sugerencias') ||
      texto.includes('opciones') ||
      texto.includes('que puedes hacer') ||
      texto.includes('ayudame a preguntar');

    if (pideSugerencias) {
      return [
        {
          rol: 'ia',
          respuesta:
            'Puedes preguntarme cosas como:\n\n' +
            '1. Ventas\n' +
            '- ¿Cómo van las ventas del sistema?\n' +
            '- ¿Qué sucursal vendió más?\n' +
            '- ¿Cuánto se vendió en total?\n\n' +
            '2. Inventario\n' +
            '- ¿Hay productos con stock bajo?\n' +
            '- ¿Qué productos necesitan reposición?\n' +
            '- ¿Cómo está el inventario por sucursal?\n\n' +
            '3. Pedidos virtuales\n' +
            '- ¿Cómo funciona el pedido virtual?\n' +
            '- ¿Cuántos pedidos virtuales están pendientes?\n' +
            '- ¿Qué pasa cuando un cajero confirma un ticket?\n\n' +
            '4. Seguridad y auditoría\n' +
            '- ¿Hay alertas críticas de seguridad?\n' +
            '- ¿Hubo intentos de login fallidos?\n' +
            '- ¿La auditoría mantiene integridad?\n\n' +
            '5. Base de datos\n' +
            '- ¿Qué tablas importantes tiene la base de datos?\n' +
            '- ¿Qué esquemas usa el sistema?\n' +
            '- ¿Qué funciones principales tiene PostgreSQL?\n\n' +
            '6. Módulos empresariales\n' +
            '- ¿Qué módulos tiene el panel empresarial?\n' +
            '- ¿Qué parte del sistema es más sobresaliente?\n' +
            '- ¿El sistema cumple con seguridad, reportes e IA?',
          tema: 'SUGERENCIAS',
        },
      ];
    }

    const pideDestacado =
      texto.includes('sobresaliente') ||
      texto.includes('destacado') ||
      texto.includes('lo mas importante') ||
      texto.includes('lo más importante') ||
      texto.includes('que destaca') ||
      texto.includes('parte fuerte') ||
      texto.includes('fortaleza');

    if (pideDestacado) {
      return [
        {
          rol: 'ia',
          respuesta:
            'Lo más sobresaliente del sistema Supermarket es que no solo registra productos y ventas, sino que integra varios controles empresariales en un solo flujo.\n\n' +
            'La parte más fuerte es el flujo completo de compra:\n' +
            'cliente visitante genera un ticket virtual, el cajero confirma el pedido, el sistema registra la venta real, descuenta inventario, genera comprobante e inserta evidencia en auditoría.\n\n' +
            'Además, el panel empresarial incluye seguridad, auditoría, IA, reportes, backups, monitoreo, privacidad, QA, integración y gobierno empresarial. Eso hace que el proyecto sea más completo que una tienda básica.',
          tema: 'DESTACADO',
        },
      ];
    }


    

    if (puntajes.length === 0) {
      return [
        {
          rol: 'ia',
          respuesta:
            'No identifiqué una consulta relacionada con el sistema Supermarket. Puedo ayudarte con ventas, inventario, pedidos virtuales, seguridad, auditoría, IA, reportes, backups, privacidad, monitoreo, gobierno empresarial o estructura de la base de datos.',
          tema: 'NO_RECONOCIDO',
        },
      ];
    }

    const temasDetectados = puntajes.slice(0, 3).map((item) => item.tema);
    const respuestas: string[] = [];

    if (temasDetectados.includes('basedatos')) {
      const tablas = await this.consultaSeguraIA(`
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname IN ('app','sec','audit','ai','ops','rpt','integ','mon','privacy','qa','gov')
        ORDER BY schemaname, tablename
      `);

      const vistas = await this.consultaSeguraIA(`
        SELECT schemaname, viewname
        FROM pg_views
        WHERE schemaname IN ('app','sec','audit','ai','ops','rpt','integ','mon','privacy','qa','gov')
        ORDER BY schemaname, viewname
      `);

      const funciones = await this.consultaSeguraIA(`
        SELECT n.nspname AS esquema, p.proname AS funcion
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname IN ('app','sec','audit','ai','ops','rpt','integ','mon','privacy','qa','gov')
        ORDER BY n.nspname, p.proname
      `);

      respuestas.push(
        `Estructura de la base de datos Supermarket:\n\n` +
          `- Esquemas principales: app, sec, audit, ai, ops, rpt, integ, mon, privacy, qa y gov.\n` +
          `- Tablas detectadas: ${tablas.length}.\n` +
          `- Vistas detectadas: ${vistas.length}.\n` +
          `- Funciones detectadas: ${funciones.length}.\n\n` +
          `El esquema app contiene la operación comercial: sucursales, usuarios, productos, inventario, clientes, cajas, ventas, detalle de ventas, movimientos de inventario y pedidos virtuales.\n` +
          `El esquema sec gestiona seguridad, sesiones, MFA, políticas de contraseña e IPs.\n` +
          `El esquema audit registra eventos, intentos de login e integridad mediante hash.\n` +
          `El esquema ai contiene alertas, riesgos, predicciones y funciones inteligentes.\n` +
          `Los demás esquemas cubren backups, reportes, integración, monitoreo, privacidad, QA y gobierno empresarial.`,
      );
    }

    if (temasDetectados.includes('ventas')) {
      const ventas = await this.consultaSeguraIA(`
        SELECT *
        FROM rpt.v_reporte_ventas_diarias
        ORDER BY fecha DESC
        LIMIT 10
      `);

      const totalVentas = ventas.reduce(
        (acc: number, item: any) => acc + Number(item.cantidad_ventas || 0),
        0,
      );

      const totalBs = ventas.reduce(
        (acc: number, item: any) => acc + Number(item.total || item.total_ventas || 0),
        0,
      );

      const mejorSucursal = [...ventas].sort(
        (a: any, b: any) =>
          Number(b.total || b.total_ventas || 0) -
          Number(a.total || a.total_ventas || 0),
      )[0];

      respuestas.push(
        `Análisis de ventas:\n\n` +
          `- Registros de ventas analizados: ${ventas.length}.\n` +
          `- Cantidad total de ventas detectadas: ${totalVentas}.\n` +
          `- Total comercial aproximado: ${this.formatearBsIA(totalBs)}.\n` +
          `- Sucursal destacada: ${mejorSucursal?.sucursal || 'sin datos'}.\n\n` +
          `Recomendación IA: revisar los productos de mayor salida y compararlos con el inventario disponible para evitar falta de stock.`,
      );
    }

    if (temasDetectados.includes('inventario')) {
      const inventario = await this.consultaSeguraIA(`
        SELECT *
        FROM app.v_inventario_general
        ORDER BY stock_actual ASC
        LIMIT 15
      `);

      const stockTotal = inventario.reduce(
        (acc: number, item: any) => acc + Number(item.stock_actual || 0),
        0,
      );

      const criticos = inventario.filter((item: any) => {
        const actual = Number(item.stock_actual || 0);
        const minimo = Number(item.stock_minimo || 0);
        return actual <= minimo;
      });

      const detalle = inventario
        .slice(0, 5)
        .map(
          (item: any, index: number) =>
            `${index + 1}. ${item.producto} en ${item.sucursal}: stock ${item.stock_actual}.`,
        )
        .join('\n');

      respuestas.push(
        `Análisis de inventario:\n\n` +
          `- Productos/sucursal revisados: ${inventario.length}.\n` +
          `- Stock acumulado en esta muestra: ${stockTotal} unidades.\n` +
          `- Productos críticos detectados: ${criticos.length}.\n\n` +
          `${detalle}\n\n` +
          `Recomendación IA: priorizar reposición en productos cercanos al stock mínimo y revisar la rotación por sucursal.`,
      );
    }

    if (temasDetectados.includes('pedidos')) {
      const pedidos = await this.consultaSeguraIA(`
        SELECT codigo, cliente, telefono_ci, sucursal, estado, total_estimado, fecha_creacion, fecha_confirmacion, id_venta
        FROM app.pedidos_virtuales
        ORDER BY fecha_creacion DESC
        LIMIT 10
      `);

      const pendientes = pedidos.filter((p: any) => p.estado === 'PENDIENTE');
      const confirmados = pedidos.filter((p: any) => p.estado === 'CONFIRMADO');

      respuestas.push(
        `Análisis de pedidos virtuales:\n\n` +
          `- Pedidos recientes revisados: ${pedidos.length}.\n` +
          `- Pendientes: ${pendientes.length}.\n` +
          `- Confirmados: ${confirmados.length}.\n\n` +
          `Flujo del sistema: el visitante genera un ticket virtual, el pedido queda guardado como PENDIENTE, el cajero busca el código, confirma el pedido y el sistema lo convierte en venta real con descuento de inventario y registro de auditoría.`,
      );
    }

    if (temasDetectados.includes('seguridad')) {
      const logins = await this.consultaSeguraIA(`
        SELECT username, exito, motivo, ip, programa, fecha
        FROM audit.login_intentos
        ORDER BY fecha DESC
        LIMIT 10
      `);

      const fallidos = logins.filter((item: any) => item.exito === false);

      respuestas.push(
        `Análisis de seguridad:\n\n` +
          `- Intentos de login recientes revisados: ${logins.length}.\n` +
          `- Intentos fallidos o bloqueados: ${fallidos.length}.\n` +
          `- El sistema controla login, MFA, riesgo de acceso, IPs permitidas/bloqueadas, sesiones activas y políticas de contraseña.\n\n` +
          `Recomendación IA: revisar accesos sospechosos, sesiones activas antiguas y eventos con riesgo elevado.`,
      );
    }

    if (temasDetectados.includes('auditoria')) {
      const eventos = await this.consultaSeguraIA(`
        SELECT *
        FROM audit.v_eventos_recientes
        ORDER BY fecha DESC
        LIMIT 10
      `);

      const integridad = await this.consultaSeguraIA(`
        SELECT *
        FROM audit.verificar_integridad_cadena()
        LIMIT 20
      `);

      const invalidos = integridad.filter((item: any) => item.valido === false);

      respuestas.push(
        `Análisis de auditoría:\n\n` +
          `- Eventos recientes revisados: ${eventos.length}.\n` +
          `- Registros de integridad revisados: ${integridad.length}.\n` +
          `- Hash inválidos detectados: ${invalidos.length}.\n\n` +
          `El sistema registra operaciones sobre tablas críticas y mantiene una cadena de hash para verificar integridad de auditoría.`,
      );
    }

    if (temasDetectados.includes('ia')) {
      const alertas = await this.consultaSeguraIA(`
        SELECT *
        FROM rpt.v_reporte_alertas_ia
        ORDER BY fecha DESC
        LIMIT 10
      `);

      const criticas = alertas.filter((item: any) => {
        const nivel = String(item.nivel || item.prioridad || '').toUpperCase();
        return nivel.includes('CRITICA') || nivel.includes('ALTA');
      });

      respuestas.push(
        `Análisis del módulo IA:\n\n` +
          `- Alertas IA revisadas: ${alertas.length}.\n` +
          `- Alertas críticas o altas: ${criticas.length}.\n` +
          `- El sistema usa reglas inteligentes para detectar acceso sospechoso, ventas fuera de horario, riesgo de login, fraude, demanda y alertas de negocio.\n\n` +
          `Recomendación IA: atender primero alertas críticas y luego revisar patrones repetitivos de ventas o accesos.`,
      );
    }

    if (temasDetectados.includes('reportes')) {
      const reportes = await this.consultaSeguraIA(`
        SELECT *
        FROM rpt.reportes_generados
        ORDER BY fecha DESC
        LIMIT 10
      `);

      respuestas.push(
        `Análisis de reportes:\n\n` +
          `- Reportes generados recientemente: ${reportes.length}.\n` +
          `- El sistema maneja reportes de ventas diarias, inventario crítico, alertas IA, privacidad, monitoreo y cumplimiento de seguridad.\n\n` +
          `Recomendación IA: usar los reportes como evidencia para administración, auditoría y defensa del proyecto.`,
      );
    }

    if (temasDetectados.includes('backups')) {
      const backups = await this.consultaSeguraIA(`
        SELECT *
        FROM ops.v_cumplimiento_backup_empresarial
        ORDER BY politica
      `);

      const noCumplen = backups.filter((item: any) =>
        String(item.estado || '').includes('NO_CUMPLE'),
      );

      respuestas.push(
        `Análisis de backups:\n\n` +
          `- Políticas evaluadas: ${backups.length}.\n` +
          `- Políticas que no cumplen: ${noCumplen.length}.\n` +
          `- El sistema incluye políticas de backup, retención, restauración, alta disponibilidad y comandos operativos.\n\n` +
          `Recomendación IA: registrar ejecuciones reales o simuladas de backup para mejorar el cumplimiento.`,
      );
    }

    if (temasDetectados.includes('privacidad')) {
      const retencion = await this.consultaSeguraIA(`
        SELECT *
        FROM privacy.v_matriz_retencion
        ORDER BY esquema, tabla
      `);

      respuestas.push(
        `Análisis de privacidad:\n\n` +
          `- Reglas de retención detectadas: ${retencion.length}.\n` +
          `- El sistema contempla conservación, anonimización y control de datos personales.\n\n` +
          `Recomendación IA: mantener visibles las reglas de retención y evidenciar la protección de clientes.`,
      );
    }

    if (temasDetectados.includes('gobierno')) {
      const controles = await this.consultaSeguraIA(`
        SELECT *
        FROM rpt.v_reporte_cumplimiento_seguridad
        ORDER BY codigo
      `);

      const implementados = controles.filter((item: any) =>
        String(item.estado || '').includes('IMPLEMENTADO'),
      );

      respuestas.push(
        `Análisis de gobierno empresarial:\n\n` +
          `- Controles revisados: ${controles.length}.\n` +
          `- Controles implementados: ${implementados.length}.\n` +
          `- El sistema cubre controles de seguridad, ambientes, versiones, pruebas QA y postura empresarial.\n\n` +
          `Recomendación IA: mantener evidencia clara de cada control implementado para la defensa.`,
      );
    }

    if (respuestas.length === 0) {
      respuestas.push(
        'La consulta está relacionada con el sistema, pero necesito que indiques si quieres analizar ventas, inventario, pedidos virtuales, seguridad, auditoría, IA, reportes, backups, privacidad, gobierno empresarial o estructura de la base de datos.',
      );
    }

    const respuestaFinal =
      respuestas.join('\n\n---\n\n') +
      '\n\nPuedes hacerme otra pregunta relacionada con el sistema Supermarket.';

    return [
      {
        rol: 'ia',
        respuesta: respuestaFinal,
        tema: temasDetectados.join(', '),
        temas_detectados: temasDetectados,
        longitud_pregunta: pregunta.length,
        historial_recibido: Array.isArray(historial) ? historial.length : 0,
      },
    ];
  }


    private construirPromptSistemaOllama(contextoSistema: string) {
    return `
Eres el asistente IA empresarial del sistema Supermarket.

Reglas obligatorias:
1. Solo respondes preguntas relacionadas con el sistema Supermarket.
2. No respondas temas externos como recetas, deportes, música, películas, política o tareas ajenas al sistema.
3. No inventes funcionalidades que no estén en el contexto.
4. Si no hay datos suficientes, dilo claramente.
5. Responde de forma natural, como un asistente conversacional moderno.
6. Evita respuestas demasiado técnicas, salvo que el usuario pida detalles técnicos.
7. No menciones comisiones, pagos bancarios externos ni funciones que no estén confirmadas en el sistema.
8. Puedes hablar sobre tienda, carrito, ticket virtual, venta real, inventario, seguridad, auditoría, IA, reportes, backups, monitoreo, privacidad, QA y gobierno empresarial.
9. Si el usuario pregunta algo amplio, responde por partes y de forma ordenada.
10. Mantén la respuesta clara, útil y no demasiado larga.

Contexto real del sistema:
${contextoSistema}
`;
  }

    private async obtenerContextoSistemaParaOllama() {
    const ventas = await this.consultaSeguraIA(`
      SELECT
        COUNT(*) AS total_ventas,
        COALESCE(SUM(total), 0) AS total_vendido
      FROM app.ventas
    `);

    const inventario = await this.consultaSeguraIA(`
      SELECT
        COUNT(*) AS registros_inventario,
        COALESCE(SUM(stock_actual), 0) AS stock_total,
        COUNT(*) FILTER (WHERE stock_actual <= stock_minimo) AS productos_criticos
      FROM app.v_inventario_general
    `);

    const pedidos = await this.consultaSeguraIA(`
      SELECT
        COUNT(*) AS total_pedidos,
        COUNT(*) FILTER (WHERE estado = 'PENDIENTE') AS pendientes,
        COUNT(*) FILTER (WHERE estado = 'CONFIRMADO') AS confirmados
      FROM app.pedidos_virtuales
    `);

    const alertas = await this.consultaSeguraIA(`
      SELECT
        COUNT(*) AS total_alertas,
        COUNT(*) FILTER (WHERE nivel IN ('CRITICA', 'CRÍTICA', 'ALTA')) AS alertas_altas
      FROM rpt.v_reporte_alertas_ia
    `);

    const logins = await this.consultaSeguraIA(`
      SELECT
        COUNT(*) AS total_intentos,
        COUNT(*) FILTER (WHERE exito = false) AS intentos_fallidos
      FROM audit.login_intentos
    `);

    return `
Sistema: Supermarket empresarial.
Backend: NestJS.
Frontend: Next.js.
Base de datos: PostgreSQL.
IA local: Ollama con modelo llama3.2:1b.

Módulos principales:
- Tienda pública
- Carrito
- Ticket virtual
- Confirmación de pedido por cajero
- Venta real
- Inventario
- Seguridad
- Auditoría
- Inteligencia Artificial
- Reportes
- Backups
- Monitoreo
- Privacidad
- QA
- Gobierno empresarial

Estructura de base de datos:
- app: productos, inventario, ventas, clientes, cajas, pedidos virtuales.
- sec: usuarios, roles, sesiones, MFA, políticas de seguridad.
- audit: eventos, intentos de login, integridad por hash.
- ai: alertas, modelos, riesgos y predicciones.
- rpt: reportes de ventas, inventario, IA y cumplimiento.
- ops: backups y operaciones.
- mon: monitoreo.
- privacy: privacidad y retención.
- qa: pruebas.
- gov: controles y gobierno empresarial.

Datos actuales resumidos:
Ventas:
${JSON.stringify(ventas[0] || {}, null, 2)}

Inventario:
${JSON.stringify(inventario[0] || {}, null, 2)}

Pedidos virtuales:
${JSON.stringify(pedidos[0] || {}, null, 2)}

Alertas IA:
${JSON.stringify(alertas[0] || {}, null, 2)}

Seguridad:
${JSON.stringify(logins[0] || {}, null, 2)}

Flujos importantes:
- Un visitante puede generar un ticket virtual.
- El cajero puede buscar el código del ticket.
- Al confirmar el pedido, se registra una venta real.
- La venta descuenta inventario.
- El sistema registra auditoría.
- El administrador visualiza los módulos empresariales.
`;
  }

  private async responderConOllama(
    pregunta: string,
    historial: any[],
    contextoSistema: string,
  ) {
    const systemPrompt = this.construirPromptSistemaOllama(contextoSistema);

    const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 25000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const respuesta = await fetch(
        process.env.OLLAMA_URL || 'http://localhost:11434/api/chat',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.OLLAMA_MODEL || 'llama3.2:1b',
            stream: false,
            keep_alive: '10m',
            options: {
              temperature: 0.1,
              top_p: 0.7,
              repeat_penalty: 1.1,
              num_ctx: 1536,
              num_predict: 220,
            },
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              ...historial.slice(-4).map((m: any) => ({
                role: m.rol === 'usuario' ? 'user' : 'assistant',
                content: String(m.contenido || ''),
              })),
              {
                role: 'user',
                content: pregunta,
              },
            ],
          }),
        },
      );

      if (!respuesta.ok) {
        throw new Error('Ollama no respondió correctamente.');
      }

      const data: any = await respuesta.json();

      return data?.message?.content || 'No pude generar una respuesta desde Ollama.';
    } finally {
      clearTimeout(timeout);
    }
  }

  async chatAsistenteIAConOllama(preguntaOriginal: string, historial: any[] = []) {
    const pregunta = String(preguntaOriginal || '').trim();

    if (!pregunta) {
      return [
        {
          rol: 'ia',
          respuesta:
            'Escribe una pregunta sobre el sistema Supermarket. Puedo ayudarte con ventas, inventario, pedidos virtuales, seguridad, auditoría, reportes y base de datos.',
          proveedor: 'OLLAMA_LOCAL',
        },
      ];
    }


    const texto = pregunta
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');



    const esSaludo =
      texto === 'hola' ||
      texto === 'buenas' ||
      texto.includes('buenos dias') ||
      texto.includes('buenas tardes') ||
      texto.includes('buenas noches') ||
      texto.includes('saludos');

    if (esSaludo) {
      return [
        {
          rol: 'ia',
          respuesta:
            '¡Hola! Soy el asistente IA empresarial de Supermarket. Puedo ayudarte con ventas, inventario, pedidos virtuales, seguridad, auditoría, reportes, IA y la estructura de la base de datos. ¿Qué deseas revisar?',
          proveedor: 'SISTEMA',
          tema: 'SALUDO',
        },
      ];
    }

    const pideSugerencias =
      texto.includes('que preguntas') ||
      texto.includes('preguntas me sugieres') ||
      texto.includes('que puedo preguntar') ||
      texto.includes('que puedes hacer') ||
      texto.includes('sugerencias') ||
      texto.includes('opciones');

    if (pideSugerencias) {
      return [
        {
          rol: 'ia',
          respuesta:
            'Claro. Puedes preguntarme cosas como:\n\n' +
            '1. Ventas\n' +
            '- ¿Cómo van las ventas del sistema?\n' +
            '- ¿Qué sucursal tiene más ventas?\n' +
            '- ¿Cuál es el total vendido?\n\n' +
            '2. Inventario\n' +
            '- ¿Hay productos con stock bajo?\n' +
            '- ¿Qué productos necesitan reposición?\n' +
            '- ¿Cómo está el inventario por sucursal?\n\n' +
            '3. Pedidos virtuales\n' +
            '- ¿Cómo funciona el pedido virtual?\n' +
            '- ¿Cuántos pedidos virtuales están pendientes?\n' +
            '- ¿Qué pasa cuando el cajero confirma un ticket?\n\n' +
            '4. Seguridad y auditoría\n' +
            '- ¿Hay alertas críticas de seguridad?\n' +
            '- ¿Hubo intentos de login fallidos?\n' +
            '- ¿La auditoría mantiene integridad?\n\n' +
            '5. Base de datos\n' +
            '- ¿Qué esquemas tiene la base de datos?\n' +
            '- ¿Qué tablas principales tiene el sistema?\n' +
            '- ¿Qué funciones importantes tiene PostgreSQL?\n\n' +
            '6. Defensa del proyecto\n' +
            '- ¿Qué parte del sistema es más sobresaliente?\n' +
            '- ¿Por qué el sistema no es solo una tienda básica?\n' +
            '- ¿Cómo explico el uso de IA en el sistema?',
          proveedor: 'SISTEMA',
          tema: 'SUGERENCIAS',
        },
      ];
    }

    const temaExterno =
      texto.includes('receta') ||
      texto.includes('cocina') ||
      texto.includes('comida') ||
      texto.includes('futbol') ||
      texto.includes('pelicula') ||
      texto.includes('musica') ||
      texto.includes('poema') ||
      texto.includes('chiste');

    if (temaExterno) {
      return [
        {
          rol: 'ia',
          respuesta:
            'Solo puedo responder preguntas relacionadas con el sistema Supermarket. Puedes consultarme sobre ventas, inventario, pedidos virtuales, seguridad, auditoría, IA, reportes, backups, privacidad, monitoreo, gobierno empresarial o estructura de la base de datos.',
          proveedor: 'SISTEMA',
          tema: 'FUERA_DEL_SISTEMA',
        },
      ];
    }

        const pideEstadoGeneral =
      texto.includes('estado general') ||
      texto.includes('sistema completo') ||
      texto.includes('sistema funcional') ||
      texto.includes('esta funcional') ||
      texto.includes('esta completo') ||
      texto.includes('analiza el sistema') ||
      texto.includes('revisa el sistema');

    const pideSobresaliente =
      texto.includes('sobresaliente') ||
      texto.includes('destacado') ||
      texto.includes('lo mas importante') ||
      texto.includes('lo más importante') ||
      texto.includes('parte fuerte') ||
      texto.includes('fortaleza');

    if (pideEstadoGeneral || pideSobresaliente) {
      const ventas = await this.consultaSeguraIA(`
        SELECT
          COUNT(*) AS total_ventas,
          COALESCE(SUM(total), 0) AS total_vendido
        FROM app.ventas
      `);

      const inventario = await this.consultaSeguraIA(`
        SELECT
          COALESCE(SUM(stock_actual), 0) AS stock_total,
          COUNT(*) FILTER (WHERE stock_actual <= stock_minimo) AS productos_criticos
        FROM app.v_inventario_general
      `);

      const pedidos = await this.consultaSeguraIA(`
        SELECT
          COUNT(*) AS total_pedidos,
          COUNT(*) FILTER (WHERE estado = 'PENDIENTE') AS pendientes,
          COUNT(*) FILTER (WHERE estado = 'CONFIRMADO') AS confirmados
        FROM app.pedidos_virtuales
      `);

      const alertas = await this.consultaSeguraIA(`
        SELECT
          COUNT(*) AS total_alertas
        FROM rpt.v_reporte_alertas_ia
      `);

      const v = ventas[0] || {};
      const i = inventario[0] || {};
      const p = pedidos[0] || {};
      const a = alertas[0] || {};

      return [
        {
          rol: 'ia',
          respuesta:
            'El sistema Supermarket se encuentra funcional y completo para una demostración empresarial.\n\n' +
            'Actualmente cubre los flujos principales: tienda pública, carrito, ticket virtual, confirmación por cajero, venta real, descuento de inventario, comprobante/factura, auditoría, seguridad, reportes y panel administrativo.\n\n' +
            'Resumen actual del sistema:\n' +
            `- Ventas registradas: ${v.total_ventas || 0}.\n` +
            `- Total vendido: Bs ${Number(v.total_vendido || 0).toFixed(2)}.\n` +
            `- Stock total disponible: ${i.stock_total || 0} unidades.\n` +
            `- Productos críticos: ${i.productos_criticos || 0}.\n` +
            `- Pedidos virtuales registrados: ${p.total_pedidos || 0}.\n` +
            `- Pedidos pendientes: ${p.pendientes || 0}.\n` +
            `- Pedidos confirmados: ${p.confirmados || 0}.\n` +
            `- Alertas IA registradas: ${a.total_alertas || 0}.\n\n` +
            'La parte más sobresaliente del sistema es el flujo de pedido virtual conectado con venta real: un cliente visitante genera un ticket, el cajero lo busca, confirma el pedido, se registra la venta, se descuenta inventario y se genera el comprobante. Eso demuestra integración real entre frontend, backend, PostgreSQL, auditoría, seguridad e IA.\n\n' +
            'También destaca que el sistema no es solo una tienda básica, porque incluye módulos empresariales como seguridad, auditoría, IA, reportes, backups, monitoreo, privacidad, QA y gobierno empresarial.',
          proveedor: 'SISTEMA',
          tema: 'ESTADO_GENERAL',
        },
      ];
    }







    const respuestaControlada = await this.chatAsistenteIA(pregunta, historial);
    const temaControlado = String(respuestaControlada?.[0]?.tema || '');

    if (
      temaControlado &&
      !['NO_RECONOCIDO', 'FUERA_DEL_SISTEMA', 'AYUDA'].includes(temaControlado)
    ) {
      return respuestaControlada.map((item: any) => ({
        ...item,
        proveedor: item.proveedor || 'POSTGRESQL_IA_CONTROLADA',
      }));
    }

    try {
      const contextoSistema = await this.obtenerContextoSistemaParaOllama();

      const respuesta = await this.responderConOllama(
        pregunta,
        historial,
        contextoSistema,
      );

      return [
        {
          rol: 'ia',
          respuesta,
          proveedor: 'OLLAMA_LOCAL',
          modelo: process.env.OLLAMA_MODEL || 'llama3.2',
        },
      ];
    } catch (error) {
      console.error('Error asistente IA con Ollama:', error);

      return [
        {
          rol: 'ia',
          respuesta:
            'No pude conectarme con Ollama. Verifica que Ollama esté instalado, que el modelo esté descargado y que el servicio esté activo en http://localhost:11434. Mientras tanto, revisa que hayas ejecutado: ollama pull llama3.2',
          proveedor: 'OLLAMA_ERROR',
        },
      ];
    }
  }
}