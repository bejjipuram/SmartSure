using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartSure.Admin.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIDVToAdminPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "InsuredDeclaredValue",
                table: "AdminPolicies",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InsuredDeclaredValue",
                table: "AdminPolicies");
        }
    }
}
