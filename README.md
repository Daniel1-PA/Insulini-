# Insulini-

## Preguntas básicas

### Como ejecutar?

docker compose up --build -d

### Que es?
Es una aplicación diseñada para ayudar a las personas con diabetes a llevar un mejor control de su tratamiento y facilitar el seguimiento por parte de sus médicos y cuidadores. La idea principal es que toda la información importante del paciente se encuentre en un solo lugar, evitando que se pierda entre notas, mensajes o recordatorios.

### Como lo hace?
El médico registra al paciente y configura su tratamiento, incluyendo medicamentos, horarios y revisiones. A partir de ahí, el paciente puede registrar el cumplimiento de su tratamiento y consultar sus indicaciones. Además, la aplicación almacena mediciones de glucosa, actividad física y resultados de revisiones importantes como la hemoglobina glucosilada (HbA1c).

Con toda esta información, tanto el paciente como el médico pueden visualizar la evolución del tratamiento mediante gráficos, historiales y resúmenes fáciles de entender.

### Cuando se usa?
Se utiliza desde el momento en que una persona es diagnosticada con diabetes y comienza un tratamiento médico.

Su uso es especialmente útil entre consultas médicas, ya que permite dar seguimiento al tratamiento día a día en lugar de esperar semanas o meses hasta la siguiente revisión.

También se usa cuando el médico necesita comprobar si el paciente está siguiendo correctamente las indicaciones o cuando el paciente quiere consultar cómo ha evolucionado su salud con el tiempo.

### Donde se usa? situaciones de uso.
La aplicación puede utilizarse en diferentes contextos:

En casa, cuando el paciente registra sus mediciones de glucosa o consulta sus medicamentos.
Durante una consulta médica, cuando el médico revisa el historial y los avances del paciente.
Cuando un familiar o cuidador ayuda a supervisar que el tratamiento se esté siguiendo correctamente.
Antes de una revisión médica, para consultar los registros acumulados desde la última visita.
Después de una consulta, para dar seguimiento a los cambios realizados en el tratamiento.
En programas de seguimiento para pacientes con diabetes que necesitan un control más constante de su enfermedad.



## Demo

Después de ejecutar `docker compose up --build -d`:

- Aplicación: http://localhost:5173
- API/OpenAPI: http://localhost:8000/openapi/v1.json
- PostgreSQL: `localhost:5433`

Las tres cuentas demo usan la contraseña `Insulini123!`:

| Rol | Correo |
| --- | --- |
| Paciente | `paciente@insulini.mx` |
| Cuidador | `cuidador@insulini.mx` |
| Médico | `medico@insulini.mx` |

El código de invitación demo para vincular un paciente con el médico es `DR-4821`.

## Features

### Paciente

- Inicio de sesión y registro con selección de rol.
- Consulta de glucosa actual e historial enviado por un glucómetro simulado.
- Consulta de tratamiento, horarios e indicaciones del médico.
- Registro del cumplimiento de cada toma.
- Registro de actividad física, intensidad y duración.
- Reporte e historial de síntomas.
- Consulta de indicadores y próximas citas.
- Centro de notificaciones para medicamentos, alertas, cambios de receta y citas.
- Ajustes de tamaño de letra, alto contraste, modo simple, lectura, vibración y dictado.

### Cuidador o familiar

- Supervisión del paciente vinculado y sus indicadores principales.
- Alertas por dosis no registradas.
- Seguimiento semanal de la receta y adherencia.
- Registro de tomas, mediciones y notas como cuidador.
- Bitácora compartida de actividad, síntomas y cumplimiento.

### Médico

- Lista de pacientes priorizada por riesgo con búsqueda y resumen de consulta.
- Expediente consolidado con glucosa, tiempo en rango, HbA1c, adherencia, síntomas y actividad.
- Edición de medicamentos, dosis, frecuencia, horarios e indicaciones.
- Notificación automática al paciente cuando cambia la receta.
- Agenda de citas presenciales o por videollamada.
- Centro de alertas de pacientes que requieren atención.

## Desarrollo

Backend:

```bash
dotnet run --project Insulini.Api/Insulini.Api
```

Frontend:

```bash
cd Insulini.App
npm ci
npm run dev
```

Pruebas y builds:

```bash
dotnet test Insulini.Api/tests/Insulini.UnitTests
dotnet test Insulini.Api/tests/Insulini.IntegrationTests
dotnet build Insulini.Api/Insulini.Api.slnx
cd Insulini.App && npm run build
```

La configuración incluida es de demostración. Antes de producción se debe reemplazar la llave JWT y las credenciales de PostgreSQL.
