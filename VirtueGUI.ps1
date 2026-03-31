Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = "Virtue V2 Central Hub"
$form.Size = New-Object System.Drawing.Size(420,380)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.Color]::FromArgb(255, 248, 250, 252)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false

$font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)

# Title
$label = New-Object System.Windows.Forms.Label
$label.Text = "Virtue V2 Control Panel"
$label.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$label.AutoSize = $true
$label.Location = New-Object System.Drawing.Point(85, 20)
$label.ForeColor = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)
$form.Controls.Add($label)

# Subtitle
$subLabel = New-Object System.Windows.Forms.Label
$subLabel.Text = "Enterprise School ERP Developer Tools"
$subLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
$subLabel.AutoSize = $true
$subLabel.Location = New-Object System.Drawing.Point(90, 50)
$subLabel.ForeColor = [System.Drawing.Color]::FromArgb(255, 100, 116, 139)
$form.Controls.Add($subLabel)

function Add-Button($text, $y, $color, $arg) {
    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = $text
    $btn.Size = New-Object System.Drawing.Size(320, 45)
    $btn.Location = New-Object System.Drawing.Point(40, $y)
    $btn.Font = $font
    $btn.BackColor = $color
    $btn.ForeColor = [System.Drawing.Color]::White
    $btn.FlatStyle = "Flat"
    $btn.FlatAppearance.BorderSize = 0
    $btn.Cursor = [System.Windows.Forms.Cursors]::Hand
    
    $action = {
        $cmd = "cmd.exe"
        $args = "/c `".\dashboard.bat $arg`""
        # We start a visual command prompt so the user can see Webpack/Prisma/Typescript outputs
        Start-Process -FilePath $cmd -ArgumentList $args
    }
    $btn.Add_Click($action)
    $form.Controls.Add($btn)
}

$primaryColor = [System.Drawing.Color]::FromArgb(255, 124, 58, 237)
$nuclearColor = [System.Drawing.Color]::FromArgb(255, 225, 29, 72)
$syncColor = [System.Drawing.Color]::FromArgb(255, 16, 185, 129)
$dbColor = [System.Drawing.Color]::FromArgb(255, 245, 158, 11)

Add-Button "▶ START ENVIRONMENT (Dev + Studio)" 95 $primaryColor "1"
Add-Button "🔁 SAFE GIT AUTO-SYNC" 150 $syncColor "2"
Add-Button "☢️ THE NUCLEAR RESET" 205 $nuclearColor "3"
Add-Button "🗄️ DATABASE PUSH" 260 $dbColor "4"

$form.ShowDialog() | Out-Null
