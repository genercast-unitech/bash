!include "MUI2.nsh"

Name "UniTech Connector"
OutFile "unitech-connector-setup.exe"
InstallDir "$PROGRAMFILES64\UniTech Connector"
RequestExecutionLevel admin

!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "PortugueseBR"

Section "Principal" SEC01
    SetOutPath "$INSTDIR"
    File /r "dist\UniTech Connector-win32-x64\*.*"
    
    WriteUninstaller "$INSTDIR\uninstall.exe"
    
    CreateShortCut "$DESKTOP\UniTech Connector.lnk" "$INSTDIR\UniTech Connector.exe"
    CreateDirectory "$SMPROGRAMS\UniTech Connector"
    CreateShortCut "$SMPROGRAMS\UniTech Connector\UniTech Connector.lnk" "$INSTDIR\UniTech Connector.exe"
    CreateShortCut "$SMPROGRAMS\UniTech Connector\Desinstalar.lnk" "$INSTDIR\uninstall.exe"
SectionEnd

Section "Uninstall"
    Delete "$DESKTOP\UniTech Connector.lnk"
    RMDir /r "$SMPROGRAMS\UniTech Connector"
    RMDir /r "$INSTDIR"
SectionEnd
