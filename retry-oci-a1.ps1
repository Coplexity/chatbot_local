$stackId = "ocid1.ormstack.oc1.ap-batam-1.amaaaaaajncgp3yaqrn4kjgmg3tiltkvutyblip5xy2plklu3beyzt6zj3jq"
$retrySeconds = 15 * 60
$maxAttempts = 96
$created = $false

for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"

    Write-Host ""
    Write-Host "Lan thu $attempt/$maxAttempts - Apply luc $(Get-Date)" -ForegroundColor Cyan

    $jobOutput = & oci resource-manager job create-apply-job --stack-id $stackId --execution-plan-strategy AUTO_APPROVED --display-name "a1-retry-$stamp"
    $jobExitCode = $LASTEXITCODE

    if ($jobExitCode -ne 0) {
        Write-Host "Khong tao duoc Apply Job." -ForegroundColor Red
    }
    else {
        try {
            $jobJson = $jobOutput -join "`n"
            $job = $jobJson | ConvertFrom-Json
            $jobId = $job.data.id
        }
        catch {
            Write-Host "Khong doc duoc ket qua tao Job: $($_.Exception.Message)" -ForegroundColor Red
            $jobId = $null
        }

        if (-not [string]::IsNullOrWhiteSpace($jobId)) {
            Write-Host "Job OCID: $jobId"
            $state = "ACCEPTED"

            do {
                Start-Sleep -Seconds 30

                $statusOutput = & oci resource-manager job get --job-id $jobId
                $statusExitCode = $LASTEXITCODE

                if ($statusExitCode -ne 0) {
                    Write-Host "Khong doc duoc trang thai Job." -ForegroundColor Red
                    $state = "STATUS_ERROR"
                    break
                }

                try {
                    $statusJson = $statusOutput -join "`n"
                    $status = $statusJson | ConvertFrom-Json
                    $state = $status.data.'lifecycle-state'
                    Write-Host "Trang thai: $state"
                }
                catch {
                    Write-Host "Khong doc duoc JSON trang thai: $($_.Exception.Message)" -ForegroundColor Red
                    $state = "STATUS_ERROR"
                    break
                }
            }
            while ($state -in @("ACCEPTED", "IN_PROGRESS", "CANCELING"))

            if ($state -eq "SUCCEEDED") {
                Write-Host ""
                Write-Host "THANH CONG! VM da duoc tao." -ForegroundColor Green
                [console]::Beep(1000, 1500)
                $created = $true
                break
            }

            if ($state -eq "FAILED") {
                Write-Host "Job that bai, kha nang cao la Out of host capacity." -ForegroundColor Yellow
            }
        }
    }

    if ($attempt -lt $maxAttempts) {
        Write-Host "Cho 15 phut roi thu lai..."
        Start-Sleep -Seconds $retrySeconds
    }
}

if (-not $created) {
    Write-Host "Da het so lan thu ma VM van chua duoc tao." -ForegroundColor Yellow
}
