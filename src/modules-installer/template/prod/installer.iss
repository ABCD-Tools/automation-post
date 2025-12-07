[Setup]
AppName=ABCD Tools Client
AppVersion=1.0.0
DefaultDirName={localappdata}\ABCDTools
DefaultGroupName=ABCD Tools
OutputBaseFilename=ABCDToolsSetup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=admin

[Files]
Source: "agent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: ".env"; DestDir: "{app}"; Flags: ignoreversion
Source: "register-protocol.reg"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.txt"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
Root: HKCU; Subkey: "Software\Classes\abcdtools"; ValueType: string; ValueData: "URL:ABCD Tools Protocol"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\abcdtools"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\abcdtools\shell\open\command"; ValueType: string; ValueData: """{app}\agent.exe"" ""%1"""; Flags: uninsdeletekey

[Run]
Filename: "regedit.exe"; Parameters: "/s ""{app}\register-protocol.reg"""; StatusMsg: "Registering protocol handler..."; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

