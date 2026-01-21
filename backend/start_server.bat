@echo off
cd /d "%~dp0"
venv\bin\python.exe manage.py runserver --noreload
