@echo off
chcp 65001 >nul
rem Обновляет файлы сайта из ветки emdash на GitHub. Перед запуском остановите start.cmd (Ctrl+C).
cd /d "%~dp0\..\.."
echo Скачиваю свежую версию с GitHub...
powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing 'https://github.com/Anthon88-nch/premier-dental-landing/archive/refs/heads/emdash.zip' -OutFile premier-emdash.zip; Expand-Archive premier-emdash.zip -DestinationPath . -Force; Remove-Item premier-emdash.zip" || goto :fail
cd /d "%~dp0"
echo.
echo Файлы обновлены.
choice /C YN /M "Сбросить базу сайта к свежему демо-контенту (нужно, если менялась админка)"
if errorlevel 2 goto :done
if exist data.db del /q data.db
if exist data.db-wal del /q data.db-wal
if exist data.db-shm del /q data.db-shm
if exist uploads rmdir /s /q uploads
echo База сброшена. При следующем запуске откроется мастер настройки.

:done
echo Запускайте start.cmd.
pause
exit /b

:fail
echo Не получилось скачать. Проверьте интернет и попробуйте ещё раз.
pause
exit /b 1
