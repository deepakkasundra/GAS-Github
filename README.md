# GAS-Github
This Node.js utility automates the process of cloning a Google Apps Script project, optionally sanitizing sensitive paths and domain names, and pushing the cleaned files to a GitHub repository.

## 📌 Prerequisites

Before using this script, make sure you have the following installed and configured:

1. **[Node.js](https://nodejs.org/)** (v14 or above recommended)
2. **[npm](https://www.npmjs.com/)** (comes with Node.js)
3. **[clasp](https://developers.google.com/apps-script/guides/clasp)** (Google's CLI tool for Apps Script)
   ```bash
   npm install -g @google/clasp
4. Authenticated clasp with your Google account:
   ```bash
      clasp login
6. Git installed and configured:
Git must be accessible via command line.
Run git config --global user.name "Your Name" and git config --global user.email "you@example.com" if not already set.
7. (Optional) Create a GitHub repository where the sanitized script will be pushed.

⚙️ Script Overview
This script does the following:
Prompts the user to enter a GAS Script ID and GitHub repo URL.
Clones the GAS project to a temporary folder (./temp-clasp).
Optionally sanitizes sensitive content (like domain names or API paths).
Copies files to a defined GitHub repository folder (D:/AppScripts/CM).
Pushes the cleaned files to the GitHub repository.

🚀 How to Run
Clone or place this script in a folder.
Open a terminal/command prompt in that directory.
Run: 
```bash
node script-name.js
```
(Replace script-name.js with the actual file name, e.g., gas_sync.js)

Follow the prompts:
Enter the Google Apps Script ID
Choose whether to sanitize the code (Y/N)
Enter your GitHub repository URL

🧹 Sanitize Mode
If you select Y when prompted to sanitize:
Lines containing common API or domain references will be sanitized to hide sensitive data.
All modifications will be logged to SanitizingOutput.txt.

📁 Output Structure
./temp-clasp → Temporary folder for cloned GAS files.
D:/AppScripts/CM → Destination folder for GitHub push.
.git operations are handled directly within D:/AppScripts.


🪵 Logs
All script actions, git outputs, and file changes are logged in:
SanitizingOutput.txt

❗ Error Handling
The script handles:
Git rebase conflicts and lock files.
Clone or push failures.
Errors are logged and displayed clearly in the terminal and log file.


📄 Example Script ID
GAS Script IDs look like this:
1abcD3FGhiJKlmNOPqrsTUvWxyzXYZ45678
You can get this from the Apps Script URL or project settings.

✅ License
free to use and modify.
