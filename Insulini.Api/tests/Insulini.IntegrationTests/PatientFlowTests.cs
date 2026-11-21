using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Insulini.Api.Features.Common;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

namespace Insulini.IntegrationTests;

public sealed class PatientFlowTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer database = new PostgreSqlBuilder("postgres:18").Build();
    private WebApplicationFactory<Program>? application;

    public async Task InitializeAsync()
    {
        Environment.SetEnvironmentVariable("TESTCONTAINERS_RYUK_DISABLED", "true");
        await database.StartAsync();
        application = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder.UseSetting("ConnectionStrings:Database", database.GetConnectionString()));
    }

    [Fact]
    public async Task PatientCanRegisterAndReportSymptom()
    {
        using var client = application!.CreateClient();
        var email = $"paciente-{Guid.NewGuid():N}@insulini.test";
        var register = await client.PostAsJsonAsync("/api/auth/register", new
        {
            fullName = "Paciente de prueba",
            email,
            password = "Insulini123!",
            role = "Patient",
            birthDate = "1970-01-01",
            invitationCode = "DR-4821"
        });
        register.EnsureSuccessStatusCode();
        var session = await register.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(session);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.Token);
        var symptom = await client.PostAsJsonAsync("/api/patient/symptoms", new
        {
            name = "Dolor de cabeza",
            severity = 2,
            notes = "Después del desayuno",
            occurredAt = DateTimeOffset.UtcNow
        });
        symptom.EnsureSuccessStatusCode();

        using var dashboard = await client.GetFromJsonAsync<JsonDocument>("/api/patient/dashboard");
        Assert.Equal("Paciente de prueba", dashboard!.RootElement.GetProperty("user").GetProperty("name").GetString());
        Assert.Contains(dashboard.RootElement.GetProperty("symptoms").EnumerateArray(), item =>
            item.GetProperty("name").GetString() == "Dolor de cabeza");
    }

    public async Task DisposeAsync()
    {
        if (application is not null) await application.DisposeAsync();
        await database.DisposeAsync();
    }
}
