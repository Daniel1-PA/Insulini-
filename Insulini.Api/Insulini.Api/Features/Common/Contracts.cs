using Insulini.Api.Models;

namespace Insulini.Api.Features.Common;

public sealed record LoginRequest(string Email, string Password);
public sealed record RegisterRequest(string FullName, string Email, string Password, string Role, DateOnly? BirthDate, string? InvitationCode);
public sealed record AuthResponse(string Token, Guid UserId, string Name, string Email, string Role);
public sealed record DoseRequest(DateTimeOffset ScheduledAt, string Status, string? Note);
public sealed record ActivityRequest(string Type, int DurationMinutes, string Intensity, DateTimeOffset OccurredAt);
public sealed record SymptomRequest(string Name, int Severity, string? Notes, DateTimeOffset OccurredAt);
public sealed record CareProgressRequest(Guid PatientId, string Kind, Guid? MedicationId, string? Status, decimal? Value, string? MeasurementType, string? Unit, string? Note);
public sealed record AccessibilityRequest(int FontScale, bool HighContrast, bool ReadAloud, bool SimpleMode, bool StrongVibration, bool VoiceDictation);
public sealed record AppointmentRequest(string Title, DateTimeOffset StartsAt, string Modality);
public sealed record MedicationInput(Guid? Id, string Name, string Dose, string Frequency, string Instructions, IReadOnlyList<string> ReminderTimes);
public sealed record TreatmentRequest(string DoctorInstructions, IReadOnlyList<MedicationInput> Medications);

public static class RoleNames
{
    public const string Patient = nameof(UserRole.Patient);
    public const string Caregiver = nameof(UserRole.Caregiver);
    public const string Doctor = nameof(UserRole.Doctor);
}
