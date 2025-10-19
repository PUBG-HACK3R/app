# Testing Referral Levels System

## Quick Setup & Test Guide

### 1. Start Development Server
```bash
npm run dev
```

### 2. Setup Database (Admin Required)
Visit: `http://localhost:3000/api/admin/setup-referral-levels`

Or use curl:
```bash
curl -X POST http://localhost:3000/api/admin/setup-referral-levels
```

### 3. Test Pages

#### Landing Page with Referral Levels
- Visit: `http://localhost:3000/`
- Look for the "Referral Rewards Program" section
- Should show Bronze, Silver, Gold, Diamond levels

#### Enhanced Referral Dashboard
- Visit: `http://localhost:3000/referrals`
- Should show current level, progress bar, and level cards
- Test with different referral counts

#### User Profile with Level Badge
- Visit: `http://localhost:3000/settings/modern`
- Should show referral level badge in profile
- Should show detailed level progress card

### 4. Test API Endpoints

#### Check Referral Levels API
```bash
curl http://localhost:3000/api/referral-levels
```

#### Check Original Referrals API
```bash
curl http://localhost:3000/api/referrals-v2
```

### 5. Test Level Progression

To test different levels, you can:
1. Create test users with referrals
2. Manually update referral counts in database
3. Check level calculations and rewards

### 6. Expected Behavior

#### Level Structure:
- **Bronze**: 0 referrals, no reward
- **Silver**: 5 referrals, $10 reward
- **Gold**: 20 referrals, $50 reward  
- **Diamond**: 50 referrals, $300 reward

#### UI Features:
- Progress bars showing advancement
- Level icons with colors
- Pending rewards display
- Real-time level updates

### 7. Troubleshooting

#### Common Issues:
1. **Database tables not found**: Run setup endpoint first
2. **Components not loading**: Check imports and file paths
3. **API errors**: Check console for detailed error messages
4. **Styles not applying**: Ensure Tailwind classes are working

#### Debug Steps:
1. Check browser console for errors
2. Verify API responses in Network tab
3. Check database tables exist
4. Verify user authentication

### 8. Files Modified

#### Pages Updated:
- `/` - Landing page with referral showcase
- `/referrals` - Enhanced dashboard with levels
- `/settings/modern` - User profile with level badge

#### New Components:
- `ReferralDashboardWithLevels` - Main dashboard
- `ReferralLevelsShowcase` - Landing page component  
- `UserReferralLevelBadge` - Profile level display

#### New API:
- `/api/referral-levels` - Level system API
- `/api/admin/setup-referral-levels` - Database setup

### 9. Next Steps

After testing locally:
1. Verify all features work correctly
2. Test responsive design on mobile
3. Check performance with multiple users
4. Deploy to production environment
5. Monitor user engagement with levels

### 10. Production Deployment

When ready for production:
1. Run database setup on production
2. Deploy updated code
3. Test with real users
4. Monitor level achievements
5. Track reward payouts
