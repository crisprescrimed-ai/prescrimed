try {
	$body = @{ email = 'adminfisio@prescrimed.com'; senha = '123456' } | ConvertTo-Json
	$resp = Invoke-RestMethod -Uri 'http://localhost:8000/api/auth/login' -Method Post -ContentType 'application/json' -Body $body
	$resp | ConvertTo-Json -Depth 5 | Write-Output
} catch {
	Write-Host "Erro ao logar:" $_.Exception.Message
	if ($_.Exception.Response) {
		try {
			$reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
			$content = $reader.ReadToEnd()
			Write-Host $content
		} catch {}
	}
	exit 1
}
