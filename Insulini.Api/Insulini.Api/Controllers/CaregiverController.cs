using Insulini.Api.Data;
using Insulini.Api.Features.Common;
using Insulini.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Insulini.Api.Controllers;

[ApiController]
[Authorize(Roles = RoleNames.Caregiver)]
[Route("api/caregiver")]
public sealed class CaregiverController(AppDbContext database) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult> Dashboard()
    {
        var caregiverId = User.UserId();
        var profile = await database.PatientProfiles.AsNoTracking().Include(item => item.Patient)
            .FirstOrDefaultAsync(item => item.CaregiverId == caregiverId);
        if (profile is null)
            return Ok(new { patient = (object?)null, message = "Aún no tienes un paciente vinculado." });

        var measurements = await database.HealthMeasurements.AsNoTracking()
            .Where(item => item.PatientId == profile.PatientId)
            .OrderByDescending(item => item.MeasuredAt).ToListAsync();
        var medications = await database.Medications.AsNoTracking().Include(item => item.DoseLogs)
            .Where(item => item.PatientId == profile.PatientId && item.Active).OrderBy(item => item.Name).ToListAsync();
        var notes = await database.CareNotes.AsNoTracking().Include(item => item.RecordedBy)
            .Where(item => item.PatientId == profile.PatientId)
            .OrderByDescending(item => item.CreatedAt).Take(20).ToListAsync();
        var alerts = await database.Notifications.AsNoTracking()
            .Where(item => item.UserId == caregiverId && !item.IsRead)
            .OrderByDescending(item => item.CreatedAt).Take(5).ToListAsync();
        var activity = await database.Activities.AsNoTracking()
            .Where(item => item.PatientId == profile.PatientId)
            .OrderByDescending(item => item.OccurredAt).FirstOrDefaultAsync();

        var allLogs = medications.SelectMany(item => item.DoseLogs).Where(item => item.ScheduledAt >= DateTimeOffset.UtcNow.AddDays(-7)).ToList();
        var recorded = allLogs.Count(item => item.Status != "pending");
        var taken = allLogs.Count(item => item.Status == "taken");
        var totalToday = medications.Sum(item => item.ReminderTimes.Split(',', StringSplitOptions.RemoveEmptyEntries).Length);
        var completedToday = allLogs.Count(item => item.ScheduledAt.UtcDateTime.Date == DateTime.UtcNow.Date && item.Status == "taken");

        return Ok(new
        {
            patient = new
            {
                id = profile.PatientId,
                name = profile.Patient.FullName,
                age = Age(profile.Patient.BirthDate),
                profile.Condition
            },
            latest = new
            {
                glucose = Metric(measurements, "glucose"),
                heartRate = Metric(measurements, "heartRate"),
                weight = Metric(measurements, "weight")
            },
            adherence = recorded == 0 ? 0 : (int)Math.Round(taken * 100m / recorded),
            completedToday,
            totalToday,
            activity = activity is null ? null : new { activity.Type, activity.DurationMinutes, activity.Intensity, activity.OccurredAt },
            alerts = alerts.Select(item => new { item.Id, item.Title, item.Message, item.CreatedAt }),
            medications = medications.Select(medication => new
            {
                medication.Id, medication.Name, medication.Dose, medication.Frequency,
                week = Enumerable.Range(0, 7).Select(daysAgo =>
                {
                    var date = DateTime.UtcNow.Date.AddDays(daysAgo - 6);
                    var status = medication.DoseLogs.Where(log => log.ScheduledAt.UtcDateTime.Date == date)
                        .OrderByDescending(log => log.RecordedAt).Select(log => log.Status).FirstOrDefault() ?? "pending";
                    return new { date, status };
                })
            }),
            timeline = notes.Select(note => new
            {
                note.Id, note.Kind, note.Summary, note.CreatedAt,
                author = note.RecordedBy.FullName,
                role = note.RecordedBy.Role.ToString()
            })
        });
    }

    [HttpPost("progress")]
    public async Task<ActionResult> RecordProgress(CareProgressRequest request)
    {
        var caregiverId = User.UserId();
        var linked = await database.PatientProfiles.AnyAsync(item => item.PatientId == request.PatientId && item.CaregiverId == caregiverId);
        if (!linked) return Forbid();

        var kind = request.Kind.Trim().ToLowerInvariant();
        string summary;
        if (kind == "dose")
        {
            if (request.MedicationId is null) return BadRequest(new { message = "Selecciona un medicamento." });
            var medication = await database.Medications.SingleOrDefaultAsync(item => item.Id == request.MedicationId && item.PatientId == request.PatientId && item.Active);
            if (medication is null) return NotFound();
            var status = request.Status is "partial" or "omitted" ? request.Status : "taken";
            database.DoseLogs.Add(new DoseLog
            {
                Medication = medication,
                RecordedById = caregiverId,
                ScheduledAt = DateTimeOffset.UtcNow,
                Status = status,
                Note = request.Note
            });
            summary = $"{medication.Name} {medication.Dose}: {status}";
        }
        else if (kind == "measurement")
        {
            if (request.Value is null || string.IsNullOrWhiteSpace(request.MeasurementType) || string.IsNullOrWhiteSpace(request.Unit))
                return BadRequest(new { message = "Completa el tipo, valor y unidad de la medición." });
            database.HealthMeasurements.Add(new HealthMeasurement
            {
                PatientId = request.PatientId,
                Type = request.MeasurementType.Trim(),
                Value = request.Value.Value,
                Unit = request.Unit.Trim(),
                MeasuredAt = DateTimeOffset.UtcNow,
                Source = "Registro del cuidador"
            });
            summary = $"{request.MeasurementType}: {request.Value} {request.Unit}";
        }
        else if (kind == "note" && !string.IsNullOrWhiteSpace(request.Note))
        {
            summary = request.Note.Trim();
        }
        else
        {
            return BadRequest(new { message = "Completa la información del registro." });
        }

        var note = new CareNote
        {
            PatientId = request.PatientId,
            RecordedById = caregiverId,
            Kind = kind,
            Summary = summary
        };
        database.CareNotes.Add(note);
        await database.SaveChangesAsync();
        return Created($"/api/caregiver/progress/{note.Id}", note);
    }

    [HttpPost("reminder")]
    public async Task<ActionResult> SendReminder()
    {
        var caregiverId = User.UserId();
        var profile = await database.PatientProfiles.AsNoTracking()
            .Include(item => item.Caregiver)
            .SingleOrDefaultAsync(item => item.CaregiverId == caregiverId);
        if (profile is null) return NotFound(new { message = "No hay un paciente vinculado." });

        database.Notifications.Add(new AppNotification
        {
            UserId = profile.PatientId,
            Category = "medication",
            Title = $"{profile.Caregiver!.FullName} te envió un recordatorio",
            Message = "Revisa las tomas pendientes de tu tratamiento."
        });
        await database.SaveChangesAsync();
        return Ok(new { message = "Recordatorio enviado al paciente." });
    }

    private static object? Metric(IEnumerable<HealthMeasurement> measurements, string type)
    {
        var item = measurements.FirstOrDefault(measurement => measurement.Type == type);
        return item is null ? null : new { item.Value, item.Unit, item.MeasuredAt };
    }

    private static int? Age(DateOnly? birthDate)
    {
        if (birthDate is null) return null;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - birthDate.Value.Year;
        return birthDate.Value > today.AddYears(-age) ? age - 1 : age;
    }
}
