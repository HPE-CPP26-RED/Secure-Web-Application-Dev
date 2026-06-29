@echo off
setlocal

echo ==========================================
echo Stopping existing containers...
echo ==========================================
docker-compose -f docker-compose.dev.yml down

if %ERRORLEVEL% NEQ 0 (
    echo Warning: Failed to stop containers or none were running.
)

echo.
echo ==========================================
echo Building React frontend...
echo ==========================================
cd client
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: React build failed!
    cd ..
    pause
    exit /b %ERRORLEVEL%
)

cd ..

echo.
echo ==========================================
echo Rebuilding and starting Docker containers...
echo ==========================================
docker-compose -f docker-compose.dev.yml up --build -d

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Docker failed to start.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==========================================
echo Server restarted successfully!
echo ==========================================
echo.
echo Running containers:
docker ps

echo.
echo Tailing logs... Press Ctrl+C to stop viewing logs.
docker-compose -f docker-compose.dev.yml logs -f