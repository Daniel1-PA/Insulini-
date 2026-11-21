using Insulini.Api.Data;
using Insulini.Api.Features.Common;
using Insulini.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Insulini.Api.Controllers;

[ApiController]
[Authorize(Roles = RoleNames.Doctor)]
[Route("api/doctor")]
public sealed class DoctorController(AppDbContext database) : ControllerBase
{
    [HttpGet("patients")]
    public async Task<ActionResult> Patients()
    {
        var doctorId = User.UserId();
        var profiles = await database.PatientProfiles.AsNoTracking().Include(item => item.Patient)
            .Where(item => item.DoctorId == doctorId).OrderBy(item => item.Patient.FullName).ToListAsync();
        var ids = profiles.Select(item => item.PatientId).ToList();
        var measurements = await database.HealthMeasurements.AsNoTracking()
            .Where(item => ids.Contains(item.PatientId)).OrderByDescending(item => item.MeasuredAt).ToListAsync();
        var symptoms = await database.Symptoms.AsNoTracking()
            .Where(item => ids.Contains(item.PatientId)).OrderByDescending(item => item.OccurredAt).ToListAsync();
        var medications = await database.Medications.AsNoTracking().Include(item => item.DoseLogs)
            .Where(item => ids.Contains(item.PatientId) && item.Active).ToListAsync();
        var appointments = await database.Appointments.AsNoTracking()
            .Where(item => item.DoctorId == doctorId && item.StartsAt >= DateTimeOffset.UtcNow && item.StartsAt < DateTimeOffset.UtcNow.AddDays(7))
            .CountAsync();

        var patients = profiles.Select(profile =>
        {
            var glucose = measurements.FirstOrDefault(item => item.PatientId == profile.PatientId && item.Type == "glucose");
            var symptom = symptoms.FirstOrDefault(item => item.PatientId == profile.PatientId);
            var logs = medications.Where(item => item.PatientId == profile.PatientId).SelectMany(item => item.DoseLogs)
                .Where(item => item.ScheduledAt >= DateTimeOffset.UtcNow.AddDays(-7) && item.Status != "pending").ToList();
            var adherence = TreatmentRules.Adherence(logs.Select(item => item.Status));
            var status = glucose?.Value > 180 || adherence is > 0 and < 60 ? "Riesgo alto" : adherence is > 0 and < 80 ? "Atención" : "Estable";
            return new
            {
                id = profile.PatientId,
                name = profile.Patient.FullName,
                age = Age(profile.Patient.BirthDate),
                profile.Condition,
                glucose = glucose is null ? null : new { glucose.Value, glucose.Unit, glucose.MeasuredAt },
                adherence,
                hasAdherenceData = logs.Count > 0,
                symptom = symptom is null ? null : new { symptom.Name, symptom.Severity, symptom.OccurredAt },
                status
            };
        }).OrderBy(patient => patient.status == "Riesgo alto" ? 0 : patient.status == "Atención" ? 1 : 2)
            .ThenBy(patient => patient.name).ToList();
        var adherencePatients = patients.Where(patient => patient.hasAdherenceData).ToList();

        return Ok(new
        {
            stats = new
            {
                activePatients = patients.Count,
                alertsToday = patients.Count(patient => patient.status != "Estable"),
                averageAdherence = adherencePatients.Count == 0 ? 0 : (int)Math.Round(adherencePatients.Average(patient => patient.adherence)),
                appointmentsThisWeek = appointments
            },
            patients
        });
    }

