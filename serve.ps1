# AffordaLabs Pharmacy POS - Lightweight Cross-Device HTTP Server & Shared JSON Database API
param (
    [int]$Port = 8080
)

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$dataDir = Join-Path $root "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}
$dbFile = Join-Path $dataDir "pharmacy_db.json"

# Initialize central shared DB file if not exists
if (-not (Test-Path $dbFile)) {
    $initialDb = @{
        version      = 1
        lastUpdated  = (Get-Date).ToString("o")
        items        = @()
        transactions = @()
        settings     = @{
            pharmacyName       = "AffordaLabs Pharmacy"
            tagline            = "Your Trusted Community Drugstore"
            branch             = "Main Branch - Pasig City"
            address            = "128 Mabini St, Kapasigan, Pasig City, Metro Manila"
            tin                = "302-841-925-000"
            pharmacistInCharge = "Jasper Andrew Chan, RPh"
            prcLicense         = "PRC-0089142"
            birAccreditation   = "BIR-RR7-2024-00981"
            phone              = "(02) 8642-9912 / 0917-123-4567"
            currency           = "PHP"
            currencySymbol     = "PHP"
            seniorDiscountRate = 20
            vatRate            = 12
            vatExemptSenior    = $true
        }
        staff        = @(
            @{ id = 'stf-1'; name = 'Jasper Andrew Chan'; role = 'Pharmacist-in-Charge / Owner'; license = 'PRC-0089142'; phone = '0917-123-4567'; status = 'Active' },
            @{ id = 'stf-2'; name = 'Lionel Santos'; role = 'Staff Pharmacist'; license = 'PRC-0092144'; phone = '0918-234-5678'; status = 'Active' },
            @{ id = 'stf-3'; name = 'Sarah Dela Cruz'; role = 'Pharmacy Assistant'; license = 'TESDA NC-III'; phone = '0922-345-6789'; status = 'Active' },
            @{ id = 'stf-4'; name = 'Mark Ramos'; role = 'Inventory Specialist'; license = '-'; phone = '0919-456-7890'; status = 'Active' }
        )
        drawer       = @{
            shiftDate           = (Get-Date).ToString("yyyy-MM-dd")
            openedAt            = "08:00 AM"
            openedBy            = "Lionel Santos"
            openingFloat        = 2000.00
            currentCashInDrawer = 2000.00
            expectedCash        = 2000.00
            discrepancy         = 0.00
            status              = "Open"
        }
        users        = @(
            @{
                id          = 'usr-001'
                username    = 'andrew'
                password    = 'andrew123'
                fullName    = 'Jasper Andrew Chan, RPh'
                firstName   = 'Andrew'
                initials    = 'AC'
                role        = 'Pharmacist-in-Charge / Owner'
                level       = 'Owner'
                permissions = @('home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings')
                prcLicense  = 'PRC-0089142'
                phone       = '0917-123-4567'
                status      = 'Active'
                avatar      = $null
            },
            @{
                id          = 'usr-005'
                username    = 'admin'
                password    = 'admin123'
                fullName    = 'System Administrator'
                firstName   = 'Admin'
                initials    = 'SA'
                role        = 'Owner / Administrator'
                level       = 'Admin'
                permissions = @('home', 'dashboard', 'transactions', 'reports', 'inventory', 'staff', 'cashdrawer', 'settings')
                prcLicense  = 'N/A'
                phone       = '0900-000-0000'
                status      = 'Active'
                avatar      = $null
            },
            @{
                id          = 'usr-002'
                username    = 'lionel'
                password    = 'lionel123'
                fullName    = 'Lionel Santos, RPh'
                firstName   = 'Lionel'
                initials    = 'LS'
                role        = 'Staff Pharmacist'
                level       = 'Staff'
                permissions = @('home', 'dashboard', 'transactions', 'reports', 'inventory', 'cashdrawer')
                prcLicense  = 'PRC-0092144'
                phone       = '0918-234-5678'
                status      = 'Active'
                avatar      = $null
            },
            @{
                id          = 'usr-003'
                username    = 'sarah'
                password    = 'sarah123'
                fullName    = 'Sarah Dela Cruz'
                firstName   = 'Sarah'
                initials    = 'SD'
                role        = 'Pharmacy Assistant'
                level       = 'Staff'
                permissions = @('home', 'transactions', 'inventory', 'cashdrawer')
                prcLicense  = 'TESDA NC-III'
                phone       = '0922-345-6789'
                status      = 'Active'
                avatar      = $null
            },
            @{
                id          = 'usr-004'
                username    = 'mark'
                password    = 'mark123'
                fullName    = 'Mark Ramos'
                firstName   = 'Mark'
                initials    = 'MR'
                role        = 'Inventory Specialist'
                level       = 'Staff'
                permissions = @('home', 'inventory', 'reports')
                prcLicense  = 'INV-REG-2024'
                phone       = '0919-456-7890'
                status      = 'Active'
                avatar      = $null
            }
        )
    }
    $jsonInit = $initialDb | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($dbFile, $jsonInit, [System.Text.Encoding]::UTF8)
}

