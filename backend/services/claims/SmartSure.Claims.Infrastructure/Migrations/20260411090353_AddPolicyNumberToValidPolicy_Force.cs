using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartSure.Claims.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPolicyNumberToValidPolicy_Force : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Robustly add missing columns if they don't exist
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'PolicyNumber' AND Object_ID = Object_ID(N'ValidPolicies'))
                BEGIN
                    ALTER TABLE [ValidPolicies] ADD [PolicyNumber] nvarchar(max) NOT NULL DEFAULT '';
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'InsuredDeclaredValue' AND Object_ID = Object_ID(N'ValidPolicies'))
                BEGIN
                    ALTER TABLE [ValidPolicies] ADD [InsuredDeclaredValue] decimal(18,2) NOT NULL DEFAULT 0.0;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'StartDate' AND Object_ID = Object_ID(N'ValidPolicies'))
                BEGIN
                    ALTER TABLE [ValidPolicies] ADD [StartDate] datetime2 NULL;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'EndDate' AND Object_ID = Object_ID(N'ValidPolicies'))
                BEGIN
                    ALTER TABLE [ValidPolicies] ADD [EndDate] datetime2 NULL;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No easy way to undo without risk, leaving empty for 'Force' migration
        }
    }
}
