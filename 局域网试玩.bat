@echo off
chcp 65001 >nul
title Hanzi-Connections LAN Server
cd /d "%~dp0"
python lan-server.py
echo.
pause
