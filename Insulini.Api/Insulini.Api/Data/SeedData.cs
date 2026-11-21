using Insulini.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Insulini.Api.Data;

public static class SeedData
{
    public static readonly Guid MariaId = Guid.Parse("10000000-0000-0000-0000-000000000001");
    public static readonly Guid AnaId = Guid.Parse("10000000-0000-0000-0000-000000000002");
    public static readonly Guid DoctorId = Guid.Parse("10000000-0000-0000-0000-000000000003");

    public static async Task InitializeAsync(AppDbContext database)
    {
        if (await database.Users.AnyAsync()) return;

        var password = BCrypt.Net.BCrypt.HashPassword("Insulini123!");
        var maria = User(MariaId, "María López Hernández", "paciente@insulini.mx", password, UserRole.Patient, new DateOnly(1956, 3, 12));
        var ana = User(AnaId, "Ana López", "cuidador@insulini.mx", password, UserRole.Caregiver);
        var doctor = User(DoctorId, "Dr. Carlos Ramírez", "medico@insulini.mx", password, UserRole.Doctor);
        var jorge = User(Guid.Parse("10000000-0000-0000-0000-000000000004"), "Jorge Ruiz", "jorge@insulini.mx", password, UserRole.Patient, new DateOnly(1958, 6, 14));
        var carmen = User(Guid.Parse("10000000-0000-0000-0000-000000000005"), "Carmen Silva", "carmen@insulini.mx", password, UserRole.Patient, new DateOnly(1963, 2, 2));
        var luis = User(Guid.Parse("10000000-0000-0000-0000-000000000006"), "Luis Torres", "luis@insulini.mx", password, UserRole.Patient, new DateOnly(1961, 9, 8));
        database.Users.AddRange(maria, ana, doctor, jorge, carmen, luis);

        database.PatientProfiles.AddRange(
            Profile(maria.Id, doctor.Id, ana.Id, "Diabetes tipo 2 · Hipertensión"),
            Profile(jorge.Id, doctor.Id, null, "Diabetes tipo 2"),
            Profile(carmen.Id, doctor.Id, null, "Diabetes tipo 2"),
            Profile(luis.Id, doctor.Id, null, "Diabetes tipo 1"));

        database.AccessibilityPreferences.AddRange(
            new AccessibilityPreferences { UserId = maria.Id },
            new AccessibilityPreferences { UserId = ana.Id },
            new AccessibilityPreferences { UserId = doctor.Id });

        var metformin = Medication(maria.Id, "Metformina", "850 mg", "2 veces al día", "Tomar con alimentos.", "08:00,14:00");
        var losartan = Medication(maria.Id, "Losartán", "50 mg", "1 vez al día", "Tomar con agua.", "20:00");
        var insulin = Medication(maria.Id, "Insulina glargina", "18 U", "1 vez al día", "Aplicar según indicación médica.", "22:00");
        database.Medications.AddRange(metformin, losartan, insulin);

        foreach (var patient in new[] { jorge, carmen, luis })
            database.Medications.Add(Medication(patient.Id, "Metformina", "850 mg", "2 veces al día", "Tomar con alimentos.", "08:00,20:00"));

        var today = new DateTimeOffset(DateTime.UtcNow.Date, TimeSpan.Zero);
        var glucoseValues = new[] { 132, 148, 145, 102, 86, 92, 121, 158, 160, 125, 78, 112, 94, 138, 113 };
        for (var index = 0; index < glucoseValues.Length; index++)
        {
            database.HealthMeasurements.Add(new HealthMeasurement
            {
                PatientId = maria.Id,
                Type = "glucose",
                Value = glucoseValues[index],
                Unit = "mg/dL",
                MeasuredAt = today.AddDays(index - glucoseValues.Length + 1).AddHours(7).AddMinutes(30)
            });
        }

        database.HealthMeasurements.AddRange(
            Measurement(maria.Id, "weight", 68.4m, "kg", today.AddHours(7)),
            Measurement(maria.Id, "heartRate", 74, "lpm", today.AddHours(7).AddMinutes(30)),
            Measurement(maria.Id, "hba1c", 6.9m, "%", today.AddDays(-8)),
            Measurement(jorge.Id, "glucose", 246, "mg/dL", today.AddHours(8)),
            Measurement(carmen.Id, "glucose", 104, "mg/dL", today.AddHours(8)),
            Measurement(luis.Id, "glucose", 132, "mg/dL", today.AddHours(8)));

        database.DoseLogs.AddRange(WeeklyDoseLogs(metformin, maria, today, ["taken", "taken", "partial", "taken", "taken", "partial", "pending"]));
        database.DoseLogs.AddRange(WeeklyDoseLogs(insulin, maria, today, ["taken", "taken", "taken", "omitted", "taken", "taken", "pending"]));
        database.DoseLogs.AddRange(WeeklyDoseLogs(losartan, maria, today, ["taken", "taken", "taken", "taken", "taken", "taken", "pending"]));
        database.DoseLogs.Add(new DoseLog
        {
            Medication = metformin,
            RecordedBy = maria,
            ScheduledAt = today.AddHours(8),
            RecordedAt = today.AddHours(8).AddMinutes(5),
            Status = "taken",
            Note = "Con desayuno"
        });

        database.Activities.Add(new ActivityLog
        {
            Patient = maria,
            RecordedBy = maria,
            Type = "Caminata",
            DurationMinutes = 30,
            Intensity = "Moderada",
            OccurredAt = today.AddHours(7).AddMinutes(30)
        });
        database.Symptoms.AddRange(
            Symptom(maria, maria, "Mareo", 2, today.AddDays(-1).AddHours(19).AddMinutes(40)),
            Symptom(maria, ana, "Cansancio", 2, today.AddDays(-4).AddHours(17)),
            Symptom(maria, maria, "Sed excesiva", 3, today.AddDays(-9).AddHours(12)));

        database.Appointments.Add(new Appointment
        {
            Patient = maria,
            Doctor = doctor,
            Title = "Consulta de control",
            StartsAt = today.AddDays(3).AddHours(10).AddMinutes(30),
            Modality = "Presencial"
        });

        database.Notifications.AddRange(
            Notification(maria, "alert", "Glucosa baja detectada", "68 mg/dL. Come algo con azúcar.", today.AddMinutes(-20)),
            Notification(maria, "medication", "Metformina 14:00", "Recordatorio de toma con alimentos.", today.AddHours(-1)),
            Notification(maria, "treatment", "El Dr. Ramírez actualizó tu receta", "Revisa las nuevas indicaciones.", today.AddHours(-2)),
            Notification(maria, "appointment", "Cita confirmada", "Consulta de control próxima.", today.AddDays(-1)),
            Notification(ana, "alert", "Dosis no registrada", "Metformina con 35 min de retraso.", today.AddMinutes(-35)));

        database.CareNotes.AddRange(
            CareNote(maria, ana, "dose", "Metformina 850 mg registrada", today.AddHours(8).AddMinutes(5)),
            CareNote(maria, maria, "symptom", "Mareo leve (2/5)", today.AddDays(-1).AddHours(19).AddMinutes(40)),
            CareNote(maria, maria, "activity", "Caminata de 30 min", today.AddHours(7).AddMinutes(30)));

        await database.SaveChangesAsync();
    }

