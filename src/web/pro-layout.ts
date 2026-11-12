import { theme } from 'antd';
import { workerKitLayout } from './design';
import { useWorkerKitTheme } from './provider';

/** Give ProLayout the same surfaces and foregrounds as WorkerKitProvider. */
export function useWorkerKitProLayout() {
  const { token } = theme.useToken();
  const { dark } = useWorkerKitTheme();
  const selectedColor = dark ? token.colorText : token.colorPrimaryText;
  return {
    siderWidth: workerKitLayout.sidebarWidth,
    collapsedWidth: workerKitLayout.sidebarCollapsedWidth,
    token: {
      bgLayout: token.colorBgLayout,
      header: {
        colorBgHeader: token.colorBgContainer,
        colorBgScrollHeader: token.colorBgContainer,
        colorHeaderTitle: token.colorText,
        heightLayoutHeader: workerKitLayout.headerHeight,
      },
      sider: {
        colorMenuBackground: token.colorBgContainer,
        colorTextMenuTitle: token.colorText,
        colorTextMenu: token.colorTextSecondary,
        colorTextMenuItemHover: token.colorText,
        colorTextMenuActive: selectedColor,
        colorTextMenuSelected: selectedColor,
        colorTextSubMenuSelected: selectedColor,
        colorBgMenuItemHover: token.colorFillQuaternary,
        colorBgMenuItemSelected: token.colorPrimaryBg,
        menuHeight: workerKitLayout.navigationHeight,
      },
    },
  };
}
