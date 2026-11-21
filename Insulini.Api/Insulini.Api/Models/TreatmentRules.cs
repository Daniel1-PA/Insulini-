namespace Insulini.Api.Models;

public static class TreatmentRules
{
    public static bool IsDoseStatus(string status) => status is "taken" or "partial" or "omitted";

    public static int Adherence(IEnumerable<string> statuses)
    {
        var recorded = statuses.Where(status => status != "pending").ToList();
        return recorded.Count == 0
            ? 0
            : (int)Math.Round(recorded.Count(status => status == "taken") * 100m / recorded.Count);
    }
}
