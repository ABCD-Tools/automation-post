ABCD Tools Client Agent
========================

This is the ABCD Tools client agent that runs automation workflows on your computer.

INSTALLATION
------------
1. Extract this ZIP file to a folder (e.g., C:\ABCDTools\)
2. Run setup_agents.bat to download Node.js and pnpm
3. Run check.bat to verify installation and registration status
4. Run start_agent.bat to start the agent

FILES
-----
- setup_agents.bat    - Downloads Node.js and pnpm, then installs dependencies
- check.bat           - Checks if Node.js, pnpm are installed and client is registered
- start_agent.bat     - Starts the agent (runs check.bat first)
- .env                - Configuration file (DO NOT SHARE THIS FILE!)
- package.json        - Node.js dependencies
- modules-client/     - Client agent code
- modules-agents/     - Agent utilities
- logs/               - Log files

CONFIGURATION
-------------
The .env file contains your client configuration:
- CLIENT_ID          - Your unique client identifier
- API_TOKEN          - Your API authentication token
- API_URL            - Server API URL
- ENCRYPTION_KEY     - Encryption key (DO NOT SHARE!)
- DECRYPTION_KEY     - Decryption key (DO NOT SHARE!)
- BROWSER_PATH       - Path to Chrome/Edge executable

SECURITY
--------
⚠️  IMPORTANT: Never share your .env file with anyone!
⚠️  The encryption keys in .env are used to decrypt account passwords.
⚠️  Keep this folder secure and do not commit it to version control.

TROUBLESHOOTING
---------------
- If the agent won't start, run check.bat to diagnose issues
- Check logs/ folder for error messages
- Make sure Node.js and pnpm are installed (run setup_agents.bat)
- Verify your .env file has all required variables
- Check your internet connection

SUPPORT
-------
For support, contact your administrator or check the documentation.

