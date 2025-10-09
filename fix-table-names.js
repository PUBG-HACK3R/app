#!/usr/bin/env node

/**
 * Script to fix table name mismatches in WeEarn codebase
 * 
 * Old table names -> New table names:
 * - profiles -> user_profiles
 * - balances -> user_balances  
 * - plans -> investment_plans
 * - subscriptions -> user_investments
 * - transactions -> transaction_logs
 * - referrals -> referral_commissions
 */

const fs = require('fs');
const path = require('path');

const TABLE_MAPPINGS = {
  'profiles': 'user_profiles',
  'balances': 'user_balances',
  'plans': 'investment_plans', 
  'subscriptions': 'user_investments',
  'transactions': 'transaction_logs',
  'referrals': 'referral_commissions'
};

function fixTableNamesInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Fix .from("old_table") patterns
    for (const [oldTable, newTable] of Object.entries(TABLE_MAPPINGS)) {
      const pattern = new RegExp(`\\.from\\("${oldTable}"\\)`, 'g');
      if (pattern.test(content)) {
        content = content.replace(pattern, `.from("${newTable}")`);
        modified = true;
        console.log(`Fixed ${oldTable} -> ${newTable} in ${filePath}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findAndFixFiles(dir) {
  const files = fs.readdirSync(dir);
  let totalFixed = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      totalFixed += findAndFixFiles(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (fixTableNamesInFile(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

// Run the fix
const srcDir = path.join(__dirname, 'src');
console.log('Starting table name fixes...');
const fixedCount = findAndFixFiles(srcDir);
console.log(`Fixed ${fixedCount} files`);
