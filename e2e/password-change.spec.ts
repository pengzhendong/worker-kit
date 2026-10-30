import {test,expect,openDashboard} from './fixtures';
test('change password validates confirmation, retains errors, and clears fields when closed',async({page})=>{
 await page.route('**/MediaExamples.tsx',async route=>{
  const response=await route.fetch(),body=await response.text();
  const react=body.match(/from "([^"]*\/react\.js[^"]*)"/)![1];
  const web=body.match(/import \{ PageToolbar \} from "([^"]+)"/)![1];
  await route.fulfill({response,body:`import React from ${JSON.stringify(react)};const {useState}=React;import {ChangePasswordModal} from ${JSON.stringify(web)};
  export function MediaExamples(){const[open,setOpen]=useState(false),[done,setDone]=useState(false);return React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>setOpen(true)},'修改登录密码'),done&&React.createElement('p',null,'已修改，请重新登录'),React.createElement(ChangePasswordModal,{open,onCancel:()=>setOpen(false),onChanged:()=>{setDone(true);setOpen(false)},onChange:async values=>{if(values.currentPassword!=='correct-current')throw new Error('旧密码不正确')}}))}`});
 });
 await openDashboard(page,'components');await page.getByRole('tab',{name:'媒体预览',exact:true}).click();await page.getByRole('button',{name:'修改登录密码'}).click();
 const modal=page.getByRole('dialog',{name:'修改密码'});
 await modal.getByLabel('旧密码',{exact:true}).fill('wrong-current');await modal.getByLabel('新密码',{exact:true}).fill('a-new-valid-password');await modal.getByLabel('确认新密码',{exact:true}).fill('mismatch');await modal.getByRole('button',{name:'确认修改'}).click();await expect(modal.getByText('两次输入的新密码不一致')).toBeVisible();
 await modal.getByLabel('确认新密码',{exact:true}).fill('a-new-valid-password');await modal.getByRole('button',{name:'确认修改'}).click();await expect(modal.getByText('旧密码不正确')).toBeVisible();
 await modal.getByLabel('旧密码',{exact:true}).fill('correct-current');await modal.getByRole('button',{name:'确认修改'}).click();await expect(modal).toBeHidden();await expect(page.getByText('已修改，请重新登录')).toBeVisible();
 await page.getByRole('button',{name:'修改登录密码'}).click();await expect(modal.getByLabel('旧密码',{exact:true})).toHaveValue('');await expect(modal.getByLabel('新密码',{exact:true})).toHaveValue('');await modal.getByRole('button',{name:/取.*消/}).click();
});
