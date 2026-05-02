FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend/gateway/ backend/gateway/

RUN dotnet restore backend/gateway/SmartSure.Gateway/SmartSure.Gateway.csproj

RUN dotnet publish backend/gateway/SmartSure.Gateway/SmartSure.Gateway.csproj \
    -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SmartSure.Gateway.dll"]