    private static AppUser User(Guid id, string name, string email, string password, UserRole role, DateOnly? birthDate = null) =>
        new() { Id = id, FullName = name, Email = email, PasswordHash = password, Role = role, BirthDate = birthDate };

    private static PatientProfile Profile(Guid patientId, Guid doctorId, Guid? caregiverId, string condition) =>
        new() { PatientId = patientId, DoctorId = doctorId, CaregiverId = caregiverId, Condition = condition };

    private static Medication Medication(Guid patientId, string name, string dose, string frequency, string instructions, string times) =>
        new() { PatientId = patientId, Name = name, Dose = dose, Frequency = frequency, Instructions = instructions, ReminderTimes = times };

    private static HealthMeasurement Measurement(Guid patientId, string type, decimal value, string unit, DateTimeOffset at) =>
        new() { PatientId = patientId, Type = type, Value = value, Unit = unit, MeasuredAt = at };

    private static SymptomLog Symptom(AppUser patient, AppUser author, string name, int severity, DateTimeOffset at) =>
        new() { Patient = patient, RecordedBy = author, Name = name, Severity = severity, OccurredAt = at };

    private static AppNotification Notification(AppUser user, string category, string title, string message, DateTimeOffset at) =>
        new() { User = user, Category = category, Title = title, Message = message, CreatedAt = at };

    private static CareNote CareNote(AppUser patient, AppUser author, string kind, string summary, DateTimeOffset at) =>
        new() { Patient = patient, RecordedBy = author, Kind = kind, Summary = summary, CreatedAt = at };

    private static IEnumerable<DoseLog> WeeklyDoseLogs(Medication medication, AppUser user, DateTimeOffset today, string[] states) =>
        states.Select((state, index) => new DoseLog
        {
            Medication = medication,
            RecordedBy = user,
            ScheduledAt = today.AddDays(index - 6).AddHours(20),
            RecordedAt = today.AddDays(index - 6).AddHours(20).AddMinutes(5),
            Status = state
        });
}
