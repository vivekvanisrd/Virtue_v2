@echo off
title Virtue Database Schema Sync
echo ==============================================
echo   VIRTUE ERP - DATABASE SCHEMA SYNC (PRISMA)
echo ==============================================
echo.
echo Connecting to Supabase and creating the CommunicationLog tables...
echo.
call npx prisma db push
echo.
echo ==============================================
echo   Prisma Sync complete! Press any key to exit.
echo ==============================================
pause
