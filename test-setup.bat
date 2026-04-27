@echo off
cd /d "D:\repos\ferco-posta"
echo Running setup-configuracion.js...
node setup-configuracion.js
echo.
echo Directory listing:
dir "D:\repos\ferco-posta\frontend\src\features\configuracion"
