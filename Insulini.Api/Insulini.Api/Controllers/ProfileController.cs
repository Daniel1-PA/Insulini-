using Insulini.Api.Data;
using Insulini.Api.Features.Common;
using Insulini.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Insulini.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/profile")]
public sealed class ProfileController(AppDbContext database) : ControllerBase
{
    [HttpGet("notifications")]
    public async Task<ActionResult> Notifications()
    {
        var userId = User.UserId();
        var notifications = await database.Notifications.AsNoTracking()
            .Where(item => item.UserId == userId)
            .OrderByDescending(item => item.CreatedAt).Take(40)
            .Select(item => new { item.Id, item.Category, item.Title, item.Message, item.CreatedAt, item.IsRead })
            .ToListAsync();
        return Ok(notifications);
    }

    [HttpPost("notifications/read")]
    public async Task<IActionResult> MarkNotificationsRead()
    {
        var userId = User.UserId();
        await database.Notifications.Where(item => item.UserId == userId && !item.IsRead)
            .ExecuteUpdateAsync(update => update.SetProperty(item => item.IsRead, true));
        return NoContent();
    }

    [HttpGet("accessibility")]
    public async Task<ActionResult> Accessibility()
    {
        var preferences = await GetPreferences();
        return Ok(preferences);
    }

    [HttpPut("accessibility")]
    public async Task<ActionResult> UpdateAccessibility(AccessibilityRequest request)
    {
        if (request.FontScale is < 85 or > 140)
            return BadRequest(new { message = "El tamaño de letra debe estar entre 85% y 140%." });

        var preferences = await GetPreferences();
        preferences.FontScale = request.FontScale;
        preferences.HighContrast = request.HighContrast;
        preferences.ReadAloud = request.ReadAloud;
        preferences.SimpleMode = request.SimpleMode;
        preferences.StrongVibration = request.StrongVibration;
        preferences.VoiceDictation = request.VoiceDictation;
        await database.SaveChangesAsync();
        return Ok(preferences);
    }

    private async Task<AccessibilityPreferences> GetPreferences()
    {
        var userId = User.UserId();
        var preferences = await database.AccessibilityPreferences.SingleOrDefaultAsync(item => item.UserId == userId);
        if (preferences is not null) return preferences;
        preferences = new AccessibilityPreferences { UserId = userId };
        database.AccessibilityPreferences.Add(preferences);
        await database.SaveChangesAsync();
        return preferences;
    }
}
