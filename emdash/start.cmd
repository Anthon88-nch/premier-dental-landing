@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Премьер: сайт на EmDash
where node >nul 2>nul || goto :nonode
if not exist node_modules goto :install

:run
set "OPEN_URL=http://localhost:4321/"
if not exist data.db set "OPEN_URL=http://localhost:4321/_emdash/admin"
echo.
echo   Сайт:     http://localhost:4321/
echo   Админка:  http://localhost:4321/_emdash/admin
echo   Окно не закрывайте, пока работаете с сайтом. Остановить: Ctrl+C.
echo.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 12; Start-Process '%OPEN_URL%'"
call npm.cmd run dev
pause
exit /b

:install
echo Первый запуск: ставлю зависимости, это 1-3 минуты...
call npm.cmd install --no-audit --no-fund || goto :fail
goto :run

:nonode
echo Не найден Node.js. Установите Node.js 24 LTS с https://nodejs.org и запустите start.cmd снова.
pause
exit /b 1

:fail
echo Установка не удалась. Пришлите текст ошибки выше.
pause
exit /b 1
