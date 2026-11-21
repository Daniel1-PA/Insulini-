namespace Insulini.Api.Models;

public enum UserRole
{
    Patient,
    Caregiver,
    Doctor
}

public sealed class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string FullName { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; }
    public DateOnly? BirthDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public AccessibilityPreferences? Accessibility { get; set; }
}

public sealed class PatientProfile
{
    public Guid PatientId { get; set; }
    public AppUser Patient { get; set; } = null!;
    public Guid? DoctorId { get; set; }
    public AppUser? Doctor { get; set; }
    public Guid? CaregiverId { get; set; }
    public AppUser? Caregiver { get; set; }
    public string Condition { get; set; } = "Diabetes tipo 2";
    public decimal GlucoseTargetMin { get; set; } = 70;
    public decimal GlucoseTargetMax { get; set; } = 180;
    public string DoctorInstructions { get; set; } = "Medir glucosa en ayunas y después de comer.";
}

public sealed class Medication
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public AppUser Patient { get; set; } = null!;
    public required string Name { get; set; }
    public required string Dose { get; set; }
    public required string Frequency { get; set; }
    public required string Instructions { get; set; }
    public required string ReminderTimes { get; set; }
    public bool Active { get; set; } = true;
    public List<DoseLog> DoseLogs { get; set; } = [];
}

public sealed class DoseLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MedicationId { get; set; }
    public Medication Medication { get; set; } = null!;
    public Guid RecordedById { get; set; }
    public AppUser RecordedBy { get; set; } = null!;
    public DateTimeOffset ScheduledAt { get; set; }
    public DateTimeOffset RecordedAt { get; set; } = DateTimeOffset.UtcNow;
    public required string Status { get; set; }
    public string? Note { get; set; }
}

public sealed class HealthMeasurement
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public AppUser Patient { get; set; } = null!;
    public required string Type { get; set; }
    public decimal Value { get; set; }
    public required string Unit { get; set; }
    public DateTimeOffset MeasuredAt { get; set; }
    public string Source { get; set; } = "Dispositivo simulado";
}

public sealed class ActivityLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public AppUser Patient { get; set; } = null!;
    public Guid RecordedById { get; set; }
    public AppUser RecordedBy { get; set; } = null!;
    public required string Type { get; set; }
    public int DurationMinutes { get; set; }
    public required string Intensity { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
}

public sealed class SymptomLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public AppUser Patient { get; set; } = null!;
    public Guid RecordedById { get; set; }
    public AppUser RecordedBy { get; set; } = null!;
    public required string Name { get; set; }
    public int Severity { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
}

public sealed class Appointment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public AppUser Patient { get; set; } = null!;
    public Guid DoctorId { get; set; }
    public AppUser Doctor { get; set; } = null!;
    public required string Title { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public string Modality { get; set; } = "Presencial";
    public string Status { get; set; } = "Confirmada";
}

public sealed class AppNotification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public required string Category { get; set; }
    public required string Title { get; set; }
    public required string Message { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool IsRead { get; set; }
}

public sealed class CareNote
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public AppUser Patient { get; set; } = null!;
    public Guid RecordedById { get; set; }
    public AppUser RecordedBy { get; set; } = null!;
    public required string Kind { get; set; }
    public required string Summary { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class AccessibilityPreferences
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public int FontScale { get; set; } = 100;
    public bool HighContrast { get; set; }
    public bool ReadAloud { get; set; }
    public bool SimpleMode { get; set; }
    public bool StrongVibration { get; set; } = true;
    public bool VoiceDictation { get; set; } = true;
}
