# import_medicines.ps1
# Reads server\imports\medicines_raw.txt, parses lines, and POSTs to /master-data-api/medicines
# Set ADMIN_JWT env var if your API requires auth: $env:ADMIN_JWT = '<token>'

$raw = Get-Content "..\imports\medicines_raw.txt" -Raw -ErrorAction Stop
$lines = $raw -split "\r?\n"
$currentCategory = ""
$apiBase = "http://localhost:6100/master-data-api"

function Parse-Line($line) {
    $trim = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trim)) { return $null }
    # If the whole line is uppercase and contains no tab or only letters/spaces, treat as category
    if ($trim -match '^[A-Z0-9 &+()%\-\./]+$' -and -not ($trim -match '\t')) {
        return @{ type = 'category'; value = $trim }
    }
    # Split by tab first, otherwise by two or more spaces
    $parts = $line -split "\t"
    if ($parts.Count -lt 2) { $parts = $line -split "\s{2,}" }
    if ($parts.Count -lt 2) { return $null }
    $dosageForm = $parts[0].Trim()
    $med = $parts[1].Trim()
    # Extract strength if last token contains digit
    $name = $med
    $strength = ''
    if ($med -match '^(.*\S)\s+([0-9].*)$') {
        $name = $Matches[1].Trim()
        $strength = $Matches[2].Trim()
    }
    return @{ type='entry'; dosageForm=$dosageForm; medicine=$name; strength=$strength }
}

$entries = @()
foreach ($l in $lines) {
    $p = Parse-Line $l
    if ($null -eq $p) { continue }
    if ($p.type -eq 'category') { $currentCategory = $p.value; continue }
    if ($p.type -eq 'entry') {
        $entries += [PSCustomObject]@{
            name = $p.medicine
            medicineType = $currentCategory
            dosageForm = $p.dosageForm
            strength = $p.strength
        }
    }
}

Write-Host "Parsed $($entries.Count) entries. Sample:"
$entries | Select-Object -First 5 | Format-Table

# Save parsed JSON locally for review
$ts = (Get-Date -Format yyyyMMddHHmmss)
$parsedPath = "..\imports\parsed_medicines_$ts.json"
$entries | ConvertTo-Json -Depth 5 | Out-File -FilePath $parsedPath -Encoding UTF8
Write-Host "Saved parsed JSON: $parsedPath"

# POST entries to API
$token = $env:ADMIN_JWT
foreach ($e in $entries) {
    $body = @{
        name = $e.name
        medicineType = $e.medicineType
        dosageForm = $e.dosageForm
        strength = $e.strength
    } | ConvertTo-Json
    try {
        if ($token) {
            $resp = Invoke-RestMethod -Uri "$apiBase/medicines" -Method Post -Body $body -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" }
        } else {
            $resp = Invoke-RestMethod -Uri "$apiBase/medicines" -Method Post -Body $body -ContentType 'application/json'
        }
        Write-Host "[OK] Added: $($e.name) [$($e.dosageForm)]"
    } catch {
        Write-Warning "Failed to add $($e.name): $($_.Exception.Response.StatusCode.Value__  -as [string]) - $($_.Exception.Message)"
    }
    Start-Sleep -Milliseconds 150
}

Write-Host "Import script finished. Review parsed JSON at $parsedPath and server exports for backup."