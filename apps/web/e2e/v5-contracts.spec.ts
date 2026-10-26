import { test, expect } from '@playwright/test';

test('an unauthenticated invitation opens and accepts without being redirected by dealer API requests',async({page})=>{
  let accepted=false;
  await page.route(url => url.pathname.startsWith('/api/'),async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/auth/me')return route.fulfill({status:accepted?200:401,json:accepted?
      {id:'owner',email:'owner@test.local',role:'DEALER_OWNER',dealerAccessIds:['d1'],mustChangePassword:false}:{error:'Sign in'}});
    if(path==='/api/auth/invites/token')return route.fulfill({json:{email:'owner@test.local',dealershipName:'Test Motors',accessRole:'DEALER_OWNER',accountExists:false,expiresAt:'2099-01-01'}});
    if(path==='/api/auth/invites/token/accept'){expect(route.request().postDataJSON()).toEqual({password:'secure-password-123'});accepted=true;return route.fulfill({json:{dealershipId:'d1'}});}
    if(path==='/api/dealers')return route.fulfill({status:accepted?200:401,json:accepted?{dealers:[{id:'d1',legalName:'Test Motors',businessCategory:'AUTOMOTIVE'}]}:{error:'Sign in'}});
    return route.fulfill({status:503,json:{error:'Not configured in test'}});
  });
  await page.goto('./#/invite/token');
  await expect(page.getByRole('heading',{name:/Set up your login/})).toBeVisible();
  await page.getByLabel('New password',{exact:true}).fill('secure-password-123');
  await page.getByLabel('Confirm new password').fill('secure-password-123');
  await page.getByRole('button',{name:'Create login and continue'}).click();
  await expect(page).toHaveURL(/#\/d1$/);
  expect(accepted).toBe(true);
});

test('a temporary-password session is blocked on the change screen until the save succeeds',async({page})=>{
  let changed=false;
  await page.route(url => url.pathname.startsWith('/api/'),async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/auth/me')return route.fulfill({json:{id:'owner',email:'owner@test.local',role:'DEALER_OWNER',dealerAccessIds:[],mustChangePassword:!changed}});
    if(path==='/api/auth/change-password'){expect(route.request().postDataJSON()).toEqual({currentPassword:'temporary-123',newPassword:'new-password-123'});changed=true;return route.fulfill({json:{ok:true}});}
    if(path==='/api/dealers'){expect(changed).toBe(true);return route.fulfill({json:{dealers:[]}});}
    return route.fulfill({status:503,json:{error:'Not configured in test'}});
  });
  await page.goto('./#/');
  await expect(page.getByLabel('Temporary password')).toBeVisible();
  await page.getByLabel('Temporary password').fill('temporary-123');
  await page.getByLabel('New password',{exact:true}).fill('new-password-123');
  await page.getByLabel('Confirm new password').fill('new-password-123');
  await page.getByRole('button',{name:'Save and continue'}).click();
  await expect(page.getByLabel('Temporary password')).toHaveCount(0);
  expect(changed).toBe(true);
});

test('internal support can open the scoped directory',async({page})=>{
  await page.route(url => url.pathname.startsWith('/api/'),async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/auth/me')return route.fulfill({json:{id:'support',email:'support@test.local',role:'INTERNAL_SUPPORT',dealerAccessIds:['d1'],mustChangePassword:false}});
    const people={people:[{accountId:'owner',email:'owner@test.local',role:'DEALER_OWNER',accessRole:'DEALER_OWNER',isActive:true,mustChangePassword:false}],invitations:[]};
    if(path==='/api/admin/dealerships/d1')return route.fulfill({json:{id:'d1',legalName:'Assigned Motors',businessCategory:'AUTOMOTIVE',lifecycleStatus:'SETTING_UP',createdAt:'2026-01-01',autopilotPreference:'OFF',
      inventory:{vehicleCount:1,ready:1,needsAttention:0,sold:0},channels:{accountCount:1,items:[{slug:'consumer-marketplace',name:'Auto Marketplace',status:'ACTIVE'}]},
      onboarding:{steps:[{stepKey:'ACCESS',status:'IN_PROGRESS',ownerKind:'OUR_TEAM',incompleteReason:'Owner must sign in'}]},people}});
    if(path==='/api/dealers/d1/people')return route.fulfill({json:people});
    if(path==='/api/admin/dealerships')return route.fulfill({json:{dealerships:[{id:'d1',legalName:'Assigned Motors',businessCategory:'AUTOMOTIVE',lifecycleStatus:'SETTING_UP',createdAt:'2026-01-01',autopilotPreference:'OFF',internalOwner:{id:'support',email:'support@test.local'},nextStep:{stepKey:'ACCESS',ownerKind:'OUR_TEAM'}}]}});
    if(path==='/api/dealers')return route.fulfill({json:{dealers:[{id:'d1',legalName:'Assigned Motors',businessCategory:'AUTOMOTIVE'}]}});
    return route.fulfill({status:503,json:{error:'Not configured in test'}});
  });
  await page.goto('./#/admin/dealers');
  await expect(page.getByText('Assigned Motors',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Add dealership'})).toBeVisible();
  await expect(page).toHaveURL(/#\/admin\/dealers$/);
  await page.getByRole('link',{name:'Assigned Motors',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Assigned Motors',exact:true})).toBeVisible();
  await expect(page.getByText('1 of 1 connected',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/^People/}).click();
  await expect(page.getByText('owner@test.local',{exact:true})).toBeVisible();

});
