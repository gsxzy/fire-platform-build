@echo off
chcp 65001 >nul
echo ==========================================
echo  新致远智慧消防平台 - 后端本地打包脚本
echo ==========================================
echo.

set SRC_DIR=%~dp0backend\dist
set DEST_ZIP=%~dp0backend-deploy-new.zip

echo [1/3] 正在打包 backend\dist 目录...
if exist "%DEST_ZIP%" del "%DEST_ZIP%"

powershell -Command "Compress-Archive -Path '%SRC_DIR%\*' -DestinationPath '%DEST_ZIP%' -Force"
if %errorlevel% neq 0 (
    echo [错误] 打包失败，请检查 PowerShell 是否可用
    pause
    exit /b 1
)

echo [2/3] 打包完成: %DEST_ZIP%
echo.
echo [3/3] 下一步操作：
echo    1. 登录宝塔面板 (124.223.35.58:8888)
echo    2. 进入「文件」管理器
echo    3. 上传 %DEST_ZIP% 到 /opt/my-fire-api-new/
echo    4. 在终端执行：
echo       cd /opt/my-fire-api-new
echo       unzip -o backend-deploy-new.zip
echo       pm2 restart fire-platform
echo.
pause
