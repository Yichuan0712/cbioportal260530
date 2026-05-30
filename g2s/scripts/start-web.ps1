# Start Web UI only (5443 HTTPS)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
. (Join-Path $Root "scripts\env.ps1")
Set-Location $Root

$jar = Join-Path $Root "pdb-alignment-web\target\pdb-alignment-web-0.1.0.jar"
if (-not (Test-Path $jar)) {
    Write-Host "Building pdb-alignment-web..."
    mvn package -pl pdb-alignment-web -am -DskipTests -q
}

Write-Host "Starting Web UI on https://localhost:5443 ..."
Write-Host "  https://localhost:5443/"
Write-Host "  https://localhost:5443/sequence"
java -Xmx4096m -jar $jar
