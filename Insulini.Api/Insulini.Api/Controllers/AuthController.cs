using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Insulini.Api.Data;
using Insulini.Api.Features.Common;
using Insulini.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Insulini.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(AppDbContext database, IConfiguration configuration) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await database.Users.SingleOrDefaultAsync(candidate => candidate.Email == email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Correo o contraseña incorrectos." });

        return Ok(CreateResponse(user));
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (request.FullName.Trim().Length < 3 || !email.Contains('@') || request.Password.Length < 8)
            return BadRequest(new { message = "Completa el nombre, un correo válido y una contraseña de al menos 8 caracteres." });
        if (!Enum.TryParse<UserRole>(request.Role, true, out var role))
            return BadRequest(new { message = "Selecciona un rol válido." });
        if (await database.Users.AnyAsync(user => user.Email == email))
            return Conflict(new { message = "Ya existe una cuenta con ese correo." });

        var user = new AppUser
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
            BirthDate = request.BirthDate
        };
        database.Users.Add(user);
        database.AccessibilityPreferences.Add(new AccessibilityPreferences { User = user });

        if (role == UserRole.Patient)
        {
            Guid? doctorId = request.InvitationCode?.Trim().Equals("DR-4821", StringComparison.OrdinalIgnoreCase) == true
                ? SeedData.DoctorId
                : null;
            database.PatientProfiles.Add(new PatientProfile { Patient = user, DoctorId = doctorId });
        }

        await database.SaveChangesAsync();
        return Created("/api/auth/me", CreateResponse(user));
    }

    private AuthResponse CreateResponse(AppUser user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));
        var token = new JwtSecurityToken(
            configuration["Jwt:Issuer"],
            configuration["Jwt:Audience"],
            claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new AuthResponse(
            new JwtSecurityTokenHandler().WriteToken(token), user.Id, user.FullName, user.Email, user.Role.ToString());
    }
}
