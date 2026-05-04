const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 GitHub Repository Update Script');
console.log('==================================\n');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'registration-backend', 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: Please run this script from the root directory of your project');
  console.log('   The directory should contain both registration-backend and registeration-frontend folders');
  process.exit(1);
}

console.log('✅ Found project structure');

// Check if git is initialized
let gitInitialized = false;
try {
  execSync('git status', { stdio: 'pipe' });
  gitInitialized = true;
  console.log('✅ Git repository already initialized');
} catch {
  console.log('📝 Initializing git repository...');
  execSync('git init', { stdio: 'inherit' });
  gitInitialized = true;
  console.log('✅ Git repository initialized');
}

// Check if remote exists
let remoteExists = false;
try {
  const remotes = execSync('git remote', { encoding: 'utf8' });
  if (remotes.includes('origin')) {
    remoteExists = true;
    console.log('✅ Git remote "origin" already exists');
  }
} catch {
  // No remotes or git error
}

if (!remoteExists) {
  console.log('\n📝 Please add your GitHub repository as remote:');
  console.log('   git remote add origin https://github.com/Dharunsuriya-T/fullstack-slot-booking.git');
  console.log('   Then run this script again.');
  process.exit(0);
}

// Stage all files
console.log('\n📝 Staging all files...');
execSync('git add .', { stdio: 'inherit' });
console.log('✅ Files staged');

// Check what's staged
console.log('\n📋 Files to be committed:');
execSync('git status --porcelain', { stdio: 'inherit' });

// Create commit message
const commitMessage = `feat: Major update - React Router, auth fixes, deployment-ready

✨ New Features:
- React Router with structured URLs (/form/:formId, /admin/*)
- Email verification system with SendGrid
- Password reset flow with token-based security
- Google OAuth integration with domain restriction

🔧 Improvements:
- Fixed local authentication system
- Replaced alert popups with inline error banners
- Added React lazy loading for performance
- Improved logout button UX with hover effects
- Browser back/forward navigation now works

🚀 Deployment Ready:
- Removed hardcoded localhost URLs
- Environment variable enforcement
- Added .env.example files
- Created render.yaml and vercel.json configs
- Comprehensive deployment guide included

📚 Documentation:
- Complete deployment guide for Render + Vercel
- Environment variable documentation
- Security and scaling checklists

🔒 Security:
- Enhanced CORS configuration
- Rate limiting and security headers
- Proper SSL database connections
- Token-based email verification`;

console.log('\n📝 Creating commit...');
execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
console.log('✅ Commit created');

console.log('\n🎉 Ready to push to GitHub!');
console.log('\n📋 Next steps:');
console.log('1. Review the commit: git log --oneline -1');
console.log('2. Push to GitHub: git push -f origin main');
console.log('3. Or create a branch: git checkout -b feature/major-update-v2');
console.log('4. Then push: git push origin feature/major-update-v2');
console.log('\n⚠️  Note: git push -f will overwrite your remote repository history');
console.log('   Use the branch method if you want to preserve existing history');

console.log('\n📚 Don\'t forget to:');
console.log('- Set up environment variables after deployment');
console.log('- Run database migrations');
console.log('- Update Google OAuth callback URL');
console.log('- Follow the DEPLOYMENT.md guide for production setup');
