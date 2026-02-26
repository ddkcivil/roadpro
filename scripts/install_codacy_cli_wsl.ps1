# PowerShell script to automate WSL + Codacy Analysis CLI setup on Windows
# Run this script as Administrator.

# Exit on error
$ErrorActionPreference = 'Stop'

function Require-Admin {
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Error "This script must be run as Administrator. Right-click PowerShell and 'Run as administrator'."
        exit 1
    }
}

Require-Admin

Write-Output "1/6 — Installing WSL (Ubuntu). This may prompt and require a reboot."
wsl --install -d Ubuntu

Write-Output "2/6 — Downloading Docker Desktop installer (you'll still need to run the installer UI)."
$dockerUrl = 'https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe'
$installerPath = Join-Path $env:TEMP 'DockerDesktopInstaller.exe'

if (-Not (Test-Path $installerPath)) {
    Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath -UseBasicParsing
    Write-Output "Downloaded Docker Desktop installer to: $installerPath"
} else {
    Write-Output "Installer already exists at: $installerPath"
}

Write-Output "Launching Docker Desktop installer. Please follow the UI steps to finish installation."
Start-Process -FilePath $installerPath

Write-Output "IMPORTANT: After Docker Desktop installs, open Docker Desktop → Settings → General and enable 'Expose daemon on tcp://localhost:2375 without TLS'."
Write-Output "Then sign in to Docker Desktop (Docker ID) so the CLI can pull images if needed."

Write-Output "3/6 — Configuring WSL environment and installing prerequisites inside Ubuntu (non-interactive where possible)."
# Commands to run inside WSL
$wslCmd = @'
set -e
sudo apt-get update
sudo apt-get install -y curl make openjdk-11-jre unzip
# Make docker CLI available inside WSL (symlink to Windows docker.exe)
if [ -f "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe" ]; then
  sudo ln -sf "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe" /usr/local/bin/docker || true
fi
# Export DOCKER_HOST so the WSL bash sees the desktop daemon
echo "export DOCKER_HOST=tcp://0.0.0.0:2375" >> ~/.bashrc
source ~/.bashrc
# Ensure docker is reachable
if ! docker version >/dev/null 2>&1; then
  echo "Warning: docker CLI did not connect. Ensure Docker Desktop is running and 'Expose daemon' is enabled."
fi
'@

wsl -d Ubuntu -- bash -lc $wslCmd

Write-Output "4/6 — Downloading Codacy Analysis CLI source inside WSL and running install (may require sudo)."
$codacyCmd = @'
set -e
cd /tmp
curl -L https://github.com/codacy/codacy-analysis-cli/archive/master.tar.gz | tar xvz
cd codacy-analysis-cli-*
# Make sure DOCKER_HOST is set in this shell
export DOCKER_HOST=tcp://0.0.0.0:2375
# Build/install the CLI (this may take a few minutes). You might be prompted for sudo password.
sudo make install || true
echo "If 'make install' failed, open the repo README and follow manual install instructions."
'@

wsl -d Ubuntu -- bash -lc $codacyCmd

Write-Output "5/6 — Post-install notes"
Write-Output "- If the Codacy CLI installed successfully, the 'codacy-analysis-cli' command should be available inside WSL."
Write-Output "- You still need to 'docker login' inside WSL (run: wsl -d Ubuntu -- docker login) if the CLI needs access to Docker registry."

Write-Output "6/6 — How to run analysis (example):"
Write-Output "Run inside WSL or prefix with 'wsl -d Ubuntu --'. Example (project path must use /mnt/c/...):"
Write-Output "codacy-analysis-cli analyze --directory \"/mnt/c/Users/LENOVO/Videos/python/myroad-project (3)\" --format json --output /tmp/codacy-results.json"

Write-Output "Script finished. Review output for any warnings or errors."
