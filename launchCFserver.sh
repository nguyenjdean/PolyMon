#!/usr/bin/env bash
.\cloudflared.exe tunnel --url http://localhost:3000
echo "The script is done."
read -p "Press [Enter] key to close this window..."