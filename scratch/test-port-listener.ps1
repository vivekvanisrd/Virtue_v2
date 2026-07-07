$port = 3005
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
$listener.Start()
Write-Host "-----------------------------------------------------------------"
Write-Host "📡 eSSL ADMS TCP Packet Listener (Port $port)"
Write-Host "-----------------------------------------------------------------"
Write-Host "💡 Please set the ADMS Server Port on the eSSL screen to $port."
Write-Host "💡 Ensure the Server Address remains 192.168.1.100."
Write-Host "Waiting for connection (Timeout in 30 seconds)...`n"

# Use non-blocking check to allow timeout
$timeoutSeconds = 30
$elapsed = 0
$connected = $false
$client = $null

while ($elapsed -lt $timeoutSeconds) {
    if ($listener.Pending()) {
        $client = $listener.AcceptTcpClient()
        $connected = $true
        break
    }
    Start-Sleep -Seconds 1
    $elapsed++
}

if ($connected -and $client -ne $null) {
    $remoteIp = $client.Client.RemoteEndPoint.Address.IPAddressToString
    $remotePort = $client.Client.RemoteEndPoint.Port
    Write-Host "✅ SUCCESS: CONNECTION RECEIVED!"
    Write-Host "   Device LAN IP: $remoteIp"
    Write-Host "   Device Port:   $remotePort"
    
    # Read the incoming payload
    $stream = $client.GetStream()
    $buffer = [byte[]]::new(4096)
    $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
    $requestText = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $bytesRead)
    
    Write-Host ""
    Write-Host "📥 Raw Packet Received:"
    Write-Host "--------------------------------------------------"
    Write-Host $requestText
    Write-Host "--------------------------------------------------"
    
    # Respond with standard ADMS handshake OK
    $response = "HTTP/1.1 200 OK`r`nContent-Type: text/plain`r`nContent-Length: 2`r`n`r`nOK"
    $responseBytes = [System.Text.Encoding]::ASCII.GetBytes($response)
    $stream.Write($responseBytes, 0, $responseBytes.Length)
    Write-Host ""
    Write-Host "✅ Response 'OK' sent back to device."
    
    $client.Close()
} else {
    Write-Host "❌ TIMEOUT: No connection received."
    Write-Host "   This means the physical eSSL device is not initiating any connections to your PC."
    Write-Host "   Please double-check:"
    Write-Host "   1. Is 'Enable ADMS' or 'Cloud Service' turned ON in the device settings?"
    Write-Host "   2. Is the Ethernet cable firmly connected (link lights blinking)?"
}

$listener.Stop()
Write-Host ""
Write-Host "Stopped listening."