    [HttpGet("patients/{patientId:guid}")]
    public async Task<ActionResult> Patient(Guid patientId)
    {
        var doctorId = User.UserId();
        var profile = await database.PatientProfiles.AsNoTracking()
            .Include(item => item.Patient).Include(item => item.Caregiver)
            .SingleOrDefaultAsync(item => item.PatientId == patientId && item.DoctorId == doctorId);
        if (profile is null) return NotFound();

        var measurements = await database.HealthMeasurements.AsNoTracking()
            .Where(item => item.PatientId == patientId).OrderByDescending(item => item.MeasuredAt).ToListAsync();
        var medications = await database.Medications.AsNoTracking().Include(item => item.DoseLogs)
            .Where(item => item.PatientId == patientId && item.Active).OrderBy(item => item.Name).ToListAsync();
        var symptoms = await database.Symptoms.AsNoTracking().Include(item => item.RecordedBy)
            .Where(item => item.PatientId == patientId).OrderByDescending(item => item.OccurredAt).Take(10).ToListAsync();
        var activities = await database.Activities.AsNoTracking()
            .Where(item => item.PatientId == patientId && item.OccurredAt >= DateTimeOffset.UtcNow.AddDays(-7)).ToListAsync();
        var glucoseSeries = measurements.Where(item => item.Type == "glucose" && item.MeasuredAt >= DateTimeOffset.UtcNow.AddDays(-14)).ToList();
        var logs = medications.SelectMany(item => item.DoseLogs)
            .Where(item => item.ScheduledAt >= DateTimeOffset.UtcNow.AddDays(-7) && item.Status != "pending").ToList();
        var adherence = TreatmentRules.Adherence(logs.Select(item => item.Status));
        var inRange = glucoseSeries.Count == 0 ? 0 : (int)Math.Round(glucoseSeries.Count(item => item.Value >= profile.GlucoseTargetMin && item.Value <= profile.GlucoseTargetMax) * 100m / glucoseSeries.Count);
        var currentGlucose = glucoseSeries.OrderByDescending(item => item.MeasuredAt).FirstOrDefault();
        var hba1c = measurements.FirstOrDefault(item => item.Type == "hba1c");

        return Ok(new
        {
            patient = new
            {
                id = profile.PatientId, name = profile.Patient.FullName, age = Age(profile.Patient.BirthDate),
                profile.Condition, caregiver = profile.Caregiver?.FullName,
                updatedAt = measurements.FirstOrDefault()?.MeasuredAt
            },
            indicators = new
            {
                glucose = currentGlucose?.Value,
                glucoseUnit = currentGlucose?.Unit,
                timeInRange = inRange,
                hba1c = hba1c?.Value,
                adherence,
                weeklyActivityMinutes = activities.Sum(item => item.DurationMinutes)
            },
            target = new { min = profile.GlucoseTargetMin, max = profile.GlucoseTargetMax },
            glucoseSeries = glucoseSeries.OrderBy(item => item.MeasuredAt).Select(item => new { item.MeasuredAt, item.Value }),
            symptoms = symptoms.Select(item => new
            {
                item.Id, item.Name, item.Severity, item.Notes, item.OccurredAt,
                author = item.RecordedBy.FullName, role = item.RecordedBy.Role.ToString()
            }),
            treatment = new
            {
                profile.DoctorInstructions,
                medications = medications.Select(medication => new
                {
                    medication.Id, medication.Name, medication.Dose, medication.Frequency,
                    medication.Instructions,
                    reminderTimes = medication.ReminderTimes.Split(',', StringSplitOptions.RemoveEmptyEntries),
                    adherence = MedicationAdherence(medication)
                })
            }
        });
    }

    [HttpGet("appointments")]
    public async Task<ActionResult> Appointments()
    {
        var doctorId = User.UserId();
        var appointments = await database.Appointments.AsNoTracking().Include(item => item.Patient)
            .Where(item => item.DoctorId == doctorId && item.StartsAt >= DateTimeOffset.UtcNow.AddDays(-1))
            .OrderBy(item => item.StartsAt)
            .Select(item => new
            {
                item.Id, item.PatientId, patientName = item.Patient.FullName, item.Title,
                item.StartsAt, item.Modality, item.Status
            }).ToListAsync();
        return Ok(appointments);
    }

