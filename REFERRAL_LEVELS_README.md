# Referral Levels System

A comprehensive referral program with progressive rewards and level achievements.

## Features

### 🏆 Level System
- **Bronze Level**: Starting level (0 referrals, no reward)
- **Silver Level**: 5 referrals → $10 reward
- **Gold Level**: 20 referrals → $50 reward  
- **Diamond Level**: 50 referrals → $300 reward

### 📊 Dashboard Features
- Current level display with progress bar
- Visual level progression with icons and colors
- Pending rewards tracking
- Complete referral history
- Level achievement notifications

### 🎨 UI Components
- Enhanced referral dashboard with level system
- Landing page showcase component
- User profile level badge
- Responsive design with modern UI

## Setup Instructions

### 1. Database Setup
Run the admin setup endpoint to create the necessary tables:

```bash
POST /api/admin/setup-referral-levels
```

This will create:
- `referral_levels` table with default levels
- `user_referral_levels` table to track user progress
- `referral_level_rewards` table for reward history
- Proper indexes and RLS policies

### 2. Pages and Components

#### New Dashboard Page
Access the enhanced referral dashboard at:
```
/referrals-with-levels
```

#### Components Available
1. **ReferralDashboardWithLevels** - Complete dashboard with levels
2. **ReferralLevelsShowcase** - Landing page component
3. **UserReferralLevelBadge** - Profile level display

### 3. API Endpoints

#### Get User Level Data
```bash
GET /api/referral-levels
```

Returns:
- User's current level and progress
- All available levels
- Pending rewards
- Level achievement history

#### Setup Database (Admin Only)
```bash
POST /api/admin/setup-referral-levels
```

## Usage Examples

### Landing Page Integration
```tsx
import { ReferralLevelsShowcase } from "@/components/referral-levels-showcase";

export default function LandingPage() {
  return (
    <div>
      <ReferralLevelsShowcase />
    </div>
  );
}
```

### User Profile Integration
```tsx
import { UserReferralLevelBadge } from "@/components/user-referral-level-badge";

export default function UserProfile() {
  return (
    <div>
      <UserReferralLevelBadge showDetails={true} />
    </div>
  );
}
```

### Dashboard Integration
```tsx
import { ReferralDashboardWithLevels } from "@/components/referral-dashboard-with-levels";

export default function ReferralsPage() {
  return <ReferralDashboardWithLevels />;
}
```

## How It Works

### Level Calculation
1. System counts total referrals for each user
2. Determines current level based on referral count
3. Calculates progress to next level
4. Automatically awards level rewards when milestones are reached

### Reward System
- Rewards are automatically calculated when users reach new levels
- Rewards are tracked in `referral_level_rewards` table
- Status can be 'pending' or 'paid'
- Total rewards are accumulated in user profile

### Real-time Updates
- Level data is fetched fresh on each dashboard visit
- Progress bars show real-time advancement
- New level achievements trigger reward creation

## Database Schema

### referral_levels
```sql
- id (UUID, Primary Key)
- level_name (TEXT, Unique) - 'Bronze', 'Silver', 'Gold', 'Diamond'
- level_order (INTEGER, Unique) - 0, 1, 2, 3
- min_referrals (INTEGER) - Minimum referrals needed
- reward_amount (DECIMAL) - Reward in USD
- level_color (TEXT) - Hex color for UI
- level_icon (TEXT) - Icon name for UI
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

### user_referral_levels
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to auth.users)
- current_level_id (UUID, Foreign Key to referral_levels)
- total_referrals (INTEGER)
- total_level_rewards (DECIMAL)
- last_level_update (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### referral_level_rewards
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to auth.users)
- level_id (UUID, Foreign Key to referral_levels)
- reward_amount (DECIMAL)
- referrals_at_time (INTEGER)
- status (TEXT) - 'pending' or 'paid'
- earned_at (TIMESTAMPTZ)
- paid_at (TIMESTAMPTZ)
```

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only see their own level data
- Admins have full access to all tables
- Public read access to referral_levels table

## Customization

### Adding New Levels
1. Insert new record in `referral_levels` table
2. Set appropriate `level_order`, `min_referrals`, and `reward_amount`
3. Choose `level_color` and `level_icon` for UI display

### Modifying Rewards
Update the `reward_amount` in the `referral_levels` table. Changes will apply to new achievements.

### UI Customization
- Modify colors in level components
- Update icons in `getLevelIcon()` function
- Customize progress bar styles
- Add animations and transitions

## Testing

1. Set up the database using the admin endpoint
2. Create test users with different referral counts
3. Visit `/referrals-with-levels` to see the dashboard
4. Test level progression by adding referrals
5. Verify reward calculations and display

## Troubleshooting

### Common Issues
1. **Tables not found**: Run the setup endpoint first
2. **Permission denied**: Ensure user has proper role
3. **Level not updating**: Check referral count calculation
4. **Rewards not showing**: Verify referral_level_rewards table

### Debug Endpoints
- Check user referrals: `/api/referrals-v2`
- Check level data: `/api/referral-levels`
- Admin dashboard: `/admin` (for database inspection)

## Future Enhancements

- Email notifications for level achievements
- Social sharing of level milestones
- Leaderboard for top referrers
- Seasonal bonus levels
- Custom level badges and certificates
