import EditorNombre from './EditorNombre'

// Cambio del nombre del sistema (el "candadito"): cualquiera puede abrirlo,
// pero guardar exige la contrasena de Master.
export default function NombreSistemaModal({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div className="pos-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--pos-border)] bg-[var(--pos-panel)] p-5"
      >
        <EditorNombre
          titulo="Nombre del sistema"
          descripcion="Así se ve arriba de la pantalla, en el ingreso y en el ticket."
          textoBoton="Guardar nombre"
          onListo={onCerrar}
          onCancelar={onCerrar}
        />
      </div>
    </div>
  )
}
