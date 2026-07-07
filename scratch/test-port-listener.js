const net = require('net');
const port = 3001;

const server = net.createServer((socket) => {
    console.log(`✅ SUCCESS: CONNECTION RECEIVED!`);
    console.log(`   Device LAN IP: ${socket.remoteAddress}`);
    console.log(`   Device Port:   ${socket.remotePort}`);

    socket.on('data', (data) => {
        console.log(`\n📥 Raw Packet Received:`);
        console.log(`--------------------------------------------------`);
        console.log(data.toString().trim());
        console.log(`--------------------------------------------------`);

        // Respond with standard ADMS handshake OK
        const response = "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\n\r\nOK";
        socket.write(response);
        console.log(`\n✅ Response 'OK' sent back to device.`);
        socket.end();
        
        // Exit successfully since we proved connection works
        setTimeout(() => {
            server.close();
            process.exit(0);
        }, 1000);
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err.message);
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`-----------------------------------------------------------------`);
    console.log(`📡 eSSL ADMS TCP Packet Listener (Port ${port})`);
    console.log(`-----------------------------------------------------------------`);
    console.log(`💡 Please set the ADMS Server Port on the eSSL screen to ${port}.`);
    console.log(`💡 Ensure the Server Address remains 192.168.1.100.`);
    console.log(`Waiting for connection... (Timeout in 30 seconds)\n`);
});

// Set a timeout of 30 seconds
setTimeout(() => {
    console.log(`\n❌ TIMEOUT: No connection received.`);
    console.log(`   This means the physical eSSL device is not initiating any connections to your PC.`);
    console.log(`   Please double-check:`);
    console.log(`   1. Is 'Enable ADMS' or 'Cloud Service' turned ON in the device settings?`);
    console.log(`   2. Is the Ethernet cable firmly connected (link lights blinking)?`);
    server.close();
    process.exit(0);
}, 30000);
