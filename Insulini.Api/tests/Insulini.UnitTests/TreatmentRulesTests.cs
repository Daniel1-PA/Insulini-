using Insulini.Api.Models;

namespace Insulini.UnitTests;

public class TreatmentRulesTests
{
    [Fact]
    public void Adherence_IgnoresPendingDoses()
    {
        Assert.Equal(67, TreatmentRules.Adherence(["taken", "taken", "omitted", "pending"]));
    }

    [Theory]
    [InlineData("taken")]
    [InlineData("partial")]
    [InlineData("omitted")]
    public void DoseStatus_AcceptsSupportedValues(string status)
    {
        Assert.True(TreatmentRules.IsDoseStatus(status));
    }
}
