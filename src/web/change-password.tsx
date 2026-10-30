import {useEffect, useRef, useState} from 'react';
import {Alert, Form, Input, Modal} from 'antd';

export function ChangePasswordModal({open, onCancel, onChange, onChanged, minimumLength = 12}: {
  open: boolean; onCancel: () => void;
  onChange: (values: {currentPassword: string; newPassword: string}, signal: AbortSignal) => Promise<void>;
  onChanged: () => void; minimumLength?: number;
}) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {if (!open) {form.resetFields();setError('');}}, [open, form]);
  useEffect(() => () => pending.current?.abort(), []);
  return <Modal open={open} title="修改密码" okText="确认修改" cancelText="取消" confirmLoading={busy}
    closable={!busy} maskClosable={!busy} cancelButtonProps={{disabled:busy}} onCancel={onCancel}
    onOk={() => form.submit()} destroyOnHidden afterClose={() => form.resetFields()}>
    {error && <Alert type="error" showIcon title={error} style={{marginBottom:16}}/>}
    <Form form={form} layout="vertical" requiredMark={false} preserve={false} onFinish={async values => {
      if (pending.current) return;
      const controller = new AbortController();pending.current = controller;setBusy(true);setError('');
      try {await onChange({currentPassword:values.currentPassword,newPassword:values.newPassword},controller.signal);if (!controller.signal.aborted) {form.resetFields();onChanged();}}
      catch (failure) {if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : '修改失败，请重试');}
      finally {pending.current = null;if (!controller.signal.aborted) setBusy(false);}
    }}>
      <Form.Item label="旧密码" name="currentPassword" rules={[{required:true,message:'请输入旧密码'}]}><Input.Password autoComplete="current-password" maxLength={1024}/></Form.Item>
      <Form.Item label="新密码" name="newPassword" rules={[{required:true,message:'请输入新密码'},{min:minimumLength,message:`新密码至少 ${minimumLength} 位`}]}><Input.Password autoComplete="new-password" maxLength={1024}/></Form.Item>
      <Form.Item label="确认新密码" name="confirmation" dependencies={['newPassword']} rules={[{required:true,message:'请再次输入新密码'},({getFieldValue}) => ({validator(_,value) {return !value || value === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('两次输入的新密码不一致'));}})]}><Input.Password autoComplete="new-password" maxLength={1024}/></Form.Item>
    </Form>
  </Modal>;
}
