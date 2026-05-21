# Run this before uploading photos:
#   .\setup-cloudinary.ps1

$env:CLOUDINARY_CLOUD_NAME = "dikkdclum"
$env:CLOUDINARY_API_KEY    = "587182656355697"
$env:CLOUDINARY_API_SECRET = "S7EWqPxRxyxJRF0MB1fu93Upn3o"

Write-Host "Cloudinary credentials set. Running upload..." -ForegroundColor Cyan
node upload-photos.js
