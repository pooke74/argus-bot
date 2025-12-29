@echo off
cd /d "%~dp0"
cls
echo  ==============================================
echo  ARGUS BULUT YUKLEME ARACI (DEBUG MODU V3)
echo  ==============================================
echo.
echo [INFO] Calisma Klasoru: %CD%
echo.

echo [ADIM 1] Git Kontrolu...
git --version
if errorlevel 1 goto GIT_ERROR
echo [OK] Git bulundu.
echo.

echo [ADIM 2] Adres Ayari...
set REPO_URL=https://github.com/pooke74/argus-bot.git
echo Hedef: %REPO_URL%
echo.

echo [ADIM 3] Temizlik...
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%
echo [OK] Remote eklendi.
git branch -M main
echo [OK] Branch ayarlandi.
echo.

echo ----------------------------------------------------
echo [ADIM 4] GITHUB'A YUKLEME...
echo Lutfen acilan pencerede sifre/token girin.
echo ----------------------------------------------------
echo.

git push -u origin main
if errorlevel 1 goto PUSH_ERROR

echo.
echo ==============================================
echo [BASARILI] Kodlar GitHub'a gonderildi!
echo ==============================================
echo Simdi Render.com'a gidip repoyu baglayabilirsiniz.
goto END

:GIT_ERROR
echo.
echo [HATA] Git bulunamadi!
echo Lutfen https://git-scm.com adresinden Git'i kurun.
goto END

:PUSH_ERROR
echo.
echo ==============================================
echo [HATA OLUSTU] Yukleme basarisiz oldu.
echo ==============================================
echo Olasiliklar:
echo 1. Pencereyi kapattiniz veya sifre girmediniz.
echo 2. Sifreniz gecersiz (Token lazim olabilir).
echo 3. Internet yok.
goto END

:END
echo.
echo Islem bitti. Pencereyi kapatmak icin bir tusa basin...
pause
