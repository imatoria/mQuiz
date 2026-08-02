import { Page } from '@playwright/test';
import { TEST_ACCOUNTS } from '../config/test-accounts';

export async function loginAs(page: Page, userType: 'admin' | 'parent' | 'student') {
  const account = TEST_ACCOUNTS[userType];
  const userId = userType === 'admin' 
    ? '4c41ae04-14ba-40e6-8b97-fce8e4045790' 
    : userType === 'parent' 
      ? '32383bef-bf66-4b8e-81e8-69d1bea635bd' 
      : '94297385-ba2f-42f2-a69c-73a8212889dd';

  const userRole = userType === 'admin' ? 'admin' : userType === 'parent' ? 'parent' : 'child';

  await page.goto('/auth');
  await page.evaluate(({ session }) => {
    localStorage.setItem('mquiz_auth_session', JSON.stringify(session));
  }, {
    session: {
      id: userId,
      email: account.email,
      role: userRole,
      fullName: account.fullName
    }
  });

  const rolePath = userType === 'admin' ? '/admin/approvals' : userType === 'parent' ? '/parent/children' : '/student/tests';
  await page.goto(rolePath);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}
