@echo off
chcp 65001 >nul
title Hanzi-Connections Puzzle Editor
cd /d "%~dp0"
python puzzle-editor-gui.py
if errorlevel 1 (
  echo.
  echo Python failed to start. Please make sure Python is installed (D:\py\python.exe)
)
pause
