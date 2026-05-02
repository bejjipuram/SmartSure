FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 5113

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend/shared/ backend/shared/
COPY backend/services/admin/ backend/services/admin/

RUN dotnet restore backend/services/admin/SmartSure.Admin.API/SmartSure.Admin.API.csproj

RUN dotnet publish backend/services/admin/SmartSure.Admin.API/SmartSure.Admin.API.csproj \
    -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SmartSure.Admin.API.dll"]