    [HttpPut("patients/{patientId:guid}/treatment")]
    public async Task<ActionResult> UpdateTreatment(Guid patientId, TreatmentRequest request)
    {
        var doctorId = User.UserId();
        var profile = await database.PatientProfiles.SingleOrDefaultAsync(item => item.PatientId == patientId && item.DoctorId == doctorId);
        if (profile is null) return NotFound();
        if (request.Medications.Count is < 1 or > 20 || request.Medications.Any(item =>
                string.IsNullOrWhiteSpace(item.Name) || string.IsNullOrWhiteSpace(item.Dose) || item.ReminderTimes.Count is < 1 or > 6))
            return BadRequest(new { message = "Agrega al menos un medicamento con dosis y horario." });

        var current = await database.Medications.Where(item => item.PatientId == patientId && item.Active).ToListAsync();
        var requestedIds = request.Medications.Where(item => item.Id.HasValue).Select(item => item.Id!.Value).ToHashSet();
        foreach (var medication in current.Where(item => !requestedIds.Contains(item.Id))) medication.Active = false;
        foreach (var input in request.Medications)
        {
            var medication = input.Id.HasValue ? current.SingleOrDefault(item => item.Id == input.Id.Value) : null;
            if (medication is null)
            {
                medication = new Medication { PatientId = patientId, Name = "", Dose = "", Frequency = "", Instructions = "", ReminderTimes = "" };
                database.Medications.Add(medication);
            }
            medication.Name = input.Name.Trim();
            medication.Dose = input.Dose.Trim();
            medication.Frequency = input.Frequency.Trim();
            medication.Instructions = input.Instructions.Trim();
            medication.ReminderTimes = string.Join(',', input.ReminderTimes.Select(time => time.Trim()).Where(time => time.Length > 0).Distinct());
            medication.Active = true;
        }

        profile.DoctorInstructions = request.DoctorInstructions.Trim();
        database.Notifications.Add(new AppNotification
        {
            UserId = patientId,
            Category = "treatment",
            Title = "Tu médico actualizó la receta",
            Message = "Revisa tus medicamentos y nuevas indicaciones."
        });
        await database.SaveChangesAsync();
        return Ok(new { message = "Receta actualizada y paciente notificado." });
    }

    [HttpPost("patients/{patientId:guid}/appointments")]
    public async Task<ActionResult> CreateAppointment(Guid patientId, AppointmentRequest request)
    {
        var doctorId = User.UserId();
        var linked = await database.PatientProfiles.AnyAsync(item => item.PatientId == patientId && item.DoctorId == doctorId);
        if (!linked) return NotFound();
        if (request.StartsAt <= DateTimeOffset.UtcNow || string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Selecciona una fecha futura y un motivo." });

        var appointment = new Appointment
        {
            PatientId = patientId,
            DoctorId = doctorId,
            Title = request.Title.Trim(),
            StartsAt = request.StartsAt,
            Modality = string.IsNullOrWhiteSpace(request.Modality) ? "Presencial" : request.Modality.Trim()
        };
        database.Appointments.Add(appointment);
        database.Notifications.Add(new AppNotification
        {
            UserId = patientId,
            Category = "appointment",
            Title = "Cita confirmada",
            Message = $"{appointment.Title}: {appointment.StartsAt:dd/MM/yyyy HH:mm}."
        });
        await database.SaveChangesAsync();
        return Created($"/api/doctor/appointments/{appointment.Id}", appointment);
    }

    private static int MedicationAdherence(Medication medication)
    {
        var logs = medication.DoseLogs.Where(item => item.ScheduledAt >= DateTimeOffset.UtcNow.AddDays(-7) && item.Status != "pending").ToList();
        return TreatmentRules.Adherence(logs.Select(item => item.Status));
    }

    private static int? Age(DateOnly? birthDate)
    {
        if (birthDate is null) return null;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - birthDate.Value.Year;
        return birthDate.Value > today.AddYears(-age) ? age - 1 : age;
    }
}
