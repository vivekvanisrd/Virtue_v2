# WinRT OCR Batch script
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $null = [Windows.Storage.StorageFile, Windows.Foundation, ContentType = WindowsRuntime]
    $null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Foundation, ContentType = WindowsRuntime]
    $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
    $null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType = WindowsRuntime]
    $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
    $null = [Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime]
    $null = [Windows.Foundation.IAsyncOperation`1, Windows.Foundation, ContentType = WindowsRuntime]

    # Find the GetAwaiter method
    $awaiter = [WindowsRuntimeSystemExtensions].GetMember('GetAwaiter', 'Method', 'Public,Static') | 
        Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | 
        Select-Object -First 1

    if (-not $awaiter) {
        throw "Could not find WinRT GetAwaiter extension method."
    }

    function Await {
        param($AsyncTask, $ResultType)
        return $awaiter.MakeGenericMethod($ResultType).Invoke($null, @($AsyncTask)).GetResult()
    }

    $imgDir = "J:\virtue_fb\virtue-v2\scratch\extracted_all_img"
    $txtDir = "J:\virtue_fb\virtue-v2\scratch\ocr_txt"
    $null = New-Item -ItemType Directory -Force -Path $txtDir

    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if (-not $engine) {
        throw "Could not create OcrEngine."
    }

    $images = Get-ChildItem -Path "$imgDir\*.jpg"
    write-host "Starting OCR processing for $($images.Length) images..."

    foreach ($img in $images) {
        $outPath = Join-Path $txtDir "$($img.BaseName).txt"
        if (Test-Path $outPath) {
            write-host "Skipping $($img.Name): already processed"
            continue
        }
        
        write-host "Processing $($img.Name)..."
        try {
            $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($img.FullName)) ([Windows.Storage.StorageFile])
            $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
            $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
            $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
            $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
            
            [System.IO.File]::WriteAllText($outPath, $result.Text)
        } catch {
            write-error "Error on $($img.Name): $_"
        }
    }
    write-host "OCR Processing Complete!"
} catch {
    write-error $_
}
