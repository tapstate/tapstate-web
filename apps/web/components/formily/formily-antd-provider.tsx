import type { PropsWithChildren } from 'react'

import { ConfigProvider, type ThemeConfig } from 'antd'

export const formilyAntdPrefixCls = 'tap-formily'

export const formilyAntdTheme: ThemeConfig = {
  token: {
    borderRadius: 10,
    // controlHeight: 32,
    controlOutline: 'color-mix(in oklch, var(--ring) 20%, transparent)',
    controlOutlineWidth: 3,
    fontFamily: 'var(--font-sans)',
    // fontSize: 13,
    colorBgContainer: 'var(--background)',
    colorBgContainerDisabled: 'var(--muted)',
    colorBgElevated: 'var(--popover)',
    colorBgLayout: 'var(--background)',
    colorBgTextActive: 'var(--accent)',
    colorBgTextHover: 'var(--accent)',
    colorBorder: 'var(--border)',
    colorBorderSecondary: 'var(--border)',
    colorError: 'var(--destructive)',
    colorErrorBorder: 'var(--destructive)',
    colorErrorBorderHover: 'var(--destructive)',
    colorErrorOutline: 'color-mix(in oklch, var(--destructive) 20%, transparent)',
    colorErrorText: 'var(--destructive)',
    colorFillAlter: 'var(--muted)',
    colorFillContent: 'var(--muted)',
    colorFillContentHover: 'var(--accent)',
    colorPrimary: 'var(--primary)',
    colorPrimaryActive: 'var(--primary)',
    colorPrimaryBg: 'var(--accent)',
    colorPrimaryBgHover: 'var(--accent)',
    colorPrimaryBorder: 'var(--primary)',
    colorPrimaryBorderHover: 'var(--primary)',
    colorPrimaryHover: 'var(--primary)',
    colorPrimaryText: 'var(--primary)',
    colorPrimaryTextActive: 'var(--primary)',
    colorPrimaryTextHover: 'var(--primary)',
    colorSplit: 'var(--border)',
    colorText: 'var(--foreground)',
    colorTextLightSolid: 'var(--primary-foreground)',
    colorTextPlaceholder: 'var(--muted-foreground)',
    colorTextSecondary: 'var(--muted-foreground)',
    colorTextTertiary: 'var(--muted-foreground)',
    colorWhite: 'var(--primary-foreground)',
    controlItemBgActive: 'var(--accent)',
    controlItemBgActiveHover: 'var(--accent)',
    controlItemBgHover: 'var(--accent)',
  },
  components: {
    Input: {
      activeBorderColor: 'var(--ring)',
      hoverBorderColor: 'var(--input)',
    },
    InputNumber: {
      activeBorderColor: 'var(--ring)',
      hoverBorderColor: 'var(--input)',
    },
    Select: {
      activeBorderColor: 'var(--ring)',
      activeOutlineColor: 'color-mix(in oklch, var(--ring) 20%, transparent)',
      hoverBorderColor: 'var(--input)',
      optionActiveBg: 'var(--accent)',
      optionSelectedBg: 'var(--accent)',
      optionSelectedColor: 'var(--accent-foreground)',
    },
  },
}

/**
 * Keeps AntD v6 constrained to schema-driven Formily fields while sharing the
 * application's shadcn semantic tokens with every Formily renderer.
 */
export function FormilyAntdProvider({ children }: PropsWithChildren) {
  return (
    <ConfigProvider prefixCls={formilyAntdPrefixCls} theme={formilyAntdTheme}>
      {children}
    </ConfigProvider>
  )
}
