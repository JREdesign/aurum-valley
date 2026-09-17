@echo off
chcp 65001 >nul
title Aurum - Valle de los gigantes
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js 22.12 o posterior desde https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Preparando Aurum por primera vez...
  call npm.cmd install
  if errorlevel 1 (
    echo No se han podido instalar las dependencias. Revisa tu conexion.
    pause
    exit /b 1
  )
)
echo.
echo Bienvenido a Aurum. El navegador se abrira automaticamente.
echo Deja esta ventana abierta mientras juegas.
echo Si Aurum ya esta abierto, visita http://127.0.0.1:5173/
echo.
call npm.cmd run dev -- --port 5173 --strictPort --open
pause
