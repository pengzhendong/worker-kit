import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useWorkerKitTheme } from './provider';

export function WorkerKitThemeToggle() {
  const { dark, toggle } = useWorkerKitTheme();
  return <Button type="text" icon={dark ? <SunOutlined /> : <MoonOutlined />}
    aria-label={dark ? '浅色模式' : '深色模式'} onClick={toggle} />;
}