# Determine active IP addresses for easy user reference
$ipAddresses = try {
    [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | 
    Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and $_.IPAddressToString -ne '127.0.0.1' } |
    ForEach-Object { $_.IPAddressToString }
}
catch { @() }

$tcpListener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)

try {
    $tcpListener.Start()
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " AffordaLabs Pharmacy POS Server Running on Port $Port" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  - This PC:       http://localhost:$Port/" -ForegroundColor Cyan
    foreach ($ip in $ipAddresses) {
        Write-Host "  - On Wi-Fi/LAN:  http://${ip}:${Port}/" -ForegroundColor Yellow
    }
    Write-Host "  - Shared DB:     $dbFile" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Green
}
catch {
    Write-Error "Failed to start listener on port ${Port}: $_"
    exit 1
}

function Get-ContentType($filePath) {
    $ext = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
    switch ($ext) {
        ".html" { "text/html; charset=utf-8" }
        ".htm" { "text/html; charset=utf-8" }
        ".css" { "text/css; charset=utf-8" }
        ".js" { "application/javascript; charset=utf-8" }
        ".json" { "application/json; charset=utf-8" }
        ".png" { "image/png" }
        ".jpg" { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        ".gif" { "image/gif" }
        ".svg" { "image/svg+xml" }
        ".ico" { "image/x-icon" }
        ".woff" { "font/woff" }
        ".woff2" { "font/woff2" }
        ".ttf" { "font/ttf" }
        Default { "application/octet-stream" }
    }
}

try {
    while ($true) {
        $client = $tcpListener.AcceptTcpClient()
        $stream = $client.GetStream()
        
        try {
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
            $requestLine = $reader.ReadLine()
            if (-not $requestLine) {
                $client.Close()
                continue
            }

            $parts = $requestLine.Split(' ')
            if ($parts.Length -lt 2) {
                $client.Close()
                continue
            }

            $method = $parts[0].ToUpperInvariant()
            $url = $parts[1]
            $path = $url.Split('?')[0].TrimStart('/')
            if ([string]::IsNullOrWhiteSpace($path)) {
                $path = "index.html"
            }

            # Read headers
            $headers = @{}
            $contentLength = 0
            while ($line = $reader.ReadLine()) {
                if ([string]::IsNullOrWhiteSpace($line)) { break }
                $colonIdx = $line.IndexOf(':')
                if ($colonIdx -gt 0) {
                    $hKey = $line.Substring(0, $colonIdx).Trim().ToLowerInvariant()
                    $hVal = $line.Substring($colonIdx + 1).Trim()
                    $headers[$hKey] = $hVal
                    if ($hKey -eq 'content-length') {
                        [int]::TryParse($hVal, [ref]$contentLength) | Out-Null
                    }
                }
            }

            # Handle CORS OPTIONS Preflight
            if ($method -eq "OPTIONS") {
                $corsHeader = "HTTP/1.1 204 No Content`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
                $hBytes = [System.Text.Encoding]::UTF8.GetBytes($corsHeader)
                $stream.Write($hBytes, 0, $hBytes.Length)
                $stream.Flush()
                $client.Close()
                continue
            }

            # Handle API: Shared Central Database GET
            if ($path -eq "api/data" -and $method -eq "GET") {
                $dbJson = if (Test-Path $dbFile) {
                    [System.IO.File]::ReadAllText($dbFile, [System.Text.Encoding]::UTF8)
                }
                else {
                    '{"items":[],"transactions":[]}'
                }
                $resBytes = [System.Text.Encoding]::UTF8.GetBytes($dbJson)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($resBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($resBytes, 0, $resBytes.Length)
                $stream.Flush()
                $client.Close()
                continue
            }

            # Handle API: Shared Central Database POST / Sync
            if ($path -eq "api/data" -and $method -eq "POST") {
                $bodyChars = New-Object char[] $contentLength
                $readCount = 0
                while ($readCount -lt $contentLength) {
                    $n = $reader.Read($bodyChars, $readCount, $contentLength - $readCount)
                    if ($n -le 0) { break }
                    $readCount += $n
                }
                $body = New-Object string ($bodyChars, 0, $readCount)
                
                # Merge or overwrite received fields into shared pharmacy_db.json
                try {
                    $payload = $body | ConvertFrom-Json
                    $existing = if (Test-Path $dbFile) {
                        (Get-Content -Path $dbFile -Raw -Encoding UTF8) | ConvertFrom-Json
                    }
                    else {
                        New-Object PSObject
                    }

                    if ($payload.PSObject.Properties['items']) { $existing | Add-Member -MemberType NoteProperty -Name 'items' -Value $payload.items -Force }
                    if ($payload.PSObject.Properties['transactions']) { $existing | Add-Member -MemberType NoteProperty -Name 'transactions' -Value $payload.transactions -Force }
                    if ($payload.PSObject.Properties['settings']) { $existing | Add-Member -MemberType NoteProperty -Name 'settings' -Value $payload.settings -Force }
                    if ($payload.PSObject.Properties['staff']) { $existing | Add-Member -MemberType NoteProperty -Name 'staff' -Value $payload.staff -Force }
                    if ($payload.PSObject.Properties['drawer']) { $existing | Add-Member -MemberType NoteProperty -Name 'drawer' -Value $payload.drawer -Force }
                    if ($payload.PSObject.Properties['users']) { $existing | Add-Member -MemberType NoteProperty -Name 'users' -Value $payload.users -Force }
                    
                    $newVersion = if ($existing.version) { [int]$existing.version + 1 } else { 1 }
                    $existing | Add-Member -MemberType NoteProperty -Name 'version' -Value $newVersion -Force
                    $existing | Add-Member -MemberType NoteProperty -Name 'lastUpdated' -Value ((Get-Date).ToString("o")) -Force

                    $savedJson = $existing | ConvertTo-Json -Depth 10
                    $tempFile = "$dbFile.tmp"
                    [System.IO.File]::WriteAllText($tempFile, $savedJson, [System.Text.Encoding]::UTF8)
                    Move-Item -Path $tempFile -Destination $dbFile -Force

                    $respJson = '{"success":true,"version":' + $newVersion + '}'
                }
                catch {
                    $respJson = '{"success":false,"error":' + ($_.Exception.Message | ConvertTo-Json) + '}'
                }

                $resBytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($resBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($resBytes, 0, $resBytes.Length)
                $stream.Flush()
                $client.Close()
                continue
            }

            # Handle test results API endpoint
            if ($path -eq "api/test-results" -and $method -eq "POST") {
                $bodyChars = New-Object char[] $contentLength
                $readCount = 0
                while ($readCount -lt $contentLength) {
                    $n = $reader.Read($bodyChars, $readCount, $contentLength - $readCount)
                    if ($n -le 0) { break }
                    $readCount += $n
                }
                $body = New-Object string ($bodyChars, 0, $readCount)
                [System.IO.File]::WriteAllText((Join-Path $root "simulation_output.json"), $body, [System.Text.Encoding]::UTF8)
                
                $responseBody = [System.Text.Encoding]::UTF8.GetBytes('{"success":true}')
                $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json`r`nContent-Length: $($responseBody.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($responseBody, 0, $responseBody.Length)
                $stream.Flush()
                $client.Close()
                continue
            }

            # Normalize slashes & security check
            $safePath = $path.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $safePath))

            if (-not $fullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
                $forbidden = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
                $header = "HTTP/1.1 403 Forbidden`r`nContent-Type: text/plain`r`nContent-Length: $($forbidden.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($forbidden, 0, $forbidden.Length)
                $stream.Flush()
                $client.Close()
                continue
            }

            if (Test-Path $fullPath -PathType Leaf) {
                $contentType = Get-ContentType $fullPath
                $fileBytes = [System.IO.File]::ReadAllBytes($fullPath)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($fileBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                if ($method -ne "HEAD") {
                    $stream.Write($fileBytes, 0, $fileBytes.Length)
                }
                $stream.Flush()
            }
            else {
                $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
                $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($notFound.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                if ($method -ne "HEAD") {
                    $stream.Write($notFound, 0, $notFound.Length)
                }
                $stream.Flush()
            }
        }
        catch {
            # Client socket errors
        }
        finally {
            try { $client.Close() } catch {}
        }
    }
}
finally {
    $tcpListener.Stop()
}
