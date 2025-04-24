const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const claspProjectRoot = "./temp-clasp";
// Update as per required directory
const githubRoot = "D:/AppScripts";
const githubRepoPath = path.join(githubRoot, "GIT PROJECT or folder Name");   // Update Project Name here 
const logFile = "SanitizingOutput.txt";
const apiKeywords = ['/api/', '/cm/', '/bots/', '/v1/', '/v2/'];
const domainPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
const fileExtensions = ['.js', '.gs'];

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, `${msg}\n`);
}

function execCmd(command, cwd) {
  log(`📦 CMD: ${command} (in ${cwd})`);
  return execSync(command, { cwd, stdio: "pipe" }).toString().trim();
}

function isCommented(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
}

function looksLikeUrlLine(line) {
  return apiKeywords.some(keyword => line.includes(keyword)) && domainPattern.test(line);
}

function sanitizeAndLogFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    let updatedContent = "";

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || isCommented(trimmed)) {
        updatedContent += line + "\n";
        return;
      }

      if (looksLikeUrlLine(trimmed)) {
        let updatedLine = trimmed
          .replace(domainPattern, "Domain")
          .replace(/(\/[^'"\\\s]*)/g, "/<REDACTED_PATH>/");

        log(`📄 File: ${filePath}\n🔢 Line: ${index + 1}\n🧩 Match: ${trimmed}\n✂️ Updated: ${updatedLine}\n──────────────────────────`);
        updatedContent += updatedLine + "\n";
      } else {
        updatedContent += line + "\n";
      }
    });

    fs.writeFileSync(filePath, updatedContent, "utf-8");
    log(`✔️ File sanitized: ${filePath}`);
  } catch (err) {
    log(`❌ ERROR: Could not sanitize file ${filePath}. Reason: ${err.message}`);
  }
}

function sanitizeDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath);
  entries.forEach(entry => {
    const fullPath = path.join(dirPath, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      sanitizeDirectory(fullPath);
    } else if (fileExtensions.some(ext => fullPath.endsWith(ext))) {
      sanitizeAndLogFile(fullPath);
    }
  });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach(entry => {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// === Git Functions ===
function abortRebaseIfNeeded(githubRoot) {
  const rebasePath = path.join(githubRoot, ".git", "rebase-merge");
  const lockFilePath = path.join(githubRoot, ".git", "index.lock");

  // Check for rebase progress folder
  if (fs.existsSync(rebasePath)) {
    log("⚠️ Git rebase in progress. Attempting to abort...");

    try {
      // Attempt to abort rebase
      execCmd("git rebase --abort", githubRoot);
      log("✅ Rebase aborted successfully.");
    } catch (err) {
      log(`❌ Failed to abort rebase: ${err.message}. Attempting to clean up...`);
      // Clean rebase state manually
      fs.rmSync(rebasePath, { recursive: true, force: true });
      log("⚠️ Rebase state cleaned. Trying again.");
      return false;
    }
  }

  // Check if any lock file is present and remove it
  if (fs.existsSync(lockFilePath)) {
    log("⚠️ Git lock file detected. Attempting to remove...");
    try {
      fs.rmSync(lockFilePath);
      log("✅ Lock file removed successfully.");
    } catch (err) {
      log(`❌ Failed to remove lock file: ${err.message}`);
      return false;
    }
  }

  return true;
}

// === MAIN ===
(async function main() {
  const scriptId = await ask("📄 Enter the Google Apps Script ID: ");
  if (!scriptId.trim()) {
    log("❌ ERROR: Google Apps Script ID cannot be blank.");
    rl.close();
    return;
  }

  const shouldSanitizeInput = await ask("🧹 Sanitize code before pushing? (Y/N): ");
  if (!shouldSanitizeInput.trim()) {
    log("❌ ERROR: You must specify whether to sanitize or not.");
    rl.close();
    return;
  }
  const shouldSanitize = shouldSanitizeInput.trim().toUpperCase() === "Y";

  const repoUrl = await ask("🔗 Enter the GitHub REPO URL: ");
  if (!repoUrl.trim()) {
    log("❌ ERROR: GitHub REPO URL cannot be blank.");
    rl.close();
    return;
  }

  rl.close();

  fs.writeFileSync(logFile, `🚀 Operation started at ${new Date().toLocaleString()}\n`);

  try {
    log("⚙️ STEP: Cloning GAS project...");
    if (fs.existsSync(claspProjectRoot)) fs.rmSync(claspProjectRoot, { recursive: true, force: true });
    fs.mkdirSync(claspProjectRoot);

    try {
      execCmd(`clasp clone ${scriptId}`, claspProjectRoot);
    } catch (cloneError) {
      log(`❌ ERROR: Cloning failed. Check Script ID or clasp auth.\n${cloneError.message}`);
      log("❌ Aborting operation.");
      return;
    }

    const claspJson = path.join(claspProjectRoot, ".clasp.json");
    if (fs.existsSync(claspJson)) fs.rmSync(claspJson);

    if (shouldSanitize) {
      log("⚙️ STEP: Sanitizing files...");
      sanitizeDirectory(claspProjectRoot);
    }

    log("📁 Copying files to GitHub directory...");
    if (fs.existsSync(githubRepoPath)) fs.rmSync(githubRepoPath, { recursive: true });
    fs.mkdirSync(githubRepoPath, { recursive: true });
    copyDir(claspProjectRoot, githubRepoPath);

    log("📂 Copied sanitized files:");
    fs.readdirSync(githubRepoPath).forEach(f => log(`   - ${f}`));

    log("⚙️ STEP: Git init or update...");
    if (!fs.existsSync(path.join(githubRoot, ".git"))) {
      execCmd("git init", githubRoot);
      execCmd("git checkout -B main", githubRoot);
      execCmd(`git remote add origin ${repoUrl}`, githubRoot);
    }

    // Abort rebase if needed
    if (!abortRebaseIfNeeded(githubRoot)) {
      log("❌ Rebase cleanup failed. Please resolve manually.");
      return;
    }

    try {
      execCmd("git pull --rebase origin main", githubRoot);
    } catch {
      log("⚠️ WARNING: Pull failed. Proceeding anyway.");
    }

    execCmd("git add -A", githubRoot);
    log("📋 Git status:");
    log(execCmd("git status", githubRoot));

    let commitSuccess = false;
    try {
      execCmd(`git commit -am "GAS export - auto update${shouldSanitize ? ' (sanitized)' : ''}"`, githubRoot);
      commitSuccess = true;
    } catch {
      log("ℹ️ No changes to commit");
    }

    try {
      execCmd("git pull --rebase origin main", githubRoot);
    } catch {
      log("⚠️ WARNING: Merge conflict detected during rebase");
    }

    try {
      execCmd("git push origin main", githubRoot);
      log("✅ Push successful!");
    } catch (err) {
      log("❌ Push failed. Check logs above for Git conflict resolution.");
      log(`❌ Git error: ${err.message}`);
      log("❌ DONE: Project failed to push. Resolve issues and retry.");
      return;
    }

    log("✅ DONE: Project pushed to GitHub!");
  } catch (error) {
    log(`❌ UNEXPECTED ERROR: ${error.message}`);
  }

  log(`\n🕒 Finished at ${new Date().toLocaleString()}`);
})();
