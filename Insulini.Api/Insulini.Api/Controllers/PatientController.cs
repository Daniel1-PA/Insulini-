using Insulini.Api.Data;
using Insulini.Api.Features.Common;
using Insulini.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Insulini.Api.Controllers;

[ApiController]
[Authorize(Roles = RoleNames.Patient)]
[Route("api/patient")]
public sealed class PatientController(AppDbContext database) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult> Dashboard()
    {
        var patientId = User.UserId();
        var patient = await database.Users.AsNoTracking().SingleAsync(user => user.Id == patientId);
        var profile = await database.PatientProfiles.AsNoTracking().SingleAsync(item => item.PatientId == patientId);
        var medications = await database.Medications.AsNoTracking()
            .Include(medication => medication.DoseLogs)
            .Where(medication => medication.PatientId == patientId && medication.Active)
            .OrderBy(medication => medication.Name)
            .ToListAsync();
        var measurements = await database.HealthMeasurements.AsNoTracking()
            .Where(measurement => measurement.PatientId == patientId)
            .OrderByDescending(measurement => measurement.MeasuredAt)
            .ToListAsync();
        var activities = await database.Activities.AsNoTracking()
            .Where(activity => activity.PatientId == patientId)
            .OrderByDescending(activity => activity.OccurredAt).Take(10).ToListAsync();
        var symptoms = await database.Symptoms.AsNoTracking()
            .Where(symptom => symptom.PatientId == patientId)
            .OrderByDescending(symptom => symptom.OccurredAt).Take(10).ToListAsync();
        var nextAppointment = await database.Appointments.AsNoTracking()
            .Include(appointment => appointment.Doctor)
            .Where(appointment => appointment.PatientId == patientId && appointment.StartsAt >= DateTimeOffset.UtcNow)
            .OrderBy(appointment => appointment.StartsAt).FirstOrDefaultAsync();

        var today = DateTimeOffset.UtcNow.Date;
        var weekStart = DateTimeOffset.UtcNow.AddDays(-7);
        var doseLogs = medications.SelectMany(medication => medication.DoseLogs).ToList();
        var recorded = doseLogs.Count(log => log.ScheduledAt >= weekStart && log.Status != "pending");
        var taken = doseLogs.Count(log => log.ScheduledAt >= weekStart && log.Status == "taken");
        var todayLogs = doseLogs.Where(log => log.ScheduledAt.UtcDateTime.Date == today).ToList();
        var totalToday = medications.Sum(medication => medication.ReminderTimes.Split(',', StringSplitOptions.RemoveEmptyEntries).Length);
        var glucose = measurements.FirstOrDefault(measurement => measurement.Type == "glucose");

        return Ok(new
        {
            user = new { patient.Id, name = patient.FullName, role = patient.Role.ToString() },
            glucose = glucose is null ? null : new
            {
                glucose.Value, glucose.Unit, glucose.MeasuredAt, profile.GlucoseTargetMin, profile.GlucoseTargetMax,
                series = measurements.Where(item => item.Type == "glucose").OrderBy(item => item.MeasuredAt)
                    .Select(item => new { item.MeasuredAt, item.Value })
            },
            treatment = new
            {
                adherence = recorded == 0 ? 0 : (int)Math.Round(taken * 100m / recorded),
                completedToday = todayLogs.Count(log => log.Status == "taken"),
                totalToday,
                profile.DoctorInstructions,
                medications = medications.Select(medication => new
                {
                    medication.Id, medication.Name, medication.Dose, medication.Frequency, medication.Instructions,
                    times = medication.ReminderTimes.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(time => new
                    {
                        time,
                        status = todayLogs.Where(log => log.MedicationId == medication.Id && log.ScheduledAt.ToString("HH:mm") == time)
                            .OrderByDescending(log => log.RecordedAt).Select(log => log.Status).FirstOrDefault() ?? "pending"
                    })
                })
            },
            activities = activities.Select(activity => new
            {
                activity.Id, activity.Type, activity.DurationMinutes, activity.Intensity, activity.OccurredAt
            }),
            symptoms = symptoms.Select(symptom => new
            {
                symptom.Id, symptom.Name, symptom.Severity, symptom.Notes, symptom.OccurredAt
            }),
            nextAppointment = nextAppointment is null ? null : new
            {
                nextAppointment.Id, nextAppointment.Title, nextAppointment.StartsAt, nextAppointment.Modality,
                doctor = nextAppointment.Doctor.FullName
            },
            indicators = new
            {
                weight = Indicator(measurements, "weight"),
                heartRate = Indicator(measurements, "heartRate"),
                hba1c = Indicator(measurements, "hba1c")
            }
        });
    }

    [HttpPost("medications/{medicationId:guid}/doses")]
    public async Task<ActionResult> RecordDose(Guid medicationId, DoseRequest request)
    {
        if (!TreatmentRules.IsDoseStatus(request.Status))
            return BadRequest(new { message = "El estado de la toma no es válido." });

        var patientId = User.UserId();
        var medication = await database.Medications.SingleOrDefaultAsync(item => item.Id == medicationId && item.PatientId == patientId && item.Active);
        if (medication is null) return NotFound();

        var start = request.ScheduledAt.AddMinutes(-1);
        var end = request.ScheduledAt.AddMinutes(1);
        var log = await database.DoseLogs.SingleOrDefaultAsync(item =>
            item.MedicationId == medicationId && item.ScheduledAt >= start && item.ScheduledAt <= end);
        if (log is null)
        {
            log = new DoseLog
            {
                MedicationId = medicationId,
                RecordedById = patientId,
                ScheduledAt = request.ScheduledAt,
                Status = request.Status,
                Note = request.Note
            };
            database.DoseLogs.Add(log);
        }
        else
        {
            log.Status = request.Status;
            log.Note = request.Note;
            log.RecordedAt = DateTimeOffset.UtcNow;
        }

        database.CareNotes.Add(new CareNote
        {
            PatientId = patientId,
            RecordedById = patientId,
            Kind = "dose",
            Summary = $"{medication.Name} {medication.Dose}: {DoseLabel(request.Status)}"
        });
        await database.SaveChangesAsync();
        return Ok(new { log.Id, log.Status, log.RecordedAt });
    }

    [HttpPost("activities")]
    public async Task<ActionResult> RecordActivity(ActivityRequest request)
    {
        if (request.Type.Trim().Length < 2 || request.DurationMinutes is < 1 or > 600 || request.Intensity.Trim().Length < 2)
            return BadRequest(new { message = "Revisa el tipo, duración e intensidad de la actividad." });

        var patientId = User.UserId();
        var activity = new ActivityLog
        {
            PatientId = patientId,
            RecordedById = patientId,
            Type = request.Type.Trim(),
            DurationMinutes = request.DurationMinutes,
            Intensity = request.Intensity.Trim(),
            OccurredAt = request.OccurredAt
        };
        database.Activities.Add(activity);
        database.CareNotes.Add(new CareNote
        {
            PatientId = patientId, RecordedById = patientId, Kind = "activity",
            Summary = $"{activity.Type} de {activity.DurationMinutes} min"
        });
        await database.SaveChangesAsync();
        return Created($"/api/patient/activities/{activity.Id}", activity);
    }

    [HttpPost("symptoms")]
    public async Task<ActionResult> RecordSymptom(SymptomRequest request)
    {
        if (request.Name.Trim().Length < 2 || request.Severity is < 1 or > 5)
            return BadRequest(new { message = "Indica el síntoma y una intensidad entre 1 y 5." });

        var patientId = User.UserId();
        var symptom = new SymptomLog
        {
            PatientId = patientId,
            RecordedById = patientId,
            Name = request.Name.Trim(),
            Severity = request.Severity,
            Notes = request.Notes?.Trim(),
            OccurredAt = request.OccurredAt
        };
        database.Symptoms.Add(symptom);
        database.CareNotes.Add(new CareNote
        {
            PatientId = patientId, RecordedById = patientId, Kind = "symptom",
            Summary = $"{symptom.Name} ({symptom.Severity}/5)"
        });
        await database.SaveChangesAsync();
        return Created($"/api/patient/symptoms/{symptom.Id}", symptom);
    }

    private static object? Indicator(IEnumerable<HealthMeasurement> measurements, string type)
    {
        var item = measurements.FirstOrDefault(measurement => measurement.Type == type);
        return item is null ? null : new { item.Value, item.Unit, item.MeasuredAt };
    }

    private static string DoseLabel(string status) => status switch
    {
        "taken" => "tomada",
        "partial" => "parcial",
        _ => "omitida"
    };
}
