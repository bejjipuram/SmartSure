using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartSure.Policy.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePolicySchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ListedPrice",
                table: "VehicleDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "InsuredDeclaredValue",
                table: "Policies",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ListedPrice",
                table: "VehicleDetails");

            migrationBuilder.DropColumn(
                name: "InsuredDeclaredValue",
                table: "Policies");
        }
    }
}
