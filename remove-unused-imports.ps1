
# This script parses the output of `npx tsc --noEmit` and comments out unused imports (TS6133).

param (
    [string]$TscOutput
)

# Regex to capture file path and line number from TS6133 errors.
$regex = "(.+?)\((\d+),.+\): error TS6133:"

$matches = $TscOutput | Select-String -Pattern $regex -AllMatches

# Group errors by file path
$groupedErrors = $matches.Matches | Group-Object { $_.Groups[1].Value }

foreach ($group in $groupedErrors) {
    $filePath = $group.Name
    $lineNumbers = $group.Group | ForEach-Object { [int]$_.Groups[2].Value } | Sort-Object -Descending -Unique

    Write-Host "Processing file: $filePath"

    $fileContent = Get-Content -Path $filePath -Raw
    $lines = $fileContent.Split([Environment]::NewLine)

    foreach ($lineNumber in $lineNumbers) {
        $lineIndex = $lineNumber - 1
        if ($lines[$lineIndex] -notmatch "^\s*//") {
            $lines[$lineIndex] = "//" + $lines[$lineIndex]
            Write-Host "  - Commented out line $lineNumber"
        } else {
            Write-Host "  - Line $lineNumber was already commented out."
        }
    }

    $newContent = $lines -join [Environment]::NewLine
    Set-Content -Path $filePath -Value $newContent
}

Write-Host "Unused import processing complete."
