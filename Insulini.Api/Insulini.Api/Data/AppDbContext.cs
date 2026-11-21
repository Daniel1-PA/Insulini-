using Insulini.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Insulini.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<PatientProfile> PatientProfiles => Set<PatientProfile>();
    public DbSet<Medication> Medications => Set<Medication>();
    public DbSet<DoseLog> DoseLogs => Set<DoseLog>();
    public DbSet<HealthMeasurement> HealthMeasurements => Set<HealthMeasurement>();
    public DbSet<ActivityLog> Activities => Set<ActivityLog>();
    public DbSet<SymptomLog> Symptoms => Set<SymptomLog>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppNotification> Notifications => Set<AppNotification>();
    public DbSet<CareNote> CareNotes => Set<CareNote>();
    public DbSet<AccessibilityPreferences> AccessibilityPreferences => Set<AccessibilityPreferences>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>().HasIndex(user => user.Email).IsUnique();
        modelBuilder.Entity<AppUser>().Property(user => user.Role).HasConversion<string>();
        modelBuilder.Entity<PatientProfile>().HasKey(profile => profile.PatientId);
        modelBuilder.Entity<PatientProfile>()
            .HasOne(profile => profile.Patient).WithOne().HasForeignKey<PatientProfile>(profile => profile.PatientId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PatientProfile>()
            .HasOne(profile => profile.Doctor).WithMany().HasForeignKey(profile => profile.DoctorId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<PatientProfile>()
            .HasOne(profile => profile.Caregiver).WithMany().HasForeignKey(profile => profile.CaregiverId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<AccessibilityPreferences>().HasKey(preferences => preferences.UserId);
        modelBuilder.Entity<AccessibilityPreferences>()
            .HasOne(preferences => preferences.User).WithOne(user => user.Accessibility)
            .HasForeignKey<AccessibilityPreferences>(preferences => preferences.UserId);
        modelBuilder.Entity<Medication>().HasIndex(medication => new { medication.PatientId, medication.Active });
        modelBuilder.Entity<HealthMeasurement>().HasIndex(measurement => new { measurement.PatientId, measurement.MeasuredAt });
        modelBuilder.Entity<DoseLog>().HasIndex(log => new { log.MedicationId, log.ScheduledAt });
        modelBuilder.Entity<Appointment>().HasIndex(appointment => new { appointment.PatientId, appointment.StartsAt });
    }
}
