import type { PropsWithChildren } from 'react'

import { ConfigProvider, type ThemeConfig } from 'antd'

export const formilyAntdPrefixCls = 'tap'

export const formilyAntdTheme: ThemeConfig = {
  token: {
    borderRadius: 8,
    controlOutline: 'color-mix(in srgb, var(--ts-border-focus) 20%, transparent)',
    controlOutlineWidth: 3,
    fontFamily: 'inherit',
    colorBgContainer: 'var(--ts-bg-surface)',
    colorBgContainerDisabled: 'var(--ts-input-disabled)',
    colorBgElevated: 'var(--ts-bg-surface)',
    colorBgLayout: 'var(--ts-bg-canvas)',
    colorBgTextActive: 'var(--ts-bg-hover)',
    colorBgTextHover: 'var(--ts-bg-hover)',
    colorBorder: 'transparent',
    colorBorderSecondary: 'var(--ts-border-subtle)',
    colorError: 'var(--ts-state-danger-text)',
    colorErrorBorder: 'var(--ts-state-danger-border)',
    colorErrorBorderHover: 'var(--ts-state-danger-text)',
    colorErrorOutline: 'color-mix(in srgb, var(--ts-state-danger-text) 20%, transparent)',
    colorErrorText: 'var(--ts-state-danger-text)',
    colorFillAlter: 'var(--ts-bg-subtle)',
    colorFillContent: 'var(--ts-bg-subtle)',
    colorFillContentHover: 'var(--ts-bg-hover)',
    colorPrimary: 'var(--ts-brand-primary)',
    colorPrimaryActive: 'var(--ts-brand-pressed)',
    colorPrimaryBg: 'var(--ts-bg-selected)',
    colorPrimaryBgHover: 'var(--ts-bg-hover)',
    colorPrimaryBorder: 'var(--ts-brand-primary)',
    colorPrimaryBorderHover: 'var(--ts-brand-hover)',
    colorPrimaryHover: 'var(--ts-brand-hover)',
    colorPrimaryText: 'var(--ts-brand-primary)',
    colorPrimaryTextActive: 'var(--ts-brand-pressed)',
    colorPrimaryTextHover: 'var(--ts-brand-hover)',
    colorSplit: 'var(--ts-border-subtle)',
    colorText: 'var(--ts-text-primary)',
    colorTextLightSolid: 'var(--ts-text-inverse)',
    colorTextPlaceholder: 'var(--ts-text-placeholder)',
    colorTextSecondary: 'var(--ts-text-secondary)',
    colorTextTertiary: 'var(--ts-text-tertiary)',
    colorWhite: 'var(--ts-text-inverse)',
    controlItemBgActive: 'var(--ts-bg-selected)',
    controlItemBgActiveHover: 'var(--ts-bg-hover)',
    controlItemBgHover: 'var(--ts-bg-hover)',
  },
  components: {
    Input: {
      activeBorderColor: 'var(--ts-border-focus)',
      hoverBorderColor: 'var(--ts-input-border)',
    },
    InputNumber: {
      activeBorderColor: 'var(--ts-border-focus)',
      hoverBorderColor: 'var(--ts-input-border)',
    },
    Select: {
      activeBorderColor: 'var(--ts-border-focus)',
      activeOutlineColor: 'color-mix(in srgb, var(--ts-border-focus) 20%, transparent)',
      hoverBorderColor: 'var(--ts-input-border)',
      optionActiveBg: 'var(--ts-bg-hover)',
      optionSelectedBg: 'var(--ts-bg-selected)',
      optionSelectedColor: 'var(--ts-text-primary)',
    },
  },
}

/** Keeps schema layout on Formily while mapping its compatibility styles to shared UI tokens. */
export function FormilyAntdProvider({ children }: PropsWithChildren) {
  return (
    <ConfigProvider prefixCls={formilyAntdPrefixCls} theme={formilyAntdTheme}>
      {children}
    </ConfigProvider>
  )
}
